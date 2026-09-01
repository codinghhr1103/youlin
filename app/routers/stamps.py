from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Stamp
from app.schemas import StampOut

router = APIRouter(prefix="/stamps", tags=["stamps"])


@router.get("", response_model=list[StampOut])
def list_stamps(
    db: Annotated[Session, Depends(get_db)],
    q: str = "",
    theme: str = "",
):
    query = db.query(Stamp)
    if theme:
        query = query.filter(Stamp.theme == theme)
    if q:
        like = f"%{q}%"
        query = query.filter(
            Stamp.name.like(like)
            | Stamp.catalog_no.like(like)
            | Stamp.theme.like(like)
            | Stamp.description.like(like)
        )
    return query.order_by(Stamp.year.asc(), Stamp.catalog_no.asc()).all()


@router.get("/themes", response_model=list[str])
def list_themes(db: Annotated[Session, Depends(get_db)]):
    rows = db.query(Stamp.theme).distinct().order_by(Stamp.theme.asc()).all()
    return [row[0] for row in rows]


@router.get("/{stamp_id}", response_model=StampOut)
def get_stamp(stamp_id: int, db: Annotated[Session, Depends(get_db)]):
    stamp = db.get(Stamp, stamp_id)
    if not stamp:
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    return stamp
