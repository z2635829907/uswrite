import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE } from "./constants";
import type { User } from "./types";

const DAY = 1000 * 60 * 60 * 24;

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
  );
}

export async function createSession(user: User) {
  const token = await new SignJWT({
    role: user.role,
    status: user.status,
    name: user.display_name,
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

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    if (!id) return null;
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as unknown as User | undefined;
    return user ?? null;
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

export class ResponseError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function sessionAgeDays() {
  return 7;
}

export function isSessionFresh(createdAt: number) {
  return Date.now() - createdAt < 7 * DAY;
}
