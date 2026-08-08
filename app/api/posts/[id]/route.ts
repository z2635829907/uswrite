import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { postSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { parseTags } from "@/lib/utils";
import { ResponseError } from "@/lib/auth";
import type { Post } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const postId = Number(id);
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(postId) as unknown as Post | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");
    if (post.author_id !== user.id)
      throw new ResponseError(403, "只能编辑自己的文章");

    const body = postSchema.parse(await req.json());
    const title = body.title.trim();
    const content = body.content.trim();
    const excerpt = body.excerpt.trim();
    const tags = parseTags(body.tags).join(",");
    const coverSeed = body.coverSeed.trim() || title.slice(0, 20);

    let status = post.status;
    if (body.action === "submit") {
      if (content.length < 50)
        throw new ResponseError(400, "正文内容太短了，至少写 50 个字再提交审核");
      if (status === "draft" || status === "rejected") status = "pending";
    }

    db.prepare(
      `UPDATE posts
       SET title = ?, content = ?, excerpt = ?, tags = ?, cover_seed = ?, status = ?, rejection_reason = '', updated_at = ?
       WHERE id = ?`
    ).run(
      title,
      content,
      excerpt,
      tags,
      coverSeed,
      status,
      Date.now(),
      postId
    );

    return ok({ status });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const postId = Number(id);
    const post = db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .get(postId) as unknown as Post | undefined;
    if (!post) throw new ResponseError(404, "文章不存在");
    if (post.author_id !== user.id && user.role !== "admin")
      throw new ResponseError(403, "没有权限删除这篇文章");

    db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
    return ok();
  } catch (e) {
    return fail(e);
  }
}
