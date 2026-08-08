import Link from "next/link";
import Image from "next/image";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { getPublicPosts } from "@/lib/queries";
import { coverUrl, formatDate } from "@/lib/utils";
import { getSessionUser } from "@/lib/server-session";

interface Props {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function PostsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const sort = sp.sort === "hot" ? "hot" : "latest";
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await getSessionUser();
  const { posts, total, page: currentPage, pageSize } = getPublicPosts(
    { q, sort, page },
    user?.id
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            {q ? `搜索：${q}` : "全部文章"}
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {q
              ? `找到 ${total} 篇相关文章`
              : "安静阅读，认真讨论"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <nav
            aria-label="排序"
            className="flex rounded-full border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900"
          >
            <Link
              href={q ? `/posts?q=${encodeURIComponent(q)}` : "/posts"}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                sort === "latest"
                  ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              最新
            </Link>
            <Link
              href={
                q
                  ? `/posts?q=${encodeURIComponent(q)}&sort=hot`
                  : "/posts?sort=hot"
              }
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                sort === "hot"
                  ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              热门
            </Link>
          </nav>
          <form action="/posts" method="get" className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="搜索文章…"
              aria-label="搜索文章"
              className="w-44 rounded-full border border-stone-200 bg-white py-2 pl-10 pr-4 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 focus:w-56 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
            />
          </form>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={q ? "没有找到相关文章" : "这里还很安静"}
            description={
              q
                ? "换个关键词试试，或者看看全部文章。"
                : "还没有文章发布，成为第一个写作者吧。"
            }
            action={q ? { href: "/posts", label: "查看全部" } : { href: "/write", label: "写一篇" }}
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
                <div className="flex flex-wrap items-center gap-2">
                  {post.tagsList.slice(0, 2).map((tag) => (
                    <Link
                      key={tag}
                      href={`/tags/${encodeURIComponent(tag)}`}
                      className="text-xs text-green-800 transition hover:underline dark:text-green-400"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
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
                  {post.views} 阅读 · {post.like_count} 赞
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
        page={currentPage}
        total={total}
        pageSize={pageSize}
        href={(p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (sort === "hot") params.set("sort", "hot");
          if (p > 1) params.set("page", String(p));
          const qs = params.toString();
          return qs ? `/posts?${qs}` : "/posts";
        }}
      />
    </div>
  );
}
