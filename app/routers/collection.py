from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import CollectionItem, Stamp, User
from app.schemas import CollectionIn, CollectionOut

router = APIRouter(tags=["collection"])


def _item_out(item: CollectionItem) -> CollectionOut:
    return CollectionOut(id=item.id, status=item.status, note=item.note, stamp=item.stamp)


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
    payload: CollectionIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not db.get(Stamp, payload.stamp_id):
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    item = (
        db.query(CollectionItem)
        .filter(CollectionItem.user_id == user.id, CollectionItem.stamp_id == payload.stamp_id)
        .first()
    )
    if item:
        item.status = payload.status
        item.note = payload.note
    else:
        item = CollectionItem(
            user_id=user.id,
            stamp_id=payload.stamp_id,
            status=payload.status,
            note=payload.note,
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    item = (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.id == item.id)
        .one()
    )
    return _item_out(item)


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
