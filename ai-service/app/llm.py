"""大模型客户端:对话基于 LangChain,向量化基于 openai 库。

- 对话与流式:langchain_openai.ChatOpenAI(OpenAI 兼容协议)。
- 向量化:直接用 openai 库。原因:LangChain 的 OpenAIEmbeddings 会用 tiktoken 把文本
  转成 token ID 再发送(input=[[82805]]),而 DashScope 兼容接口只接受文本,会报 400。
  故此处绕开 OpenAIEmbeddings,用底层 openai 库发送原始文本。
"""
from __future__ import annotations

from typing import Iterator

from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from openai import OpenAI

from . import config

_chat: ChatOpenAI | None = None
_embed_client: OpenAI | None = None


def _build_chat() -> ChatOpenAI:
    return ChatOpenAI(
        model=config.LLM_MODEL,
        api_key=config.LLM_API_KEY,
        base_url=config.LLM_BASE_URL,
        temperature=config.LLM_TEMPERATURE,
        max_tokens=config.LLM_MAX_TOKENS,
        timeout=180,
        max_retries=1,
    )


def _build_embed_client() -> OpenAI:
    return OpenAI(
        api_key=config.EMBEDDING_API_KEY,
        base_url=config.EMBEDDING_BASE_URL or config.LLM_BASE_URL,
    )


def chat_client() -> ChatOpenAI:
    global _chat
    if _chat is None:
        _chat = _build_chat()
    return _chat


def embed_client() -> OpenAI:
    global _embed_client
    if _embed_client is None:
        _embed_client = _build_embed_client()
    return _embed_client


def to_messages(messages: list[dict]) -> list[BaseMessage]:
    """把 {role, content} 列表转成 LangChain 消息。"""
    out: list[BaseMessage] = []
    for m in messages:
        role = m.get("role")
        content = m.get("content", "")
        if role == "system":
            out.append(SystemMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            out.append(HumanMessage(content=content))
    return out


def chat(messages: list[dict]) -> str:
    """非流式对话,返回完整回答。"""
    client = chat_client()
    resp = client.invoke(to_messages(messages))
    content = resp.content if isinstance(resp.content, str) else str(resp.content or "")
    # 部分模型只输出思考过程,取 reasoning_content 兜底(与 Java 端一致)
    if not content.strip():
        extra = getattr(resp, "additional_kwargs", {}) or {}
        content = str(extra.get("reasoning_content") or "")
    return content


def chat_stream(messages: list[dict]) -> Iterator[str]:
    """流式对话,逐个 yield 增量文本。"""
    client = chat_client()
    for chunk in client.stream(to_messages(messages)):
        if isinstance(chunk, AIMessageChunk):
            piece = chunk.content
        else:
            piece = getattr(chunk, "content", "")
        if isinstance(piece, str) and piece:
            yield piece


def embed(text: str) -> list[float]:
    """文本向量化;向量模型未配置时抛出异常,由调用方降级为关键词检索。"""
    if not config.embedding_enabled():
        raise RuntimeError("向量模型未配置")
    resp = embed_client().embeddings.create(model=config.EMBEDDING_MODEL, input=text)
    return list(resp.data[0].embedding)
