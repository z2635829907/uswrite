import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Fire, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { getRecommended } from "@/lib/queries";
import { categoryLabel } from "@/lib/categories";
import { coverUrl, formatDate } from "@/lib/utils";

interface RecommendedRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_seed: string;
  category: string;
  status: string;
  views: number;
  created_at: number;
  published_at: number | null;
  like_count: number;
  comment_count: number;
  display_name: string;
  score: number;
}

export default async function RecommendedPage() {
  const posts = await getRecommended(12);
  const rows = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_seed: p.cover_seed,
    category: p.category,
    status: p.status,
    views: p.views,
    created_at: p.created_at,
    published_at: p.published_at,
    like_count: p.like_count,
    comment_count: p.comment_count,
    display_name: p.author?.display_name || "",
  }));

  const featured = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
      <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-medium tracking-widest text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
        <Sparkle size={13} weight="fill" />
        拾光推荐
      </p>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        推荐阅读
      </h1>
      <p className="mt-2 max-w-lg text-sm text-stone-500 dark:text-stone-400">
        根据点赞、评论、阅读量与发布时间综合计算，为你挑选值得一读的文章。
      </p>

      {featured && (
        <Link
          href={`/posts/${featured.slug}`}
          className="group mt-10 block overflow-hidden rounded-3xl border border-stone-200 bg-white transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
        >
          <div className="relative aspect-[21/9] overflow-hidden bg-stone-100 dark:bg-stone-800">
            <Image
              src={coverUrl(featured.cover_seed, 1400, 600)}
              alt={featured.title}
              fill
              priority
              sizes="(min-width: 1024px) 1152px, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white">
              <Fire size={13} weight="fill" />
              今日精选
            </span>
            <span className="absolute right-5 top-5 rounded-full bg-stone-950/70 px-3 py-1 text-xs text-stone-100 backdrop-blur">
              {categoryLabel(featured.category)}
            </span>
          </div>
          <div className="p-7 sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-stone-900 transition group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-400">
              {featured.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {featured.excerpt}
            </p>
            <p className="mt-4 text-xs text-stone-400">
              {featured.display_name} 路 {formatDate(featured.published_at)} 路{" "}
              {featured.like_count} 赞 路 {featured.comment_count} 评论 路{" "}
              {featured.views} 阅读
            </p>
          </div>
        </Link>
      )}

      <div className="mt-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            更多推荐
          </h2>
          <Link
            href="/posts"
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-orange-700 dark:text-stone-400 dark:hover:text-orange-400"
          >
            全部文章
            <ArrowRight size={14} />
          </Link>
        </div>
        {rest.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-sm text-stone-400 dark:border-stone-700">
            推荐池还在积累中，等更多文章审核通过吧。
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <Image
                    src={coverUrl(post.cover_seed, 600, 340)}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 340px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-stone-950/70 px-2.5 py-0.5 text-[11px] text-stone-100 backdrop-blur">
                    {categoryLabel(post.category)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 text-base font-bold tracking-tight text-stone-900 transition group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-400">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {post.excerpt}
                  </p>
                  <p className="mt-4 text-[11px] text-stone-400">
                    {post.display_name} 路 {post.like_count} 赞 路{" "}
                    {post.comment_count} 评论
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
