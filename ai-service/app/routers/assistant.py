"""AI 助手接口:对齐 Java 端 AssistantController 的 API 契约。

- POST /api/assistant/chat          非流式问答(匿名允许)
- POST /api/assistant/chat/stream   SSE 流式问答(事件名 delta / meta / error)
- GET  /api/assistant/history       登录用户聊天记录
- DELETE /api/assistant/history     清空聊天记录
"""
from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .. import db, rag
from ..auth import current_user_id, require_user_id

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


def _build_history(user_id: int | None) -> list[dict]:
    if user_id is None:
        return []
    rows = db.query(
        "SELECT role, content FROM chat_messages WHERE user_id = :uid "
        "ORDER BY created_at DESC LIMIT 6",
        {"uid": user_id},
    )
    rows.reverse()
    history: list[dict] = []
    for m in rows:
        role = m["role"]
        content = m["content"] or ""
        if role in ("user", "assistant") and content.strip():
            history.append({"role": role, "content": content})
    return history


def _save(user_id: int | None, role: str, content: str, sources=None) -> None:
    if user_id is None:
        return
    sources_json = json.dumps(sources, ensure_ascii=False) if sources is not None else None
    db.execute(
        "INSERT INTO chat_messages (user_id, role, content, sources, created_at) "
        "VALUES (:uid, :role, :content, :sources, :ts)",
        {
            "uid": user_id,
            "role": role,
            "content": content,
            "sources": sources_json,
            "ts": int(time.time() * 1000),
        },
    )


@router.post("/chat")
def chat(
    req: ChatRequest,
    authorization: str | None = Header(default=None),
):
    question = req.question.strip()
    user_id = current_user_id(authorization)
    result = rag.ask(question, _build_history(user_id))
    if user_id is not None:
        _save(user_id, "user", question, None)
        _save(user_id, "assistant", str(result.get("answer")), result.get("sources"))
    return {"ok": True, **result}


def _sse(name: str, data: dict) -> str:
    return f"event:{name}\ndata:{json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
def chat_stream(
    req: ChatRequest,
    authorization: str | None = Header(default=None),
):
    question = req.question.strip()
    user_id = current_user_id(authorization)
    history = _build_history(user_id)

    def gen():
        collected: list[str] = []
        plan, stream_gen = rag.ask_stream(question, history)
        if plan is None:
            yield _sse("delta", {"delta": "知识库还是空的,等有文章发布或管理员添加知识后再来问我吧。"})
            yield _sse("meta", {"sources": [], "llm": False, "done": True})
            if user_id is not None:
                _save(user_id, "user", question, None)
                _save(user_id, "assistant", "".join(collected), [])
            return

        if stream_gen is not None:
            try:
                for piece in stream_gen:
                    collected.append(piece)
                    yield _sse("delta", {"delta": piece})
                yield _sse("meta", {"sources": plan.sources, "llm": True, "done": True})
                if user_id is not None:
                    _save(user_id, "user", question, None)
                    _save(user_id, "assistant", "".join(collected), plan.sources)
                return
            except Exception:
                # 流式中途失败,降级为关键词回答
                pass

        fb = rag.fallback_answer(plan.top, plan.sources)
        yield _sse("delta", {"delta": fb["answer"]})
        yield _sse("meta", {"sources": fb["sources"], "llm": False, "done": True})
        if user_id is not None:
            _save(user_id, "user", question, None)
            _save(user_id, "assistant", "".join(collected) + fb["answer"], fb["sources"])

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
def history(
    limit: int = 200,
    authorization: str | None = Header(default=None),
):
    user_id = require_user_id(authorization)
    rows = db.query(
        "SELECT id, role, content, sources, created_at FROM chat_messages "
        "WHERE user_id = :uid ORDER BY created_at ASC LIMIT :lim",
        {"uid": user_id, "lim": min(limit, 500)},
    )
    messages: list[dict] = []
    for r in rows:
        item = {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "created_at": r["created_at"],
        }
        if r.get("sources"):
            try:
                item["sources"] = json.loads(r["sources"])
            except Exception:
                pass
        messages.append(item)
    return {"ok": True, "messages": messages}


@router.delete("/history")
def clear_history(authorization: str | None = Header(default=None)):
    user_id = require_user_id(authorization)
    db.execute("DELETE FROM chat_messages WHERE user_id = :uid", {"uid": user_id})
    return {"ok": True}
