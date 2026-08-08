import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { Comment, Post } from "@/lib/types";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const commentId = Number(id);
    const comment = db
      .prepare("SELECT * FROM comments WHERE id = ?")
      .get(commentId) as unknown as Comment | undefined;
    if (!comment) throw new ResponseError(404, "评论不存在");

    const post = db
      .prepare("SELECT author_id FROM posts WHERE id = ?")
      .get(comment.post_id) as unknown as Pick<Post, "author_id"> | undefined;

    const canDelete =
      comment.user_id === user.id ||
      user.role === "admin" ||
      (post && post.author_id === user.id);
    if (!canDelete) throw new ResponseError(403, "没有权限删除这条评论");

    db.prepare("DELETE FROM comments WHERE id = ?").run(commentId);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
