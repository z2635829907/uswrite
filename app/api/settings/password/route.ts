import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { passwordSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = passwordSchema.parse(await req.json());
    const match = await bcrypt.compare(body.currentPassword, user.password_hash);
    if (!match) throw new ResponseError(400, "当前密码不正确");
    const hash = await bcrypt.hash(body.newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      hash,
      Date.now(),
      user.id
    );
    return ok();
  } catch (e) {
    return fail(e);
  }
}
