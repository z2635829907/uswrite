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
      .prepare("SELECT id, author_id, status FROM posts WHERE id = ?")
      .get(postId) as unknown as Post | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");
    if (post.status !== "approved" && post.author_id !== user.id)
      throw new ResponseError(404, "文章不存在");

    const existing = db
      .prepare("SELECT id FROM likes WHERE user_id = ? AND post_id = ?")
      .get(user.id, postId);

    if (existing) {
      db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(
        user.id,
        postId
      );
    } else {
      db.prepare(
        "INSERT INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)"
      ).run(user.id, postId, Date.now());
      if (post.author_id !== user.id) {
        db.prepare(
          `INSERT INTO notifications (user_id, actor_id, type, post_id, content, read, created_at)
           VALUES (?, ?, 'like', ?, ?, 0, ?)`
        ).run(post.author_id, user.id, postId, `${user.display_name} 赞了你的文章`, Date.now());
      }
    }

    const count = db
      .prepare("SELECT COUNT(*) AS n FROM likes WHERE post_id = ?")
      .get(postId) as unknown as { n: number };
    return ok({ liked: !existing, count: Number(count.n) });
  } catch (e) {
    return fail(e);
  }
}
