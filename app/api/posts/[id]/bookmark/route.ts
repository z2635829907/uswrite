import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { Post } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const postId = Number(id);
    const post = db
      .prepare("SELECT id FROM posts WHERE id = ? AND status = 'approved'")
      .get(postId) as unknown as Post | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");

    const existing = db
      .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?")
      .get(user.id, postId);

    if (existing) {
      db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?").run(
        user.id,
        postId
      );
    } else {
      db.prepare(
        "INSERT INTO bookmarks (user_id, post_id, created_at) VALUES (?, ?, ?)"
      ).run(user.id, postId, Date.now());
    }

    const count = db
      .prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE post_id = ?")
      .get(postId) as unknown as { n: number };
    return ok({ bookmarked: !existing, count: Number(count.n) });
  } catch (e) {
    return fail(e);
  }
}
