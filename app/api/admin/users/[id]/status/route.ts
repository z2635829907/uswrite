import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["active", "banned"]),
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
    if (userId === admin.id) throw new ResponseError(400, "不能操作自己的账号");
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(
      body.status,
      Date.now(),
      userId
    );
    return ok();
  } catch (e) {
    return fail(e);
  }
}
