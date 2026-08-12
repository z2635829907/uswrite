import Link from "next/link";
import { db } from "@/lib/db";
import { ReviewActions } from "@/components/admin-actions";
import { timeAgo } from "@/lib/utils";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import type { Post } from "@/lib/types";

const TABS = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已驳回" },
  { key: "draft", label: "草稿" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  approved: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  draft: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  draft: "草稿",
};

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status)
    ? (sp.status as string)
    : "all";
  const category = sp.category && sp.category !== "all" ? sp.category : null;

  let where = status === "all" ? "1=1" : "p.status = ?";
  const params = status === "all" ? [] : [status];
  if (category) {
    where += " AND p.category = ?";
    params.push(category);
  }
  const rows = db
    .prepare(
      `SELECT p.*, u.display_name, u.username
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE ${where}
       ORDER BY p.updated_at DESC
       LIMIT 100`
    )
    .all(...params) as unknown as Array<
      Post & { display_name: string; username: string }
    >;

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        帖子审核
      </h1>
      <nav className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "all"
                ? "/admin/posts"
                : `/admin/posts?status=${tab.key}`
            }
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              status === tab.key
                ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-2">
        <Link
          href={status === "all" ? "/admin/posts" : `/admin/posts?status=${status}`}
          className={`rounded-full px-3.5 py-1.5 text-sm transition ${
            !category
              ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
              : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          }`}
        >
          全部分类
        </Link>
        {CATEGORIES.map((c) => {
          const href =
            status === "all"
              ? `/admin/posts?category=${c.key}`
              : `/admin/posts?status=${status}&category=${c.key}`;
          const active = category === c.key;
          return (
            <Link
              key={c.key}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                active
                  ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              {c.emoji} {c.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-stone-400">
            没有符合条件的文章。
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-400 dark:border-stone-800">
                <th className="px-6 py-3 font-medium">文章</th>
                <th className="px-4 py-3 font-medium">作者</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">提交时间</th>
                <th className="px-6 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {rows.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-[260px] px-6 py-4">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="block truncate font-medium text-stone-900 hover:text-green-800 dark:text-stone-100 dark:hover:text-green-400"
                    >
                      {post.title}
                    </Link>
                    {post.rejection_reason && (
                      <p className="mt-0.5 truncate text-xs text-red-500">
                        原因：{post.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-stone-600 dark:text-stone-300">
                    {post.display_name}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {categoryLabel(post.category)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[post.status]}`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-stone-400">
                    {timeAgo(post.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(post.status === "pending" || post.status === "rejected") && (
                      <ReviewActions postId={post.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
