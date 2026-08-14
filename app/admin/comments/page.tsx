import Link from "next/link";
import { CommentModerationActions } from "@/components/admin-actions";
import { timeAgo } from "@/lib/utils";
import { getAdminComments } from "@/lib/queries";
import { getSpringToken } from "@/lib/server-session";

export default async function AdminCommentsPage() {
  const token = await getSpringToken();
  const rows = (
    (await getAdminComments(token)) as Array<Record<string, unknown>>
  ).map((c) => ({
    ...c,
    display_name: (c.author as Record<string, unknown>)?.display_name || "",
    username: (c.author as Record<string, unknown>)?.username || "",
  })) as unknown as Array<{
    id: number;
    content: string;
    status: string;
    created_at: number;
    post_title: string;
    post_slug: string;
    display_name: string;
  }>;

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        评论管理
      </h1>
      <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
        隐藏违规评论，维护讨论氛围
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-stone-400">
            还没有任何评论。
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-400 dark:border-stone-800">
                <th className="px-6 py-3 font-medium">评论</th>
                <th className="px-4 py-3 font-medium">作者</th>
                <th className="px-4 py-3 font-medium">文章</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-6 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {rows.map((c) => (
                <tr key={c.id} className={c.status === "hidden" ? "opacity-55" : ""}>
                  <td className="max-w-[280px] px-6 py-4">
                    <p className="line-clamp-2 leading-relaxed text-stone-800 dark:text-stone-200">
                      {c.content}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-stone-600 dark:text-stone-300">
                    {c.display_name}
                  </td>
                  <td className="max-w-[180px] px-4 py-4">
                    <Link
                      href={`/posts/${c.post_slug}`}
                      className="block truncate text-stone-500 hover:text-green-800 hover:underline dark:text-stone-400 dark:hover:text-green-400"
                    >
                      {c.post_title}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "hidden"
                          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-400"
                      }`}
                    >
                      {c.status === "hidden" ? "已隐藏" : "显示中"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-stone-400">
                    {timeAgo(c.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <CommentModerationActions
                      commentId={c.id}
                      status={c.status}
                    />
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
