import Link from "next/link";
import {
  ArrowRight,
  Feather,
  Heart,
  ChatCircle,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { TagChip } from "@/components/tag-chip";
import VideoHeroBackground from "@/components/video-hero-background";
import LatestPosts from "@/components/latest-posts";
import { getPublicPosts, getStats, getTopTags } from "@/lib/queries";
import { getSessionUser } from "@/lib/server-session";

export default async function HomePage() {
  const user = await getSessionUser();
  const { posts: latestPosts } = await getPublicPosts({
    sort: "latest",
    pageSize: 16,
  });
  const tags = await getTopTags(10);
  const stats = await getStats();

  return (
    <div>
      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-6xl items-center justify-center overflow-hidden px-6 pb-16 pt-14 lg:min-h-[600px] lg:pb-24 lg:pt-20">
        <VideoHeroBackground />
        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-medium tracking-widest text-white backdrop-blur">
            拾光 · 文字社区
          </p>
          <h1 className="max-w-2xl text-[2.6rem] font-black leading-[1.12] tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            把想说的话，写成一篇好文章
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 drop-shadow">
            发布你的文字，随时编辑，和读者认真讨论。每一篇投稿都经过人工审核，让这里保持安静、干净。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
      </section>

      {/* 最新文章 */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <LatestPosts posts={latestPosts} />
      </section>

      {/* 大家正在写 */}
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

      {/* 真实数据 */}
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
              注册即写。发布后经过审核，通过就能被所有人看到。
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
