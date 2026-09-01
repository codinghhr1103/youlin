from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import Base, engine, SessionLocal
from app.routers import auth, collection, posts, stamps, swaps, users
from app.seed import seed_if_empty

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="邮邻 Youlin", version="0.1.0")
app.include_router(auth.router, prefix="/api")
app.include_router(stamps.router, prefix="/api")
app.include_router(collection.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(swaps.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"ok": True, "name": "youlin"}


@app.get("/{path:path}")
def spa(path: str):
    if path:
        candidate = (WEB_DIR / path).resolve()
        if str(candidate).startswith(str(WEB_DIR.resolve())) and candidate.is_file():
            return FileResponse(candidate)
    return FileResponse(WEB_DIR / "index.html")
