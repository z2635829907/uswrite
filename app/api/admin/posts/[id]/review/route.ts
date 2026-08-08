import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { ResponseError } from "@/lib/auth";
import type { Post } from "@/lib/types";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(200).optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const postId = Number(id);
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(postId) as unknown as Post | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");

    const body = schema.parse(await req.json());
    const now = Date.now();

    if (body.decision === "approve") {
      db.prepare(
        `UPDATE posts SET status = 'approved', rejection_reason = '', updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?`
      ).run(now, now, postId);
      db.prepare(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, content, read, created_at)
         VALUES (?, ?, 'review', ?, ?, 0, ?)`
      ).run(
        post.author_id,
        admin.id,
        postId,
        "你的文章已通过审核，现在所有人可以看到它了",
        now
      );
    } else {
      db.prepare(
        `UPDATE posts SET status = 'rejected', rejection_reason = ?, updated_at = ? WHERE id = ?`
      ).run(body.reason || "内容不符合社区规范", now, postId);
      db.prepare(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, content, read, created_at)
         VALUES (?, ?, 'review', ?, ?, 0, ?)`
      ).run(
        post.author_id,
        admin.id,
        postId,
        `你的文章未通过审核：${body.reason || "内容不符合社区规范"}`,
        now
      );
    }

    return ok({ status: body.decision === "approve" ? "approved" : "rejected" });
  } catch (e) {
    return fail(e);
  }
}
