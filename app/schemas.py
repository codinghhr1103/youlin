from datetime import datetime

from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=20)
    display_name: str = Field(min_length=1, max_length=20)
    password: str = Field(min_length=6, max_length=64)
    city: str = ""
    bio: str = ""


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    city: str
    bio: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    token: str
    user: UserOut


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

    model_config = {"from_attributes": True}


class CollectionIn(BaseModel):
    stamp_id: int
    status: str = Field(pattern="^(own|want|swap)$")
    note: str = ""


class CollectionOut(BaseModel):
    id: int
    status: str
    note: str
    stamp: StampOut

    model_config = {"from_attributes": True}


class PostIn(BaseModel):
    body: str = Field(min_length=1, max_length=500)
    stamp_id: int | None = None


class PostOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    like_count: int
    liked: bool
    author: UserOut
    stamp: StampOut | None


class SwapIn(BaseModel):
    partner_id: int
    offer_stamp_id: int
    request_stamp_id: int
    message: str = ""


class SwapOut(BaseModel):
    id: int
    status: str
    message: str
    created_at: datetime
    proposer: UserOut
    partner: UserOut
    offer_stamp: StampOut
    request_stamp: StampOut


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    city: str | None = None
    bio: str | None = None
