from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.db import get_db
from app.models import CollectionItem, Stamp, Swap, User
from app.schemas import StampOut, SwapIn, SwapOut, UserPublic

router = APIRouter(prefix="/swaps", tags=["swaps"])


def _ids(items: list[CollectionItem], status: str) -> set[int]:
    return {item.stamp_id for item in items if item.status == status}


def serialize_swap(swap: Swap) -> SwapOut:
    return SwapOut(
        id=swap.id,
        status=swap.status,
        message=swap.message,
        created_at=swap.created_at,
        proposer=UserPublic.model_validate(swap.proposer),
        partner=UserPublic.model_validate(swap.partner),
        offer_stamp=StampOut.model_validate(swap.offer_stamp),
        request_stamp=StampOut.model_validate(swap.request_stamp),
    )


@router.get("/matches")
def matches(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict[str, Any]]:
    mine = db.query(CollectionItem).filter(CollectionItem.user_id == user.id).all()
    my_swap, my_want = _ids(mine, "swap"), _ids(mine, "want")
    others = db.query(User).filter(User.id != user.id).all()
    stamp_map = {stamp.id: stamp for stamp in db.query(Stamp).all()}
    results = []
    for other in others:
        theirs = db.query(CollectionItem).filter(CollectionItem.user_id == other.id).all()
        their_swap, their_want = _ids(theirs, "swap"), _ids(theirs, "want")
        you_offer = sorted(my_swap & their_want)
        they_offer = sorted(their_swap & my_want)
        if not you_offer and not they_offer:
            continue
        results.append(
            {
                "user": UserPublic.model_validate(other).model_dump(mode="json"),
                "mutual": bool(you_offer and they_offer),
                "you_offer": [StampOut.model_validate(stamp_map[i]).model_dump(mode="json") for i in you_offer],
                "they_offer": [StampOut.model_validate(stamp_map[i]).model_dump(mode="json") for i in they_offer],
            }
        )
    results.sort(key=lambda row: (not row["mutual"], row["user"]["username"]))
    return results


@router.get("", response_model=list[SwapOut])
def my_swaps(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    swaps = (
        db.query(Swap)
        .options(
            joinedload(Swap.proposer),
            joinedload(Swap.partner),
            joinedload(Swap.offer_stamp),
            joinedload(Swap.request_stamp),
        )
        .filter((Swap.proposer_id == user.id) | (Swap.partner_id == user.id))
        .order_by(Swap.created_at.desc())
        .all()
    )
    return [serialize_swap(swap) for swap in swaps]


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
    if not db.get(Stamp, payload.offer_stamp_id) or not db.get(Stamp, payload.request_stamp_id):
        raise HTTPException(status_code=404, detail="邮票不存在")
    swap = Swap(
        proposer_id=user.id,
        partner_id=payload.partner_id,
        offer_stamp_id=payload.offer_stamp_id,
        request_stamp_id=payload.request_stamp_id,
        message=payload.message.strip(),
    )
    db.add(swap)
    db.commit()
    swap = (
        db.query(Swap)
        .options(
            joinedload(Swap.proposer),
            joinedload(Swap.partner),
            joinedload(Swap.offer_stamp),
            joinedload(Swap.request_stamp),
        )
        .filter(Swap.id == swap.id)
        .one()
    )
    return serialize_swap(swap)


@router.post("/{swap_id}/{action}", response_model=SwapOut)
def decide_swap(
    swap_id: int,
    action: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if action not in {"accept", "decline", "complete"}:
        raise HTTPException(status_code=400, detail="未知操作")
    swap = (
        db.query(Swap)
        .options(
            joinedload(Swap.proposer),
            joinedload(Swap.partner),
            joinedload(Swap.offer_stamp),
            joinedload(Swap.request_stamp),
        )
        .filter(Swap.id == swap_id)
        .first()
    )
    if not swap:
        raise HTTPException(status_code=404, detail="交换不存在")
    if action in {"accept", "decline"} and swap.partner_id != user.id:
        raise HTTPException(status_code=403, detail="只有对方可以回应")
    if action == "complete" and user.id not in {swap.proposer_id, swap.partner_id}:
        raise HTTPException(status_code=403, detail="这不是你的交换")
    mapping = {"accept": "accepted", "decline": "declined", "complete": "completed"}
    swap.status = mapping[action]
    db.commit()
    db.refresh(swap)
    return serialize_swap(swap)
