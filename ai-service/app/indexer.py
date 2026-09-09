"""知识库索引同步:与 Java 端 RagInitializer + RAGService.ensureIndexed 对齐。

- 启动时全量增量建索引;之后每 15 分钟巡检一次(轮询 posts / rag_entries)。
- Java 端文章审核/删除原本进程内直调同步,这里改为定时轮询兜底。
"""
from __future__ import annotations

import json
import threading
import time

from . import config, db
from .llm import embed
from .rag import chunk_text


def _index_post(post: dict) -> None:
    post_id = post["id"]
    db.execute("DELETE FROM rag_chunks WHERE post_id = :pid", {"pid": post_id})
    tags = (post.get("tags") or "").replace("，", ",")
    tag_line = f"标签:{tags}\n" if tags else ""
    chunks = chunk_text(post["title"] + "\n" + tag_line + (post["content"] or ""))
    use_embedding = config.embedding_enabled()
    for i, chunk in enumerate(chunks):
        emb = None
        if use_embedding:
            try:
                emb = json.dumps(embed(chunk))
            except Exception:
                emb = None
        db.execute(
            "INSERT INTO rag_chunks (post_id, chunk_index, content, embedding, created_at) "
            "VALUES (:post_id, :idx, :content, :embedding, :created_at)",
            {
                "post_id": post_id,
                "idx": i,
                "content": chunk,
                "embedding": emb,
                "created_at": int(time.time() * 1000),
            },
        )


def _embed_entry(entry: dict) -> None:
    if not config.embedding_enabled():
        return
    try:
        emb = json.dumps(embed(entry["title"] + "\n" + entry["content"]))
        db.execute(
            "UPDATE rag_entries SET embedding = :emb, embedded_at = :ts WHERE id = :id",
            {"emb": emb, "ts": int(time.time() * 1000), "id": entry["id"]},
        )
    except Exception:
        pass


def ensure_indexed() -> None:
    """增量重建索引:文章按 updated_at 判断,知识条目按 embedded_at 判断。"""
    posts = db.query("SELECT id, title, content, tags, updated_at FROM posts WHERE status = 'approved'")
    approved_ids = [p["id"] for p in posts]
    if not approved_ids:
        db.execute("DELETE FROM rag_chunks")
    else:
        ids = ",".join(str(i) for i in approved_ids)
        db.execute(f"DELETE FROM rag_chunks WHERE post_id NOT IN ({ids})")
        for post in posts:
            last = db.scalar(
                "SELECT MAX(created_at) FROM rag_chunks WHERE post_id = :pid",
                {"pid": post["id"]},
            ) or 0
            fresh = bool(post.get("updated_at") and last >= post["updated_at"])
            # 向量模型启用时,若该文章的分块缺 embedding(如之前无向量阶段建的旧块),需重建补齐
            missing_emb = False
            if config.embedding_enabled():
                missing_emb = db.scalar(
                    "SELECT COUNT(*) FROM rag_chunks WHERE post_id = :pid "
                    "AND (embedding IS NULL OR embedding = '')",
                    {"pid": post["id"]},
                ) > 0
            if fresh and not missing_emb:
                continue
            _index_post(post)

    entries = db.query("SELECT id, title, content, embedding, embedded_at, updated_at FROM rag_entries ORDER BY id")
    for entry in entries:
        embedded_at = entry.get("embedded_at") or 0
        if entry.get("embedding") and embedded_at >= (entry.get("updated_at") or 0):
            continue
        _embed_entry(entry)


def start_sync_loop() -> threading.Thread:
    """后台线程:启动即同步一次,之后每 15 分钟巡检。"""
    def _run() -> None:
        while True:
            try:
                ensure_indexed()
            except Exception:
                pass
            time.sleep(config.SYNC_INTERVAL_SECONDS)

    t = threading.Thread(target=_run, daemon=True, name="rag-sync")
    t.start()
    return t
