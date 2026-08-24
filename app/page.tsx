import Link from "next/link";
import { Feather, Heart, ChatCircle, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { TagChip } from "@/components/tag-chip";
import HeroFullscreen from "@/components/hero-fullscreen";
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
    <div className="relative">
      {/* 全屏首屏背景 */}
      <HeroFullscreen />

      {/* 内容区:从首屏下方滑上来盖住背景 */}
      <div className="relative z-10 mt-[100vh] rounded-t-[2.25rem] border-t border-stone-200 bg-[var(--paper)] shadow-[0_-28px_56px_-28px_rgba(0,0,0,0.4)] dark:border-stone-800">
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
                你的第一篇文章,从这里开始
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-400">
                注册即写。发布后经过审核,通过就能被所有人看到。
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
    </div>
  );
}
