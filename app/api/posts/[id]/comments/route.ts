import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { commentSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { Post } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const postId = Number(id);
    const post = db
      .prepare("SELECT id, author_id, title FROM posts WHERE id = ? AND status = 'approved'")
      .get(postId) as unknown as Pick<Post, "id" | "author_id" | "title"> | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");

    const body = commentSchema.parse(await req.json());
    const content = body.content.trim();
    const now = Date.now();
    const info = db
      .prepare(
        "INSERT INTO comments (post_id, user_id, content, status, created_at) VALUES (?, ?, ?, 'visible', ?)"
      )
      .run(postId, user.id, content, now);

    if (post.author_id !== user.id) {
      db.prepare(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, content, read, created_at)
         VALUES (?, ?, 'comment', ?, ?, 0, ?)`
      ).run(
        post.author_id,
        user.id,
        postId,
        `${user.display_name} 评论了《${post.title}》`,
        now
      );
    }

    return ok({
      comment: {
        id: Number(info.lastInsertRowid),
        content,
        created_at: now,
        author: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_seed: user.avatar_seed,
        },
      },
    });
  } catch (e) {
    return fail(e);
  }
}
