import shutil
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.db import DATA_DIR, ROOT

UPLOAD_DIR = DATA_DIR / "uploads"
WEB_DIR = ROOT / "web"
MAX_BYTES = 8 * 1024 * 1024
MAX_EDGE = 1600


def _within(base: Path, candidate: Path) -> bool:
    try:
        candidate.relative_to(base.resolve())
        return True
    except ValueError:
        return False


def resolve_upload(public_path: str) -> Path | None:
    if not public_path.startswith("/uploads/"):
        return None
    candidate = (UPLOAD_DIR / public_path[len("/uploads/") :]).resolve()
    if candidate.is_file() and _within(UPLOAD_DIR, candidate):
        return candidate
    return None


def delete_upload(public_path: str) -> None:
    path = resolve_upload(public_path)
    if path:
        path.unlink(missing_ok=True)


def save_photo(user_id: int, upload: UploadFile, kind: str) -> str:
    if kind not in {"collection", "posts"}:
        raise HTTPException(status_code=400, detail="无法保存这类图片")
    raw = upload.file.read(MAX_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="请先拍一张实拍图")
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="图片不能超过 8MB")
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="只支持 JPEG、PNG 或 WebP 实拍图") from exc
    image.thumbnail((MAX_EDGE, MAX_EDGE))
    folder = UPLOAD_DIR / kind / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    image.save(folder / name, "JPEG", quality=88, optimize=True)
    return f"/uploads/{kind}/{user_id}/{name}"


def save_collection_photo(user_id: int, upload: UploadFile) -> str:
    return save_photo(user_id, upload, "collection")


def copy_catalog_image_as_photo(user_id: int, image_path: str) -> str:
    """Demo accounts only: copy a catalog scan into the user-photo slot."""
    if not image_path.startswith("/stamps/"):
        return ""
    src = (WEB_DIR / image_path.lstrip("/")).resolve()
    if not src.is_file() or not _within(WEB_DIR, src):
        return ""
    folder = UPLOAD_DIR / "collection" / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    suffix = src.suffix.lower() if src.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"
    name = f"{uuid.uuid4().hex}{suffix}"
    shutil.copy2(src, folder / name)
    return f"/uploads/collection/{user_id}/{name}"
