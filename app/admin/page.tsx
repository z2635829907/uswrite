import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/utils";
import { ReviewActions } from "@/components/admin-actions";
import type { Post, User } from "@/lib/types";

export default async function AdminDashboard() {
  const stats = {
    users: (db.prepare("SELECT COUNT(*) AS n FROM users").get() as unknown as { n: number }).n,
    posts: (db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'approved'").get() as unknown as { n: number }).n,
    pending: (db.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'pending'").get() as unknown as { n: number }).n,
    comments: (db.prepare("SELECT COUNT(*) AS n FROM comments").get() as unknown as { n: number }).n,
  };

  const pendingPosts = db
    .prepare(
      `SELECT p.*, u.display_name, u.username
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC
       LIMIT 10`
    )
    .all() as unknown as Array<Post & { display_name: string; username: string }>;

  const recentUsers = db
    .prepare(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT 6"
    )
    .all() as unknown as User[];

  const cards = [
    { label: "注册用户", value: stats.users, href: "/admin/users" },
    { label: "已发布文章", value: stats.posts, href: "/admin/posts?status=approved" },
    { label: "待审核", value: stats.pending, href: "/admin/posts?status=pending" },
    { label: "评论总数", value: stats.comments, href: "/admin/comments" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          仪表盘
        </h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
          社区整体情况一览
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
          >
            <p className="text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
              {Number(card.value).toLocaleString()}
            </p>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 dark:border-stone-800">
          <h2 className="font-bold text-stone-900 dark:text-stone-100">
            待审核文章
          </h2>
          <Link
            href="/admin/posts?status=pending"
            className="text-sm text-green-800 hover:underline dark:text-green-400"
          >
            全部
          </Link>
        </div>
        {pendingPosts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-400">
            审核队列是空的，写得很好。
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {pendingPosts.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/posts/${post.slug}`}
                    className="block truncate font-medium text-stone-900 hover:text-green-800 dark:text-stone-100 dark:hover:text-green-400"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {post.display_name} · {timeAgo(post.created_at)}
                  </p>
                </div>
                <ReviewActions postId={post.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-100 px-6 py-4 dark:border-stone-800">
          <h2 className="font-bold text-stone-900 dark:text-stone-100">
            最新注册
          </h2>
        </div>
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {recentUsers.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 text-sm"
            >
              <span className="text-stone-800 dark:text-stone-200">
                {u.display_name}
                <span className="ml-2 text-xs text-stone-400">@{u.username}</span>
              </span>
              <span className="text-xs text-stone-400">
                {formatDate(u.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
