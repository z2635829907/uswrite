import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const username = body.username.trim();
    const email = body.email.trim().toLowerCase();
    const displayName = body.displayName.trim();

    const exists = db
      .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
      .get(username, email);
    if (exists) {
      const row = exists as { username: string; email: string };
      if (row.username === username)
        throw new ResponseError(409, "这个用户名已经被使用了");
      throw new ResponseError(409, "这个邮箱已经注册过了");
    }

    const hash = await bcrypt.hash(body.password, 10);
    const now = Date.now();
    const info = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, display_name, avatar_seed, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)`
      )
      .run(username, email, hash, displayName, username, now, now);

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(Number(info.lastInsertRowid)) as unknown as User;
    await createSession(user);
    return ok({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
