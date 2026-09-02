from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import CollectionItem, Post, PostComment, PostLike, Stamp, User
from app.schemas import CommentIn, CommentOut, PostOut, StampOut, UserPublic
from app.uploads import save_photo

router = APIRouter(prefix="/posts", tags=["posts"])


def _post_options():
    return (
        joinedload(Post.author),
        joinedload(Post.stamp),
        joinedload(Post.item),
        joinedload(Post.likes),
        joinedload(Post.comments).joinedload(PostComment.author),
    )


def serialize_post(post: Post, me: User | None) -> PostOut:
    liked = False
    if me:
        liked = any(like.user_id == me.id for like in post.likes)
    item = post.item
    photo_path = post.photo_path or (item.photo_path if item else "")
    name = post.name or (item.name if item else "") or (post.stamp.name if post.stamp else "")
    catalog_no = (
        post.catalog_no
        or (item.catalog_no if item else "")
        or (post.stamp.catalog_no if post.stamp else "")
    )
    comments = [
        CommentOut(
            id=comment.id,
            body=comment.body,
            created_at=comment.created_at,
            author=UserPublic.model_validate(comment.author),
        )
        for comment in post.comments
    ]
    return PostOut(
        id=post.id,
        body=post.body,
        created_at=post.created_at,
        like_count=len(post.likes),
        liked=liked,
        author=UserPublic.model_validate(post.author),
        stamp=StampOut.model_validate(post.stamp) if post.stamp else None,
        photo_path=photo_path,
        name=name,
        catalog_no=catalog_no,
        item_id=post.item_id,
        comments=comments,
    )


def _load_post(db: Session, post_id: int) -> Post | None:
    return db.query(Post).options(*_post_options()).filter(Post.id == post_id).first()


@router.get("", response_model=list[PostOut])
def feed(
    db: Annotated[Session, Depends(get_db)],
    me: Annotated[User | None, Depends(get_optional_user)],
):
    posts = db.query(Post).options(*_post_options()).order_by(Post.created_at.desc()).limit(50).all()
    return [serialize_post(post, me) for post in posts]


@router.post("", response_model=PostOut)
def create_post(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    body: Annotated[str, Form()],
    item_id: Annotated[str, Form()] = "",
    stamp_id: Annotated[str, Form()] = "",
    name: Annotated[str, Form()] = "",
    catalog_no: Annotated[str, Form()] = "",
    photo: Annotated[UploadFile | None, File()] = None,
):
    text = body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="请写一点关于这枚票的话")
    item = None
    if item_id.strip():
        try:
            parsed_item = int(item_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="邮册条目不对") from exc
        item = (
            db.query(CollectionItem)
            .filter(CollectionItem.id == parsed_item, CollectionItem.user_id == user.id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="邮册里没有这枚")
    parsed_stamp = int(stamp_id) if stamp_id.strip() else (item.stamp_id if item else None)
    stamp = db.get(Stamp, parsed_stamp) if parsed_stamp else None
    if parsed_stamp and not stamp:
        raise HTTPException(status_code=404, detail="没有这枚邮票")
    has_file = bool(photo and photo.filename)
    photo_path = save_photo(user.id, photo, "posts") if has_file else (item.photo_path if item else "")
    if not photo_path:
        raise HTTPException(status_code=400, detail="晒票请带上实拍图")
    title = name.strip() or (item.name if item else "") or (stamp.name if stamp else "")
    code = catalog_no.strip() or (item.catalog_no if item else "") or (stamp.catalog_no if stamp else "")
    post = Post(
        user_id=user.id,
        stamp_id=parsed_stamp,
        item_id=item.id if item else None,
        catalog_no=code,
        name=title,
        photo_path=photo_path,
        body=text,
    )
    db.add(post)
    db.commit()
    loaded = _load_post(db, post.id)
    return serialize_post(loaded, user)


@router.post("/{post_id}/like", response_model=PostOut)
def toggle_like(
    post_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    post = _load_post(db, post_id)
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
    return serialize_post(_load_post(db, post_id), user)


@router.post("/{post_id}/comments", response_model=PostOut)
def add_comment(
    post_id: int,
    payload: CommentIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="动态不存在")
    db.add(PostComment(post_id=post_id, user_id=user.id, body=payload.body.strip()))
    db.commit()
    return serialize_post(_load_post(db, post_id), user)
