import { getPublicPosts, getTopTags } from "@/lib/queries";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { TagChip } from "@/components/tag-chip";
import Link from "next/link";
import { coverUrl, formatDate } from "@/lib/utils";
import Image from "next/image";

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { posts, total, pageSize } = await getPublicPosts({ tag, page });
  const otherTags = (await getTopTags(12)).filter((t) => t.name !== tag);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
      <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        #{tag}
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        共 {total} 篇文章
      </p>

      {posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="这个标签下还没有文章"
            description="看看其他标签，或者成为第一个写这个主题的人。"
            action={{ href: "/write", label: "写一篇" }}
          />
        </div>
      ) : (
        <div className="mt-10 border-t border-stone-200 dark:border-stone-800">
          {posts.map((post) => (
            <article
              key={post.id}
              className="grid gap-5 border-b border-stone-200 py-7 sm:grid-cols-[1fr_240px] sm:items-center dark:border-stone-800"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  <Link
                    href={`/posts/${post.slug}`}
                    className="transition hover:text-green-800 dark:hover:text-green-400"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {post.excerpt}
                </p>
                <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
                  {post.author.display_name} · {formatDate(post.published_at)} ·{" "}
                  {post.like_count} 赞
                </p>
              </div>
              {post.cover_seed && (
                <Link
                  href={`/posts/${post.slug}`}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-100 sm:aspect-[16/10] dark:bg-stone-800"
                >
                  <Image
                    src={coverUrl(post.cover_seed, 480, 300)}
                    alt={post.title}
                    fill
                    sizes="(min-width: 640px) 240px, 100vw"
                    className="object-cover transition duration-500 hover:scale-[1.03]"
                  />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        href={(p) =>
          p > 1
            ? `/tags/${encodeURIComponent(tag)}?page=${p}`
            : `/tags/${encodeURIComponent(tag)}`
        }
      />

      {otherTags.length > 0 && (
        <div className="mt-16 border-t border-stone-200 pt-8 dark:border-stone-800">
          <h2 className="text-sm font-medium text-stone-500 dark:text-stone-400">
            其他标签
          </h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {otherTags.map((t) => (
              <TagChip key={t.name} tag={t.name} count={t.count} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
