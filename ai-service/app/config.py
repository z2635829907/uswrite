"""集中配置:通过环境变量注入,与 Java 端 application.yml 对齐。

- LLM 配置同时兼容 Java 端的 SPRING_LLM_* 命名与本服务专属的 LLM_* 命名。
- JWT secret 与 Spring 端保持一致(HS256),实现鉴权互认。
"""
import os

from dotenv import load_dotenv

load_dotenv()


def _first(*keys: str, default: str = "") -> str:
    for k in keys:
        v = os.getenv(k)
        if v is not None and v != "":
            return v
    return default


# ---- 对话大模型(OpenAI 兼容协议,默认 DeepSeek) ----
LLM_BASE_URL = _first("LLM_BASE_URL", "DEEPSEEK_BASE_URL", "SPRING_LLM_BASE_URL",
                      default="https://api.deepseek.com")
LLM_API_KEY = _first("LLM_API_KEY", "DEEPSEEK_API_KEY", "SPRING_LLM_API_KEY", default="")
LLM_MODEL = _first("LLM_MODEL", "DEEPSEEK_MODEL", "SPRING_LLM_MODEL", default="deepseek-chat")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.4"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "4096"))

# ---- 向量模型(独立配置;DeepSeek 不提供 embedding,默认禁用 → 纯 BM25 检索) ----
EMBEDDING_BASE_URL = _first("EMBEDDING_BASE_URL", default="")
EMBEDDING_API_KEY = _first("EMBEDDING_API_KEY", default="")
EMBEDDING_MODEL = _first("EMBEDDING_MODEL", "SPRING_LLM_EMBEDDING_MODEL",
                         default="text-embedding-v3")

# ---- JWT(与 Spring app.jwt.secret 一致) ----
JWT_SECRET = os.getenv(
    "JWT_SECRET", "shiguang-blog-jwt-secret-key-2026-change-me-in-production")

# ---- MySQL(与 Spring datasource 一致) ----
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123456")
DB_NAME = os.getenv("DB_NAME", "shiguang")

# ---- RAG 参数(与 Java RAGService 对齐) ----
CHUNK_SIZE = 600
MAX_CHUNK = 1200
TOP_K = 6
SYNC_INTERVAL_SECONDS = 15 * 60  # 每 15 分钟增量索引

# ---- 服务 ----
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))


def llm_enabled() -> bool:
    return bool(LLM_API_KEY)


def embedding_enabled() -> bool:
    return bool(EMBEDDING_API_KEY)
