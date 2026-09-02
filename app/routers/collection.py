from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import CollectionItem, Stamp, User
from app.schemas import CollectionOut
from app.uploads import delete_upload, save_collection_photo

router = APIRouter(tags=["collection"])

OWNED = {"own", "swap"}


def _item_out(item: CollectionItem) -> CollectionOut:
    return CollectionOut(
        id=item.id,
        status=item.status,
        note=item.note,
        photo_path=item.photo_path,
        stamp=item.stamp,
    )


def _reload(db: Session, item_id: int) -> CollectionItem:
    return (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.id == item_id)
        .one()
    )


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
    stamp_id: Annotated[int, Form()],
    status: Annotated[str, Form()],
    note: Annotated[str, Form()] = "",
    photo: Annotated[UploadFile | None, File()] = None,
):
    if status not in {"own", "want", "swap"}:
        raise HTTPException(status_code=400, detail="状态不对")
    if not db.get(Stamp, stamp_id):
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    item = (
        db.query(CollectionItem)
        .filter(CollectionItem.user_id == user.id, CollectionItem.stamp_id == stamp_id)
        .first()
    )
    has_file = bool(photo and photo.filename)
    has_photo = bool(item and item.photo_path)
    if status in OWNED and not has_photo and not has_file:
        raise HTTPException(status_code=400, detail="在册和可换必须上传自己拍的实物图")
    if item:
        item.status = status
        item.note = note.strip()
        if has_file:
            old = item.photo_path
            item.photo_path = save_collection_photo(user.id, photo)
            if old:
                delete_upload(old)
    else:
        item = CollectionItem(
            user_id=user.id,
            stamp_id=stamp_id,
            status=status,
            note=note.strip(),
            photo_path=save_collection_photo(user.id, photo) if has_file else "",
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    return _item_out(_reload(db, item.id))


@router.delete("/me/collection/{stamp_id}")
def remove_collection(
    stamp_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    item = (
        db.query(CollectionItem)
        .filter(CollectionItem.user_id == user.id, CollectionItem.stamp_id == stamp_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="邮册里没有这枚")
    delete_upload(item.photo_path)
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
