from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_admin_user
from app.db import get_db
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    _: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(User).order_by(User.created_at.asc()).all()


@router.post("/users/{user_id}/ban", response_model=UserOut)
def ban_user(
    user_id: int,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="没有这位用户")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="不能停用当前管理员账号")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="不能停用其他管理员")
    user.banned = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/unban", response_model=UserOut)
def unban_user(
    user_id: int,
    _: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="没有这位用户")
    user.banned = False
    db.commit()
    db.refresh(user)
    return user
