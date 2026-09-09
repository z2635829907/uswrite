"""uswrite AI 助手服务(FastAPI + LangChain)。

独立于 Spring Boot 业务后端,负责 AI 助手的对话、流式问答、聊天历史与
知识库检索;与业务后端共享 MySQL 与 JWT(HS256 同 secret),实现鉴权互认。
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import config, indexer
from .routers import admin_rag, assistant


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动后台索引同步线程(启动即同步一次,之后每 15 分钟巡检)
    indexer.start_sync_loop()
    yield


app = FastAPI(title="uswrite AI Assistant", version="1.0.0", lifespan=lifespan)


def _validation_message(exc: RequestValidationError) -> str:
    """把 Pydantic 校验错误转成简洁中文提示。"""
    for e in exc.errors():
        loc = ".".join(str(x) for x in e.get("loc", []) if x != "body")
        t = e.get("type", "")
        if t == "string_too_short":
            return f"{loc} 不能为空"
        if t == "string_too_long":
            return f"{loc} 太长了"
        return f"{loc} 参数不合法"
    return "请求参数不合法"


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"ok": False, "error": _validation_message(exc)},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "error": exc.detail},
    )


@app.get("/api/assistant/health")
def health():
    return {
        "ok": True,
        "llm": config.llm_enabled(),
        "model": config.LLM_MODEL,
        "embedding": config.embedding_enabled(),
    }


app.include_router(assistant.router)
app.include_router(admin_rag.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=False)
