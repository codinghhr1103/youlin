from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=20)
    display_name: str = Field(min_length=1, max_length=20)
    password: str = Field(min_length=8, max_length=64)
    contact_type: Literal["email", "phone"]
    contact: str = Field(min_length=5, max_length=120)
    city: str = ""
    bio: str = ""
    agree: bool = False

    @model_validator(mode="after")
    def require_agreement(self):
        if not self.agree:
            raise ValueError("请先同意用户协议与隐私政策")
        return self


class LoginIn(BaseModel):
    identifier: str = Field(min_length=2, max_length=120)
    password: str


class UserPublic(BaseModel):
    """公开资料：不含邮箱、手机号。"""

    id: int
    username: str
    display_name: str
    city: str
    bio: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPrivate(UserPublic):
    """本人或管理员可见，含联系方式。"""

    email: str | None = None
    phone: str | None = None
    role: str = "user"
    banned: bool = False


class TokenOut(BaseModel):
    token: str
    user: UserPrivate


class StampOut(BaseModel):
    id: int
    catalog_no: str
    name: str
    year: int
    theme: str
    mark: str
    color: str
    face_value: str
    description: str
    issuer: str = ""
    image_path: str = ""
    image_license: str = ""
    image_credit: str = ""
    image_source: str = ""

    model_config = {"from_attributes": True}


class CollectionOut(BaseModel):
    id: int
    status: str
    note: str
    photo_path: str = ""
    name: str = ""
    catalog_no: str = ""
    stamp_id: int | None = None
    stamp: StampOut | None = None

    model_config = {"from_attributes": True}


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=240)


class CommentOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    author: UserPublic


class PostOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    like_count: int
    liked: bool
    author: UserPublic
    stamp: StampOut | None = None
    photo_path: str = ""
    name: str = ""
    catalog_no: str = ""
    item_id: int | None = None
    comments: list[CommentOut] = []


class SwapPiece(BaseModel):
    id: int
    name: str
    catalog_no: str
    photo_path: str = ""
    note: str = ""
    stamp_id: int | None = None


class SwapIn(BaseModel):
    partner_id: int
    offer_item_id: int
    request_item_id: int
    message: str = ""


class SwapOut(BaseModel):
    id: int
    status: str
    message: str
    created_at: datetime
    proposer: UserPublic
    partner: UserPublic
    offer: SwapPiece
    request: SwapPiece
    same_city: bool = False
    their_email: str | None = None
    their_phone: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=20)
    city: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=40)
    phone: str | None = Field(default=None, max_length=40)
    bio: str | None = Field(default=None, max_length=240)
