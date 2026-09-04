from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.labels import normalize_catalog
from app.models import CollectionItem, Stamp, User
from app.schemas import CollectionOut
from app.uploads import delete_upload, save_collection_photo

router = APIRouter(tags=["collection"])

OWNED = {"own", "swap"}


def _item_out(item: CollectionItem) -> CollectionOut:
    stamp = item.stamp
    return CollectionOut(
        id=item.id,
        status=item.status,
        note=item.note,
        photo_path=item.photo_path,
        name=item.name or (stamp.name if stamp else ""),
        catalog_no=item.catalog_no or (stamp.catalog_no if stamp else ""),
        stamp_id=item.stamp_id,
        stamp=stamp,
    )


def _reload(db: Session, item_id: int) -> CollectionItem:
    return (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.id == item_id)
        .one()
    )


def _parse_stamp_id(raw: str) -> int | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="邮票编号不对") from exc


@router.get("/me/collection", response_model=list[CollectionOut])
def my_collection(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: str = "",
):
    query = (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.user_id == user.id)
    )
    if status:
        query = query.filter(CollectionItem.status == status)
    return [_item_out(item) for item in query.all()]


@router.post("/me/collection", response_model=CollectionOut)
def upsert_collection(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status: Annotated[str, Form()],
    stamp_id: Annotated[str, Form()] = "",
    name: Annotated[str, Form()] = "",
    catalog_no: Annotated[str, Form()] = "",
    note: Annotated[str, Form()] = "",
    photo: Annotated[UploadFile | None, File()] = None,
):
    if status not in {"own", "want", "swap"}:
        raise HTTPException(status_code=400, detail="状态不对")
    parsed_stamp_id = _parse_stamp_id(stamp_id)
    stamp = db.get(Stamp, parsed_stamp_id) if parsed_stamp_id else None
    if parsed_stamp_id and not stamp:
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    title = name.strip() or (stamp.name if stamp else "")
    code = catalog_no.strip() or (stamp.catalog_no if stamp else "")
    if not title:
        raise HTTPException(status_code=400, detail="请填写票名")
    if not code:
        raise HTTPException(status_code=400, detail="请填写志号，方便同好按号来换")
    item = None
    if parsed_stamp_id:
        item = (
            db.query(CollectionItem)
            .filter(CollectionItem.user_id == user.id, CollectionItem.stamp_id == parsed_stamp_id)
            .first()
        )
    if not item:
        key = normalize_catalog(code)
        candidates = db.query(CollectionItem).filter(CollectionItem.user_id == user.id).all()
        item = next((row for row in candidates if normalize_catalog(row.catalog_no) == key), None)
    has_file = bool(photo and photo.filename)
    has_photo = bool(item and item.photo_path)
    if status in OWNED and not has_photo and not has_file:
        raise HTTPException(status_code=400, detail="在册和可换必须上传自己拍的实物图")
    if item:
        item.status = status
        item.note = note.strip()
        item.name = title
        item.catalog_no = code
        if parsed_stamp_id:
            item.stamp_id = parsed_stamp_id
        if has_file:
            old = item.photo_path
            item.photo_path = save_collection_photo(user.id, photo)
            if old:
                delete_upload(old)
    else:
        item = CollectionItem(
            user_id=user.id,
            stamp_id=parsed_stamp_id,
            name=title,
            catalog_no=code,
            status=status,
            note=note.strip(),
            photo_path=save_collection_photo(user.id, photo) if has_file else "",
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    return _item_out(_reload(db, item.id))


@router.delete("/me/collection/{item_id}")
def remove_collection(
    item_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    item = (
        db.query(CollectionItem)
        .filter(CollectionItem.id == item_id, CollectionItem.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="邮册里没有这枚")
    delete_upload(item.photo_path)
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.delete("/me/want/delete")
def remove_want(
    item_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    item = (
        db.query(CollectionItem)
        .filter(
            CollectionItem.id == item_id,
            CollectionItem.user_id == user.id,
            CollectionItem.status == "want",
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="缺品清单里没有这枚")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/users/{username}/collection", response_model=list[CollectionOut])
def user_collection(username: str, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="没有这位邮友")
    items = (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.user_id == user.id)
        .all()
    )
    return [_item_out(item) for item in items]
