"""数据库访问:SQLAlchemy Core + PyMySQL,带连接池,执行原生 SQL。

数据表结构与 Java 端 MyBatis-Plus 完全一致,直接复用同一 MySQL 库。
"""
from sqlalchemy import create_engine, text

from . import config

URL = (
    f"mysql+pymysql://{config.DB_USER}:{config.DB_PASSWORD}"
    f"@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}?charset=utf8mb4"
)

engine = create_engine(
    URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)


def query(sql: str, params: dict | None = None) -> list[dict]:
    """查询并返回 dict 列表。"""
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params or {})
        cols = list(rows.keys())
        return [dict(zip(cols, row)) for row in rows]


def execute(sql: str, params: dict | None = None) -> int:
    """执行写操作,返回受影响行数。"""
    with engine.begin() as conn:
        result = conn.execute(text(sql), params or {})
        return result.rowcount


def scalar(sql: str, params: dict | None = None):
    """查询单值。"""
    with engine.connect() as conn:
        return conn.execute(text(sql), params or {}).scalar()
