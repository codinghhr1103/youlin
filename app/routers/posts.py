from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import CollectionItem, Post, PostLike, Stamp, User
from app.schemas import PostIn, PostOut, StampOut, UserPublic

router = APIRouter(prefix="/posts", tags=["posts"])


def _photo_map(db: Session, posts: list[Post]) -> dict[tuple[int, int], str]:
    pairs = [(post.user_id, post.stamp_id) for post in posts if post.stamp_id]
    if not pairs:
        return {}
    user_ids = {user_id for user_id, _ in pairs}
    stamp_ids = {stamp_id for _, stamp_id in pairs}
    items = (
        db.query(CollectionItem)
        .filter(CollectionItem.user_id.in_(user_ids), CollectionItem.stamp_id.in_(stamp_ids))
        .all()
    )
    return {(item.user_id, item.stamp_id): item.photo_path or "" for item in items}


def serialize_post(post: Post, me: User | None, photos: dict[tuple[int, int], str] | None = None) -> PostOut:
    liked = False
    if me:
        liked = any(like.user_id == me.id for like in post.likes)
    photo_path = ""
    if post.stamp_id:
        if photos is not None:
            photo_path = photos.get((post.user_id, post.stamp_id), "")
        else:
            photo_path = ""
    return PostOut(
        id=post.id,
        body=post.body,
        created_at=post.created_at,
        like_count=len(post.likes),
        liked=liked,
        author=UserPublic.model_validate(post.author),
        stamp=StampOut.model_validate(post.stamp) if post.stamp else None,
        photo_path=photo_path,
    )


@router.get("", response_model=list[PostOut])
def feed(
    db: Annotated[Session, Depends(get_db)],
    me: Annotated[User | None, Depends(get_optional_user)],
):
    posts = (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.stamp), joinedload(Post.likes))
        .order_by(Post.created_at.desc())
        .limit(50)
        .all()
    )
    photos = _photo_map(db, posts)
    return [serialize_post(post, me, photos) for post in posts]


@router.post("", response_model=PostOut)
def create_post(
    payload: PostIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if payload.stamp_id and not db.get(Stamp, payload.stamp_id):
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    post = Post(user_id=user.id, stamp_id=payload.stamp_id, body=payload.body.strip())
    db.add(post)
    db.commit()
    post = (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.stamp), joinedload(Post.likes))
        .filter(Post.id == post.id)
        .one()
    )
    return serialize_post(post, user, _photo_map(db, [post]))


@router.post("/{post_id}/like", response_model=PostOut)
def toggle_like(
    post_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    post = (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.stamp), joinedload(Post.likes))
        .filter(Post.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="动态不存在")
    existing = (
        db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == user.id).first()
    )
    if existing:
        db.delete(existing)
    else:
        db.add(PostLike(post_id=post_id, user_id=user.id))
    db.commit()
    post = (
        db.query(Post)
        .options(joinedload(Post.author), joinedload(Post.stamp), joinedload(Post.likes))
        .filter(Post.id == post_id)
        .one()
    )
    return serialize_post(post, user, _photo_map(db, [post]))
