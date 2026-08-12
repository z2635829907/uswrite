import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { postSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/api";
import { randomSlug, parseTags } from "@/lib/utils";
import { ResponseError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = postSchema.parse(await req.json());
    const title = body.title.trim();
    const content = body.content.trim();
    const excerpt = body.excerpt.trim();
    const tags = parseTags(body.tags).join(",");
    const coverSeed = body.coverSeed.trim() || title.slice(0, 20);
    const category = body.category;
    const status = body.action === "submit" ? "pending" : "draft";

    if (status === "pending" && content.length < 50)
      throw new ResponseError(400, "正文内容太短了，至少写 50 个字再提交审核");

    const now = Date.now();
    const slug = randomSlug();
    const info = db
      .prepare(
        `INSERT INTO posts (author_id, slug, title, content, excerpt, cover_seed, tags, category, status, views, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`
      )
      .run(
        user.id,
        slug,
        title,
        content,
        excerpt,
        coverSeed,
        tags,
        category,
        status,
        now,
        now
      );

    return ok({ id: Number(info.lastInsertRowid), slug, status });
  } catch (e) {
    return fail(e);
  }
}
