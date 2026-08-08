import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const info = db
      .prepare("UPDATE posts SET views = views + 1 WHERE id = ? AND status = 'approved'")
      .run(postId);
    if (info.changes === 0) throw new ResponseError(404, "文章不存在");
    return ok();
  } catch (e) {
    return fail(e);
  }
}
