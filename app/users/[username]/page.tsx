import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarBlank, Heart, LinkSimple, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/avatar";
import { getUserByUsername, getUserPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { getSessionUser, getSpringToken } from "@/lib/server-session";
import Image from "next/image";
import { coverUrl } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已发布",
  rejected: "已驳回",
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getSessionUser();
  const token = await getSpringToken();
  const profile = await getUserByUsername(username);
  if (!profile) notFound();

  const isSelf = user?.id === profile.id;
  const posts = await getUserPosts(username, token, isSelf);
  const likesReceived = posts.reduce((sum, p) => sum + p.like_count, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 lg:py-16">
      <div className="flex flex-wrap items-center gap-6">
        <Avatar
          name={profile.display_name}
          seed={profile.avatar_seed || profile.username}
          size={88}
          className="text-3xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              {profile.display_name}
            </h1>
            <span className="text-sm text-stone-400">@{profile.username}</span>
            {profile.role === "admin" && (
              <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                管理员
              </span>
            )}
          </div>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {profile.bio || "这个人很安静，还没有写简介。"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
            <span className="inline-flex items-center gap-1">
              <CalendarBlank size={13} />
              {formatDate(profile.created_at)} 加入
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart size={13} weight="fill" />
              收到 {likesReceived} 个赞
            </span>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-800 hover:underline dark:text-green-400"
              >
                <LinkSimple size={13} />
                个人网站
              </a>
            )}
          </div>
        </div>
        {isSelf && (
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-100"
          >
            <PencilSimple size={15} />
            编辑资料
          </Link>
        )}
      </div>

      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          文章
          <span className="ml-2 text-sm font-normal text-stone-400">
            {posts.filter((p) => p.status === "approved").length} 篇已发布
          </span>
        </h2>
      </div>

      <div className="mt-6 border-t border-stone-200 dark:border-stone-800">
        {posts.length === 0 && (
          <p className="py-14 text-center text-sm text-stone-400">
            {isSelf ? "你还没有写过文章，去写第一篇吧。" : "这位作者还没有发布文章。"}
          </p>
        )}
        {posts.map((post) => (
          <article
            key={post.id}
            className="grid gap-5 border-b border-stone-200 py-6 sm:grid-cols-[1fr_200px] sm:items-center dark:border-stone-800"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {post.status !== "approved" && (
                  <span
                    className={
                      post.status === "pending"
                        ? "rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        : post.status === "rejected"
                          ? "rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-300"
                    }
                  >
                    {STATUS_LABEL[post.status]}
                  </span>
                )}
                {post.tagsList.slice(0, 2).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="text-xs text-green-800 hover:underline dark:text-green-400"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
              <h3 className="mt-1.5 text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                <Link
                  href={`/posts/${post.slug}`}
                  className="transition hover:text-green-800 dark:hover:text-green-400"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                {post.status === "approved"
                  ? formatDate(post.published_at)
                  : `更新于 ${formatDate(post.updated_at)}`}
                {" · "}
                {post.like_count} 赞
                {isSelf && post.status === "rejected" && post.rejection_reason && (
                  <span className="text-red-500"> · 未通过：{post.rejection_reason}</span>
                )}
              </p>
            </div>
            {post.cover_seed && (
              <Link
                href={`/posts/${post.slug}`}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100 sm:aspect-[16/9] dark:bg-stone-800"
              >
                <Image
                  src={coverUrl(post.cover_seed, 400, 240)}
                  alt={post.title}
                  fill
                  sizes="(min-width: 640px) 200px, 100vw"
                  className="object-cover"
                />
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
