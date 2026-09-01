import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import create_token, get_current_user, hash_password, verify_password
from app.db import get_db
from app.models import User
from app.schemas import LoginIn, ProfileUpdate, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{1,19}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def normalize_contact(contact_type: str, value: str) -> str:
    if contact_type == "email":
        email = value.strip().lower()
        if not EMAIL_RE.match(email):
            raise HTTPException(status_code=400, detail="请填写有效邮箱")
        return email
    phone = re.sub(r"\s|-", "", value.strip())
    if not PHONE_RE.match(phone):
        raise HTTPException(status_code=400, detail="请填写有效的中国大陆手机号")
    return phone


def find_user(db: Session, identifier: str) -> User | None:
    ident = identifier.strip()
    return (
        db.query(User)
        .filter(
            or_(
                User.username == ident,
                User.email == ident.lower(),
                User.phone == re.sub(r"\s|-", "", ident),
            )
        )
        .first()
    )


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Annotated[Session, Depends(get_db)]):
    username = payload.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="用户名需以字母开头，只能含字母、数字和下划线")
    contact = normalize_contact(payload.contact_type, payload.contact)
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="这个用户名已经有人用了")
    if payload.contact_type == "email" and db.query(User).filter(User.email == contact).first():
        raise HTTPException(status_code=400, detail="这个邮箱已经注册过了")
    if payload.contact_type == "phone" and db.query(User).filter(User.phone == contact).first():
        raise HTTPException(status_code=400, detail="这个手机号已经注册过了")
    user = User(
        username=username,
        display_name=payload.display_name.strip(),
        password_hash=hash_password(payload.password),
        city=payload.city.strip(),
        bio=payload.bio.strip(),
        email=contact if payload.contact_type == "email" else None,
        phone=contact if payload.contact_type == "phone" else None,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Annotated[Session, Depends(get_db)]):
    user = find_user(db, payload.identifier)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="账号或密码不对")
    if user.banned:
        raise HTTPException(status_code=403, detail="账号已被停用，请联系管理员")
    return TokenOut(token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip()
    if payload.city is not None:
        user.city = payload.city.strip()
    if payload.bio is not None:
        user.bio = payload.bio.strip()
    db.commit()
    db.refresh(user)
    return user
