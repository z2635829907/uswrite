import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const account = body.account.trim();
    const user = db
      .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
      .get(account, account.toLowerCase()) as unknown as User | undefined;

    if (!user) throw new ResponseError(401, "用户名或密码不正确");
    if (user.status === "banned")
      throw new ResponseError(403, "该账号已被禁用，如有疑问请联系管理员");

    const match = await bcrypt.compare(body.password, user.password_hash);
    if (!match) throw new ResponseError(401, "用户名或密码不正确");

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
