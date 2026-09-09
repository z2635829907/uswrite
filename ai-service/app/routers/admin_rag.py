"""管理员知识库管理:对齐 Java 端 AdminController 的 rag 端点。

- GET    /api/admin/rag        列出知识条目
- POST   /api/admin/rag        新增
- PATCH  /api/admin/rag/{id}   修改
- DELETE /api/admin/rag/{id}   删除
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from .. import db
from ..auth import require_admin
from ..indexer import _embed_entry

router = APIRouter(prefix="/api/admin/rag", tags=["admin-rag"])


class RagEntryRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50000)


def _entry_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.get("")
def list_entries(authorization: str | None = Header(default=None)):
    require_admin(authorization)
    rows = db.query(
        "SELECT id, title, content, created_at, updated_at "
        "FROM rag_entries ORDER BY updated_at DESC"
    )
    return {"ok": True, "entries": [_entry_dict(r) for r in rows]}


@router.post("")
def create_entry(req: RagEntryRequest, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    now = int(time.time() * 1000)
    db.execute(
        "INSERT INTO rag_entries (title, content, embedded_at, created_at, updated_at) "
        "VALUES (:title, :content, 0, :ts, :ts)",
        {"title": req.title.strip(), "content": req.content.strip(), "ts": now},
    )
    entry_id = db.scalar("SELECT LAST_INSERT_ID()")
    entry = db.query("SELECT id, title, content, created_at, updated_at FROM rag_entries WHERE id = :id",
                     {"id": entry_id})[0]
    _embed_entry({"id": entry["id"], "title": entry["title"], "content": entry["content"]})
    return {"ok": True, "entry": _entry_dict(entry)}


@router.patch("/{entry_id}")
def update_entry(entry_id: int, req: RagEntryRequest, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    existing = db.query("SELECT id FROM rag_entries WHERE id = :id", {"id": entry_id})
    if not existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="知识条目不存在")
    now = int(time.time() * 1000)
    db.execute(
        "UPDATE rag_entries SET title = :title, content = :content, embedding = NULL, "
        "embedded_at = 0, updated_at = :ts WHERE id = :id",
        {"title": req.title.strip(), "content": req.content.strip(), "ts": now, "id": entry_id},
    )
    entry = db.query("SELECT id, title, content, created_at, updated_at FROM rag_entries WHERE id = :id",
                     {"id": entry_id})[0]
    _embed_entry({"id": entry["id"], "title": entry["title"], "content": entry["content"]})
    return {"ok": True, "entry": _entry_dict(entry)}


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, authorization: str | None = Header(default=None)):
    require_admin(authorization)
    db.execute("DELETE FROM rag_entries WHERE id = :id", {"id": entry_id})
    return {"ok": True}
