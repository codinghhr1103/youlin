from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import UserPublic
from app.uploads import UPLOAD_DIR

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserPublic])
def list_users(db: Annotated[Session, Depends(get_db)]):
    return db.query(User).order_by(User.created_at.asc()).all()


@router.get("/{username}", response_model=UserPublic)
def get_user(username: str, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="没有这位邮友")
    upload_dir = UPLOAD_DIR / "collection" / str(user.id)
    disk_size = sum(
        path.stat().st_size
        for path in upload_dir.rglob("*")
        if path.is_file()
    ) if upload_dir.is_dir() else 0
    return UserPublic.model_validate(user).model_copy(update={"disk_size": disk_size})
