import { NextRequest } from "next/server";
import { springFetch } from "@/lib/spring";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const data = await springFetch<{ user: Record<string, unknown>; token: string }>(
      "/api/auth/login",
      { method: "POST", body: { account: body.account, password: body.password } }
    );
    const u = data.user;
    const user: User = {
      id: Number(u.id),
      username: String(u.username || ""),
      email: "",
      password_hash: "",
      display_name: String(u.display_name || ""),
      bio: "",
      website: "",
      avatar_seed: "",
      role: u.role === "admin" ? "admin" : "user",
      status: u.status === "banned" ? "banned" : "active",
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await createSession(user, data.token);
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
