from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import Base, engine, SessionLocal
from app.routers import admin, auth, collection, posts, stamps, swaps, users
from app.seed import seed_if_empty
from app.uploads import UPLOAD_DIR, resolve_upload

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="邮邻 Youlin", version="0.1.0")
app.include_router(auth.router, prefix="/api")
app.include_router(stamps.router, prefix="/api")
app.include_router(collection.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(swaps.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_if_empty(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"ok": True, "name": "youlin"}


@app.get("/uploads/{rest:path}")
def serve_upload(rest: str):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = resolve_upload(f"/uploads/{rest}")
    if not path:
        raise HTTPException(status_code=404, detail="没有这张图")
    return FileResponse(path)


@app.get("/{path:path}")
def spa(path: str):
    if path:
        candidate = (WEB_DIR / path).resolve()
        if str(candidate).startswith(str(WEB_DIR.resolve())) and candidate.is_file():
            return FileResponse(candidate)
    return FileResponse(WEB_DIR / "index.html")
