from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(40))
    password_hash: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(40), default="")
    bio: Mapped[str] = mapped_column(String(240), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["CollectionItem"]] = relationship(back_populates="user")
    posts: Mapped[list["Post"]] = relationship(back_populates="author")


class Stamp(Base):
    __tablename__ = "stamps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    catalog_no: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    year: Mapped[int] = mapped_column(Integer)
    theme: Mapped[str] = mapped_column(String(32), index=True)
    mark: Mapped[str] = mapped_column(String(4))
    color: Mapped[str] = mapped_column(String(16))
    face_value: Mapped[str] = mapped_column(String(20), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    issuer: Mapped[str] = mapped_column(String(40), default="")
    image_path: Mapped[str] = mapped_column(String(160), default="")
    image_license: Mapped[str] = mapped_column(String(40), default="")
    image_credit: Mapped[str] = mapped_column(String(160), default="")
    image_source: Mapped[str] = mapped_column(String(240), default="")


class CollectionItem(Base):
    __tablename__ = "collection_items"
    __table_args__ = (UniqueConstraint("user_id", "stamp_id", name="uq_user_stamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    stamp_id: Mapped[int] = mapped_column(ForeignKey("stamps.id"), index=True)
    status: Mapped[str] = mapped_column(String(12), default="own")  # own / want / swap
    note: Mapped[str] = mapped_column(String(120), default="")

    user: Mapped[User] = relationship(back_populates="items")
    stamp: Mapped[Stamp] = relationship()


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    stamp_id: Mapped[int | None] = mapped_column(ForeignKey("stamps.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    author: Mapped[User] = relationship(back_populates="posts")
    stamp: Mapped[Stamp | None] = relationship()
    likes: Mapped[list["PostLike"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_like"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), index=True)

    post: Mapped[Post] = relationship(back_populates="likes")


class Swap(Base):
    __tablename__ = "swaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    proposer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    offer_stamp_id: Mapped[int] = mapped_column(ForeignKey("stamps.id"))
    request_stamp_id: Mapped[int] = mapped_column(ForeignKey("stamps.id"))
    message: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    proposer: Mapped[User] = relationship(foreign_keys=[proposer_id])
    partner: Mapped[User] = relationship(foreign_keys=[partner_id])
    offer_stamp: Mapped[Stamp] = relationship(foreign_keys=[offer_stamp_id])
    request_stamp: Mapped[Stamp] = relationship(foreign_keys=[request_stamp_id])
