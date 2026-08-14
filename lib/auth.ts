import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { springFetch } from "./spring";
import { ResponseError } from "./errors";
import type { User } from "./types";
export { ResponseError };

const DAY = 1000 * 60 * 60 * 24;

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
  );
}

export async function createSession(user: User, springToken?: string) {
  const token = await new SignJWT({
    role: user.role,
    status: user.status,
    name: user.display_name,
    ...(springToken ? { t: springToken } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** 从会话中取出后端下发的 JWT,用于调用需要登录的接口。 */
export async function getSpringToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const springToken = payload.t;
    return typeof springToken === "string" ? springToken : null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const token = await getSpringToken();
  if (!token) return null;
  try {
    const data = await springFetch<{ user?: Record<string, unknown> }>(
      "/api/auth/me",
      { token }
    );
    const u = data.user;
    if (!u || u.id == null) return null;
    const created = Number(u.created_at) || Date.now();
    return {
      id: Number(u.id),
      username: String(u.username || ""),
      email: "",
      password_hash: "",
      display_name: String(u.display_name || ""),
      bio: String(u.bio || ""),
      website: String(u.website || ""),
      avatar_seed: String(u.avatar_seed || ""),
      role: u.role === "admin" ? "admin" : "user",
      status: u.status === "banned" ? "banned" : "active",
      created_at: created,
      updated_at: created,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ResponseError(401, "请先登录");
  if (user.status === "banned") throw new ResponseError(403, "账号已被禁用");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ResponseError(403, "需要管理员权限");
  return user;
}

export function sessionAgeDays() {
  return 7;
}

export function isSessionFresh(createdAt: number) {
  return Date.now() - createdAt < 7 * DAY;
}
