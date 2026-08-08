import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["visible", "hidden"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const commentId = Number(id);
    const body = schema.parse(await req.json());
    const info = db
      .prepare("UPDATE comments SET status = ? WHERE id = ?")
      .run(body.status, commentId);
    if (info.changes === 0) throw new ResponseError(404, "评论不存在");
    return ok();
  } catch (e) {
    return fail(e);
  }
}
