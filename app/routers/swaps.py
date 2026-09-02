from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.labels import normalize_catalog, normalize_city
from app.models import CollectionItem, Swap, User
from app.schemas import SwapIn, SwapOut, SwapPiece, UserPublic

router = APIRouter(prefix="/swaps", tags=["swaps"])


def _item_key(item: CollectionItem) -> str:
    code = item.catalog_no or (item.stamp.catalog_no if item.stamp else "")
    return normalize_catalog(code)


def _piece(item: CollectionItem | None, stamp=None, name: str = "", catalog_no: str = "") -> SwapPiece:
    if item:
        stamp = item.stamp
        return SwapPiece(
            id=item.id,
            name=item.name or (stamp.name if stamp else ""),
            catalog_no=item.catalog_no or (stamp.catalog_no if stamp else ""),
            photo_path=item.photo_path,
            note=item.note,
            stamp_id=item.stamp_id,
        )
    return SwapPiece(id=0, name=name, catalog_no=catalog_no, photo_path="", note="", stamp_id=stamp.id if stamp else None)


def serialize_swap(swap: Swap, me: User) -> SwapOut:
    other = swap.partner if me.id == swap.proposer_id else swap.proposer
    show_contact = swap.status in {"accepted", "completed"}
    offer = _piece(swap.offer_item, swap.offer_stamp, swap.offer_stamp.name if swap.offer_stamp else "")
    request = _piece(
        swap.request_item,
        swap.request_stamp,
        swap.request_stamp.name if swap.request_stamp else "",
    )
    if swap.offer_stamp and not offer.name:
        offer = _piece(None, swap.offer_stamp, swap.offer_stamp.name, swap.offer_stamp.catalog_no)
    if swap.request_stamp and not request.name:
        request = _piece(None, swap.request_stamp, swap.request_stamp.name, swap.request_stamp.catalog_no)
    return SwapOut(
        id=swap.id,
        status=swap.status,
        message=swap.message,
        created_at=swap.created_at,
        proposer=UserPublic.model_validate(swap.proposer),
        partner=UserPublic.model_validate(swap.partner),
        offer=offer,
        request=request,
        same_city=bool(normalize_city(swap.proposer.city) and normalize_city(swap.proposer.city) == normalize_city(swap.partner.city)),
        their_email=other.email if show_contact else None,
        their_phone=other.phone if show_contact else None,
    )


def _swap_options():
    return (
        joinedload(Swap.proposer),
        joinedload(Swap.partner),
        joinedload(Swap.offer_stamp),
        joinedload(Swap.request_stamp),
        joinedload(Swap.offer_item).joinedload(CollectionItem.stamp),
        joinedload(Swap.request_item).joinedload(CollectionItem.stamp),
    )


@router.get("/matches")
def matches(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict[str, Any]]:
    mine = (
        db.query(CollectionItem)
        .options(joinedload(CollectionItem.stamp))
        .filter(CollectionItem.user_id == user.id)
        .all()
    )
    my_swap = [item for item in mine if item.status == "swap" and _item_key(item)]
    my_want = {_item_key(item) for item in mine if item.status == "want" and _item_key(item)}
    others = db.query(User).filter(User.id != user.id, User.banned.is_(False)).all()
    my_city = normalize_city(user.city)
    results = []
    for other in others:
        theirs = (
            db.query(CollectionItem)
            .options(joinedload(CollectionItem.stamp))
            .filter(CollectionItem.user_id == other.id)
            .all()
        )
        their_swap = [item for item in theirs if item.status == "swap" and _item_key(item)]
        their_want = {_item_key(item) for item in theirs if item.status == "want" and _item_key(item)}
        you_offer = [item for item in my_swap if _item_key(item) in their_want]
        they_offer = [item for item in their_swap if _item_key(item) in my_want]
        if not you_offer and not they_offer:
            continue
        same_city = bool(my_city and my_city == normalize_city(other.city))
        results.append(
            {
                "user": UserPublic.model_validate(other).model_dump(mode="json"),
                "mutual": bool(you_offer and they_offer),
                "same_city": same_city,
                "you_offer": [_piece(item).model_dump() for item in you_offer],
                "they_offer": [_piece(item).model_dump() for item in they_offer],
            }
        )
    results.sort(key=lambda row: (not row["same_city"], not row["mutual"], row["user"]["username"]))
    return results


@router.get("", response_model=list[SwapOut])
def my_swaps(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    swaps = (
        db.query(Swap)
        .options(*_swap_options())
        .filter((Swap.proposer_id == user.id) | (Swap.partner_id == user.id))
        .order_by(Swap.created_at.desc())
        .all()
    )
    return [serialize_swap(swap, user) for swap in swaps]


@router.post("", response_model=SwapOut)
def create_swap(
    payload: SwapIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if payload.partner_id == user.id:
        raise HTTPException(status_code=400, detail="不能和自己交换")
    partner = db.get(User, payload.partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="没有这位邮友")
    offer = (
        db.query(CollectionItem)
        .filter(CollectionItem.id == payload.offer_item_id, CollectionItem.user_id == user.id)
        .first()
    )
    request = (
        db.query(CollectionItem)
        .filter(CollectionItem.id == payload.request_item_id, CollectionItem.user_id == partner.id)
        .first()
    )
    if not offer or offer.status != "swap":
        raise HTTPException(status_code=400, detail="请选择你邮册里标成可换的实拍票")
    if not request or request.status != "swap":
        raise HTTPException(status_code=400, detail="对方这枚还没有标成可换")
    swap = Swap(
        proposer_id=user.id,
        partner_id=payload.partner_id,
        offer_item_id=offer.id,
        request_item_id=request.id,
        offer_stamp_id=offer.stamp_id,
        request_stamp_id=request.stamp_id,
        message=payload.message.strip(),
    )
    db.add(swap)
    db.commit()
    loaded = db.query(Swap).options(*_swap_options()).filter(Swap.id == swap.id).one()
    return serialize_swap(loaded, user)


@router.post("/{swap_id}/{action}", response_model=SwapOut)
def decide_swap(
    swap_id: int,
    action: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if action not in {"accept", "decline", "complete"}:
        raise HTTPException(status_code=400, detail="未知操作")
    swap = db.query(Swap).options(*_swap_options()).filter(Swap.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="交换不存在")
    if action in {"accept", "decline"} and swap.partner_id != user.id:
        raise HTTPException(status_code=403, detail="只有对方可以回应")
    if action == "complete" and user.id not in {swap.proposer_id, swap.partner_id}:
        raise HTTPException(status_code=403, detail="这不是你的交换")
    mapping = {"accept": "accepted", "decline": "declined", "complete": "completed"}
    swap.status = mapping[action]
    db.commit()
    loaded = db.query(Swap).options(*_swap_options()).filter(Swap.id == swap_id).one()
    return serialize_swap(loaded, user)
