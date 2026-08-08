import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Feather,
  Heart,
  ChatCircle,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { TagChip } from "@/components/tag-chip";
import {
  getPublicPosts,
  getStats,
  getTopTags,
} from "@/lib/queries";
import { formatDate, coverUrl } from "@/lib/utils";
import { getSessionUser } from "@/lib/server-session";

export default async function HomePage() {
  const user = await getSessionUser();
  const { posts } = getPublicPosts({ sort: "latest", pageSize: 3 });
  const tags = getTopTags(10);
  const stats = getStats();
  const featured = posts.slice(0, 1)[0];

  return (
    <div>
      {/* Hero：左文右图的分栏布局 */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium tracking-widest text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
            拾光 · 文字社区
          </p>
          <h1 className="max-w-xl text-[2.6rem] font-black leading-[1.12] tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl lg:text-6xl">
            把想说的话，写成一篇好文章
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-stone-500 dark:text-stone-400">
            发布你的文字，随时编辑，和读者认真讨论。每一篇投稿都经过人工审核，让这里保持安静、干净。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={user ? "/write" : "/register"}
              className="inline-flex items-center gap-2 rounded-full bg-green-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
            >
              <Feather size={16} weight="bold" />
              {user ? "开始写作" : "免费注册"}
            </Link>
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-900 active:translate-y-px dark:border-stone-700 dark:text-stone-200 dark:hover:text-white"
            >
              浏览文章
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {featured && (
          <Reveal delay={0.1}>
            <Link
              href={`/posts/${featured.slug}`}
              className="group block overflow-hidden rounded-3xl border border-stone-200 bg-white transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                <Image
                  src={coverUrl(featured.cover_seed, 1000, 640)}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  priority
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute left-4 top-4 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
                  最新
                </span>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold tracking-tight text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                  {featured.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {featured.excerpt}
                </p>
                <p className="mt-4 text-xs text-stone-400">
                  {featured.author.display_name} · {formatDate(featured.published_at)}
                </p>
              </div>
            </Link>
          </Reveal>
        )}
      </section>

      {/* 热门标签 */}
      {tags.length > 0 && (
        <section className="border-y border-stone-200 bg-stone-100/60 py-12 dark:border-stone-800 dark:bg-stone-900/40">
          <div className="mx-auto w-full max-w-6xl px-6">
            <Reveal>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                大家正在写
              </h2>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {tags.map((tag) => (
                  <TagChip key={tag.name} tag={tag.name} count={tag.count} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* 最新文章：编号式编辑列表 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              最新文章
            </h2>
            <Link
              href="/posts"
              className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-green-800 dark:text-stone-400 dark:hover:text-green-400"
            >
              查看全部
              <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>
        <div className="border-t border-stone-200 dark:border-stone-800">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={i * 0.05}>
              <Link
                href={`/posts/${post.slug}`}
                className="group grid gap-4 border-b border-stone-200 py-6 transition sm:grid-cols-[3rem_1fr] dark:border-stone-800"
              >
                <span className="font-mono text-sm text-stone-300 dark:text-stone-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                    {post.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-1 text-sm text-stone-500 dark:text-stone-400">
                    {post.excerpt}
                  </p>
                  <p className="mt-2.5 text-xs text-stone-400 dark:text-stone-500">
                    {post.author.display_name} · {formatDate(post.published_at)} ·{" "}
                    {post.like_count} 赞 · {post.comment_count} 评论
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 真实数据条 */}
      <section className="border-y border-stone-200 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-6 py-12 sm:grid-cols-4">
          {[
            { value: stats.posts, label: "篇文章", icon: null },
            { value: stats.users, label: "位作者", icon: <UserCircle size={20} /> },
            { value: stats.likes, label: "次点赞", icon: <Heart size={20} weight="fill" /> },
            { value: stats.comments, label: "条评论", icon: <ChatCircle size={20} /> },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 py-2 text-center">
              <span className="text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                {item.value}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                {item.icon}
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 加入社区 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <Reveal>
          <div className="rounded-[2rem] bg-stone-900 px-8 py-14 text-center dark:bg-stone-800">
            <h2 className="text-2xl font-black tracking-tight text-stone-50 sm:text-3xl">
              你的第一篇文字，从这里开始
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-400">
              注册即写。发布后会经过审核，通过就能被所有人看到。
            </p>
            <Link
              href={user ? "/write" : "/register"}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-green-400 px-7 py-3 text-sm font-bold text-stone-950 transition hover:bg-green-300 active:translate-y-px"
            >
              <Feather size={16} weight="bold" />
              {user ? "去写一篇" : "立即注册"}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
