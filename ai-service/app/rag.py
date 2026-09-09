"""RAG 检索:与 Java 端 RAGService 行为对齐。

- 检索范围 = 站内已发布文章分块(rag_chunks)+ 管理员知识条目(rag_entries)。
- 混合检索 = BM25(jieba 分词)+ 语义向量余弦,权重 0.6 语义 + 0.4 关键词。
- 知识库为空返回 None;未配置 LLM 时走降级回答。
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, field

import jieba

from . import config, db
from .llm import chat, chat_stream, embed

SYSTEM_PROMPT = (
    "你是“uswrite”博客社区的AI助手。请只根据下面提供的站内文章资料回答用户问题,"
    "不要编造资料中没有的信息;回答用中文,简洁有条理。"
    "资料会以 [编号] 形式提供;当你的回答引用了某段资料时,请在相应句子末尾标注对应的 [编号]。"
    "凡涉及社区名称一律使用“uswrite”,不要使用旧称“拾光”。"
    "用户可能连续追问,请结合对话历史理解上下文。"
)

REWRITE_PROMPT = (
    "你是检索改写助手。根据对话历史,把用户的当前问题改写成一个独立、完整的检索问题,"
    "补全指代和省略的信息,使其脱离上下文也能被理解。只输出改写后的问题,不要任何解释。"
)


@dataclass
class ChunkItem:
    kind: str  # "post" | "entry"
    source_id: int
    title: str
    content: str
    embedding: str | None = None


@dataclass
class RagPlan:
    messages: list[dict]
    sources: list[dict]
    top: list[ChunkItem]


# ---------- 分块 ----------

def chunk_text(text: str) -> list[str]:
    """按 Markdown 标题分块,同标题段落尽量放一起,块首带标题作为上下文。"""
    lines = text.splitlines()
    chunks: list[str] = []
    buffer: list[str] = []
    heading = ""

    def heading_text(line: str) -> str | None:
        if not line.startswith("#"):
            return None
        i = 0
        while i < len(line) and line[i] == "#":
            i += 1
        if i <= 6 and i < len(line) and line[i] == " ":
            return line[i:].strip()
        return None

    def append_heading(h: str) -> None:
        if h:
            buffer.append(f"【{h}】")

    def push() -> None:
        s = "\n".join(buffer).strip()
        if not s:
            return
        if len(s) > config.MAX_CHUNK:
            s = s[: config.MAX_CHUNK]
        chunks.append(s)

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        h = heading_text(line)
        if h is not None:
            push()
            heading = h
            buffer = []
            append_heading(heading)
            continue
        if buffer and sum(len(x) for x in buffer) + len(line) > config.CHUNK_SIZE:
            push()
            buffer = []
            append_heading(heading)
        buffer.append(line)
    push()
    return chunks


# ---------- 分词与 BM25 ----------

def tokenize(text: str) -> list[str]:
    """jieba 分词,过滤纯标点,统一小写。"""
    out: list[str] = []
    for t in jieba.cut(text):
        w = t.strip().lower()
        if not w:
            continue
        # 与 Java 端 containsLetterOrDigit 对齐:只要含任一字母/数字字符(含中文)即保留
        if not any(ch.isalnum() for ch in w):
            continue
        out.append(w)
    return out


def _build_doc_freq(docs: list[list[str]]) -> dict[str, int]:
    df: dict[str, int] = {}
    for doc in docs:
        for t in set(doc):
            df[t] = df.get(t, 0) + 1
    return df


def _build_idf(df: dict[str, int], total: int) -> dict[str, float]:
    return {
        t: math.log((total - d + 0.5) / (d + 0.5) + 1)
        for t, d in df.items()
    }


def _bm25(query: list[str], doc: list[str], idf: dict[str, float],
          avgdl: float, k1: float = 1.5, b: float = 0.75) -> float:
    if not doc or not query:
        return 0.0
    dl = len(doc)
    tf: dict[str, int] = {}
    for t in doc:
        tf[t] = tf.get(t, 0) + 1
    score = 0.0
    for t in query:
        f = tf.get(t)
        if f is None:
            continue
        idf_val = idf.get(t, 0.0)
        denom = f + k1 * (1 - b + b * dl / max(avgdl, 1))
        score += idf_val * (f * (k1 + 1)) / denom
    return score


def _cosine(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    dot = sum(a[i] * b[i] for i in range(n))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ---------- 加载知识库 ----------

def _load_items() -> list[ChunkItem]:
    items: list[ChunkItem] = []
    for c in db.query("SELECT id, post_id, chunk_index, content, embedding FROM rag_chunks ORDER BY id"):
        items.append(ChunkItem("post", c["post_id"], "", c["content"], c["embedding"]))
    for e in db.query("SELECT id, title, content, embedding FROM rag_entries ORDER BY id"):
        items.append(ChunkItem("entry", e["id"], e["title"], e["content"], e["embedding"]))
    return items


def _post_map(post_ids: list[int]) -> dict[int, dict]:
    if not post_ids:
        return {}
    ids = ",".join(str(i) for i in post_ids)
    rows = db.query(f"SELECT id, title, slug, excerpt FROM posts WHERE id IN ({ids})")
    return {r["id"]: r for r in rows}


# ---------- 检索打分与融合 ----------

def _score_items(items: list[ChunkItem], question: str):
    """计算每个 item 的语义分数与 BM25 分数,返回 (semantic_list, bm25_list, query_embedding)。"""
    query_embedding: list[float] | None = None
    if config.embedding_enabled():
        try:
            query_embedding = embed(question)
        except Exception:
            query_embedding = None

    doc_tokens = [tokenize(it.content) for it in items]
    q_tokens = tokenize(question)
    df = _build_doc_freq(doc_tokens)
    total = len(items)
    avgdl = (sum(len(d) for d in doc_tokens) / total) if total else 1.0
    idf = _build_idf(df, total)

    semantic_list: list[float] = []
    bm25_list: list[float] = []
    for i, it in enumerate(items):
        semantic = 0.0
        if query_embedding is not None and it.embedding:
            try:
                vec = json.loads(it.embedding)
                semantic = max(0.0, _cosine(query_embedding, vec))
            except Exception:
                semantic = 0.0
        semantic_list.append(semantic)
        bm25_list.append(_bm25(q_tokens, doc_tokens[i], idf, avgdl))
    return semantic_list, bm25_list, query_embedding


def _rrf_fuse(semantic_list: list[float], bm25_list: list[float], k: int = 60) -> list[int]:
    """Reciprocal Rank Fusion:按排名融合语义与关键词两个排序,返回按融合分降序的索引列表。

    相比把不同量纲的分数直接线性加权,RRF 只依赖排名,更稳健。
    """
    n = len(semantic_list)
    sem_order = sorted(range(n), key=lambda i: semantic_list[i], reverse=True)
    bm25_order = sorted(range(n), key=lambda i: bm25_list[i], reverse=True)
    sem_rank = {idx: r + 1 for r, idx in enumerate(sem_order)}
    bm25_rank = {idx: r + 1 for r, idx in enumerate(bm25_order)}
    rrf = {i: 1.0 / (k + sem_rank[i]) + 1.0 / (k + bm25_rank[i]) for i in range(n)}
    return sorted(range(n), key=lambda i: rrf[i], reverse=True)


def retrieve(question: str, strategy: str = "rrf", top_k: int | None = None,
             items: list[ChunkItem] | None = None) -> list[ChunkItem]:
    """按指定策略检索 top_k 个 chunk。

    strategy 支持 "rrf"(默认)、"weighted"(旧线性加权)、"bm25"(纯关键词)。
    无向量或仅 bm25 时自动退化为关键词排序。
    """
    top_k = top_k or config.TOP_K
    if items is None:
        items = _load_items()
    if not items:
        return []

    semantic_list, bm25_list, query_embedding = _score_items(items, question)
    n = len(items)

    if strategy == "bm25":
        order = sorted(range(n), key=lambda i: bm25_list[i], reverse=True)
    elif strategy == "weighted":
        weighted: list[float] = []
        for i in range(n):
            bn = bm25_list[i] / (bm25_list[i] + 1.0)
            ws = (0.6 * semantic_list[i] + 0.4 * bn) if query_embedding is not None else bn
            weighted.append(ws)
        order = sorted(range(n), key=lambda i: weighted[i], reverse=True)
    elif strategy == "rrf" and query_embedding is not None:
        order = _rrf_fuse(semantic_list, bm25_list)
    else:
        order = sorted(range(n), key=lambda i: bm25_list[i], reverse=True)

    return [items[i] for i in order[:top_k]]


def rewrite_query(question: str, history: list[dict] | None) -> str:
    """多轮场景下,把当前追问改写成独立完整的问题,用于检索;单轮直接复用原问题。"""
    if not history or not config.llm_enabled():
        return question
    hist_text = "\n".join(f"{h.get('role')}: {h.get('content')}" for h in history[-4:])
    msgs = [
        {"role": "system", "content": REWRITE_PROMPT},
        {"role": "user", "content": f"对话历史:\n{hist_text}\n\n当前问题:{question}"},
    ]
    try:
        rewritten = chat(msgs).strip()
        if rewritten and rewritten != question:
            return rewritten
    except Exception:
        pass
    return question


# ---------- 检索计划 ----------

def build_plan(question: str, history: list[dict] | None) -> RagPlan | None:
    items = _load_items()
    if not items:
        return None

    # 检索用改写后的 query(提升多轮命中),生成仍基于用户原始问题
    search_query = rewrite_query(question, history)
    top = retrieve(search_query, strategy="rrf", items=items)

    post_ids = [it.source_id for it in top if it.kind == "post"]
    posts = _post_map(post_ids)

    sources: list[dict] = []
    seen_posts: set[int] = set()
    seen_entries: set[int] = set()
    for it in top:
        if it.kind == "post":
            p = posts.get(it.source_id)
            if p is None or it.source_id in seen_posts:
                continue
            seen_posts.add(it.source_id)
            sources.append({
                "post_id": p["id"],
                "title": p["title"],
                "slug": p["slug"],
                "excerpt": p.get("excerpt") or "",
                "snippet": _truncate(it.content, 200),
            })
        else:
            if it.source_id in seen_entries:
                continue
            seen_entries.add(it.source_id)
            sources.append({
                "post_id": None,
                "title": it.title,
                "slug": None,
                "excerpt": "",
                "snippet": _truncate(it.content, 200),
            })
        if len(sources) >= 5:
            break

    context_parts: list[str] = []
    for n, it in enumerate(top, start=1):
        title = posts[it.source_id]["title"] if it.kind == "post" else it.title
        context_parts.append(f"[{n}] 【文章:{title}】\n{it.content}")
    context = "\n\n".join(context_parts)

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for h in history:
            role = h.get("role")
            content = h.get("content") or ""
            if role not in ("user", "assistant") or not content.strip():
                continue
            messages.append({"role": role, "content": content})
    messages.append({
        "role": "user",
        "content": f"站内文章资料:\n{context}\n\n用户问题:{question}",
    })
    return RagPlan(messages, sources, top)


def fallback_answer(top: list[ChunkItem], sources: list[dict]) -> dict:
    lines = ["我根据站内文章找到了这些相关内容:", ""]
    for it in top[:3]:
        lines.append(f"• {_truncate(it.content, 160)}")
        lines.append("")
    lines.append("配置大模型 API Key 后,我就能基于这些内容给出智能回答。")
    return {"answer": "\n".join(lines), "sources": sources, "llm": False}


def _truncate(text: str, max_len: int) -> str:
    plain = re.sub(r"\s+", " ", text).strip()
    return plain if len(plain) <= max_len else plain[:max_len] + "…"


def ask(question: str, history: list[dict] | None) -> dict:
    """非流式问答。"""
    plan = build_plan(question, history)
    if plan is None:
        return {"answer": "知识库还是空的,等有文章发布或管理员添加知识后再来问我吧。",
                "sources": [], "llm": False}
    if config.llm_enabled():
        try:
            return {"answer": chat(plan.messages), "sources": plan.sources, "llm": True}
        except Exception:
            pass
    return fallback_answer(plan.top, plan.sources)


def ask_stream(question: str, history: list[dict] | None):
    """流式问答。

    返回 (plan, gen):
    - plan 为 None 表示知识库为空;
    - gen 为惰性生成器,迭代时逐段产出增量文本;为 None 表示降级(未配置 LLM)。
    生成器迭代过程中若 LLM 失败会抛异常,由路由层捕获后走降级。
    """
    plan = build_plan(question, history)
    if plan is None:
        return None, None
    if not config.llm_enabled():
        return plan, None
    return plan, chat_stream(plan.messages)
