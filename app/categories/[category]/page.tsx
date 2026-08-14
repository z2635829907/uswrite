import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  categoryLabel,
  isCategoryKey,
} from "@/lib/categories";
import { getPublicPosts } from "@/lib/queries";
import { coverUrl, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export default async function CategoryPostsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const key = decodeURIComponent(category);
  if (key !== DEFAULT_CATEGORY && !isCategoryKey(key)) notFound();

  const { posts } = await getPublicPosts({
    category: key,
    sort: "latest",
    pageSize: 24,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
      <Link
        href="/categories"
        className="text-sm text-stone-500 transition hover:text-green-800 dark:text-stone-400 dark:hover:text-green-400"
      >
        ← 返回全部分类
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        {categoryLabel(key)}
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        共 {posts.length} 篇相关文章
      </p>

      {posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="这个分类还没有文章"
            description="成为第一个写下这个主题的人吧。"
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
                  {post.author.display_name} 路 {formatDate(post.published_at)} 路{" "}
                  {post.views} 阅读 路 {post.like_count} 赞
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

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          其他分类
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.key !== key).map((c) => (
            <Link
              key={c.key}
              href={`/categories/${c.key}`}
              className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-600 transition hover:border-green-800 hover:text-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-green-400 dark:hover:text-green-400"
            >
              {c.emoji} {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
