import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ChatCircle,
  Eye,
  PencilSimple,
  ArrowLeft,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { MarkdownView } from "@/components/markdown-view";
import { LikeButton } from "@/components/like-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentSection } from "@/components/comment-section";
import { ViewTracker } from "@/components/view-tracker";
import { DeletePostButton } from "@/components/delete-post-button";
import { getPostBySlug, getRelatedPosts, getVisibleComments } from "@/lib/queries";
import { coverUrl, formatDate } from "@/lib/utils";
import { getSessionUser, getSpringToken } from "@/lib/server-session";
import type { PostWithMeta } from "@/lib/types";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  const token = await getSpringToken();
  let post: PostWithMeta | null = null;
  try {
    post = await getPostBySlug(slug, token);
  } catch {
    post = null;
  }

  const isOwner = post && user && post.author_id === user.id;
  const canView =
    post &&
    (post.status === "approved" || isOwner || (user && user.role === "admin"));

  if (!post || !canView) notFound();

  const comments = await getVisibleComments(post.id);
  const related = await getRelatedPosts(post, token);
  const readMinutes = Math.max(1, Math.round(post.content.length / 400));

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
      <ViewTracker postId={post.id} />

      <Link
        href="/posts"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ArrowLeft size={15} />
        返回文章列表
      </Link>

      {post.status !== "approved" && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          {post.status === "draft" && "这是你的草稿，只有你自己能看到。"}
          {post.status === "pending" && "这篇文章正在等待管理员审核。"}
          {post.status === "rejected" &&
            `这篇文章未通过审核：${post.rejection_reason || "内容不符合社区规范"}`}
        </div>
      )}

      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          {post.tagsList.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="text-xs font-medium text-green-800 transition hover:underline dark:text-green-400"
            >
              #{tag}
            </Link>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-black leading-[1.2] tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          {post.title}
        </h1>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-stone-200 py-4 dark:border-stone-800">
        <Link
          href={`/users/${post.author.username}`}
          className="flex items-center gap-3"
        >
          <Avatar
            name={post.author.display_name}
            seed={post.author.avatar_seed || post.author.username}
            size={40}
          />
          <span>
            <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">
              {post.author.display_name}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-400">
              <span>{formatDate(post.published_at)}</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen size={13} />
                约 {readMinutes} 分钟
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye size={13} />
                {post.views}
              </span>
            </span>
          </span>
        </Link>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              href={`/write/${post.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              <PencilSimple size={15} />
              编辑
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        )}
      </div>

      {post.cover_seed && (
        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl bg-stone-100 dark:bg-stone-800">
          <Image
            src={coverUrl(post.cover_seed, 1280, 720)}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-10">
        <MarkdownView content={post.content} />
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-y border-stone-200 py-5 dark:border-stone-800">
        <LikeButton
          postId={post.id}
          initialLiked={post.liked_by_me}
          initialCount={post.like_count}
          signedIn={!!user}
        />
        <BookmarkButton
          postId={post.id}
          initialBookmarked={post.bookmarked_by_me}
          signedIn={!!user}
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-stone-400">
          <ChatCircle size={16} />
          {post.comment_count} 条评论
        </span>
      </div>

      {/* 作者卡片 */}
      <div className="mt-10 flex flex-wrap items-center gap-5 rounded-3xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <Avatar
          name={post.author.display_name}
          seed={post.author.avatar_seed || post.author.username}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/users/${post.author.username}`}
            className="text-lg font-bold text-stone-900 hover:text-green-800 dark:text-stone-100 dark:hover:text-green-400"
          >
            {post.author.display_name}
          </Link>
          <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {post.author.bio || "这位作者还没有写简介。"}
          </p>
          {post.author.website && (
            <a
              href={post.author.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-green-800 hover:underline dark:text-green-400"
            >
              <LinkSimple size={13} />
              {post.author.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        <Link
          href={`/users/${post.author.username}`}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-100"
        >
          查看主页
        </Link>
      </div>

      {/* 相关文章 */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            相关文章
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/posts/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
              >
                <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-800">
                  <Image
                    src={coverUrl(r.cover_seed, 400, 240)}
                    alt={r.title}
                    fill
                    sizes="(min-width: 640px) 220px, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 dark:text-stone-100">
                    {r.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CommentSection
        postId={post.id}
        initialComments={comments}
        signedIn={!!user}
        currentUserId={user?.id ?? null}
        isPostAuthor={isOwner ?? false}
        isAdmin={user?.role === "admin"}
      />
    </article>
  );
}
