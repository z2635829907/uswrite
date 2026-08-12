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
import HeroBackground from "@/components/hero-background";
import FeaturedCarousel from "@/components/featured-carousel";
import InlineMusicPlayer from "@/components/inline-music-player";
import {
  getPublicPosts,
  getStats,
  getTopTags,
} from "@/lib/queries";
import { getSessionUser } from "@/lib/server-session";
import { coverUrl, formatDate } from "@/lib/utils";

export default async function HomePage() {
  const user = await getSessionUser();
  const { posts } = getPublicPosts({ sort: "latest", pageSize: 4 });
  const tags = getTopTags(10);
  const stats = getStats();
  const featuredPosts = posts;
  const featured = posts[0];
  const recent = posts.slice(1, 4);

  return (
    <div>
      {/* Hero：左文右图的分栏布局 */}
      <section className="relative mx-auto w-full max-w-6xl overflow-hidden px-6 pb-16 pt-14 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
        <HeroBackground />
        <div className="relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-medium tracking-widest text-white backdrop-blur">
            拾光 · 文字社区
          </p>
          <h1 className="max-w-xl text-[2.6rem] font-black leading-[1.12] tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            把想说的话，写成一篇好文章
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/85 drop-shadow">
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
              className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:border-white hover:bg-white/20 active:translate-y-px"
            >
              浏览文章
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {featuredPosts.length > 0 && (
          <div className="relative z-10">
            <Reveal delay={0.1}>
              <FeaturedCarousel posts={featuredPosts} />
            </Reveal>
          </div>
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
        <div className="grid gap-5 lg:grid-cols-2">
          {featured && (
            <Reveal>
              <Link
                href={`/posts/${featured.slug}`}
                className="group block h-full overflow-hidden rounded-3xl border border-stone-200 bg-white transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {featured.cover_seed && (
                    <Image
                      src={coverUrl(featured.cover_seed, 900, 560)}
                      alt={featured.title}
                      fill
                      sizes="(min-width: 1024px) 560px, 100vw"
                      priority
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
                    精选
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold tracking-tight text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                    {featured.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {featured.excerpt}
                  </p>
                  <p className="mt-4 text-xs text-stone-400">
                    {featured.author.display_name} · {formatDate(featured.published_at)} ·{" "}
                    {featured.like_count} 赞 · {featured.comment_count} 评论
                  </p>
                </div>
              </Link>
            </Reveal>
          )}

          <div className="grid content-start gap-4">
            {recent.map((post, i) => (
              <Reveal key={post.id} delay={0.05 + i * 0.05}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 sm:h-20 sm:w-32">
                    {post.cover_seed && (
                      <Image
                        src={coverUrl(post.cover_seed, 240, 160)}
                        alt={post.title}
                        fill
                        sizes="128px"
                        className="object-cover transition duration-500 group-hover:scale-[1.06]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-bold text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                      {post.excerpt}
                    </p>
                    <p className="mt-2 text-[11px] text-stone-400">
                      {post.author.display_name} · {formatDate(post.published_at)}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <InlineMusicPlayer />
            </Reveal>
          </div>
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
