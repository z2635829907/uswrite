"""JWT 鉴权:与 Spring 端(jjwt)互认。

- 算法:Spring 端用 jjwt 的 `signWith(key)` 按密钥长度自动选 HMAC 算法
  (当前密钥 56 字节 → HS384),故此处接受 HS256/HS384/HS512 以保持一致;
  secret 与 Spring 的 app.jwt.secret 相同。
- payload 约定:sub = userId(字符串)、role、status、name、iat、exp。
- 无 token / 无效 token → 匿名;history 与 admin 接口要求登录。
"""
import jwt
from fastapi import Header, HTTPException

from . import config

# Spring 端 jjwt 会按密钥长度自动选择 HMAC 变体,统一接受 HS 家族
_ALGORITHMS = ["HS256", "HS384", "HS512"]


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=_ALGORITHMS)
    except Exception:
        return None


def _extract_user_id(authorization: str | None) -> int | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token(authorization[7:])
    if not payload:
        return None
    sub = payload.get("sub")
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


def current_user_id(authorization: str | None = Header(default=None)) -> int | None:
    """匿名返回 None,登录返回用户 id。"""
    return _extract_user_id(authorization)


def require_user_id(authorization: str | None = Header(default=None)) -> int:
    """必须登录,否则 401。"""
    uid = _extract_user_id(authorization)
    if uid is None:
        raise HTTPException(status_code=401, detail="请先登录")
    return uid


def require_admin(authorization: str | None = Header(default=None)) -> int:
    """必须管理员,否则 401/403。"""
    uid = _extract_user_id(authorization)
    if uid is None:
        raise HTTPException(status_code=401, detail="请先登录")
    if not authorization:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = decode_token(authorization[7:])
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return uid
