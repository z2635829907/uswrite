import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["user", "admin"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const body = schema.parse(await req.json());
    if (userId === admin.id) throw new ResponseError(400, "不能修改自己的权限");

    if (body.role === "user") {
      const adminCount = db
        .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'")
        .get() as unknown as { n: number };
      if (Number(adminCount.n) <= 1)
        throw new ResponseError(400, "至少保留一名管理员");
    }

    db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(
      body.role,
      Date.now(),
      userId
    );
    return ok();
  } catch (e) {
    return fail(e);
  }
}
