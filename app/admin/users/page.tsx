import Link from "next/link";
import {
  UserRoleActions,
  UserStatusActions,
} from "@/components/admin-actions";
import { Avatar } from "@/components/avatar";
import { formatDate } from "@/lib/utils";
import { getSessionUser, getSpringToken } from "@/lib/server-session";
import { getAdminUsers } from "@/lib/queries";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const me = await getSessionUser();
  const q = sp.q?.trim() || "";
  const token = await getSpringToken();
  const rows = (await getAdminUsers(q, token)) as unknown as Array<{
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_seed: string;
    role: string;
    status: string;
    created_at: number;
  }>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            用户管理
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            禁用违规账号，或设置新的管理员
          </p>
        </div>
        <form action="/admin/users" method="get" className="relative">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="搜索用户名 / 昵称 / 邮箱"
            aria-label="搜索用户"
            className="w-64 rounded-full border border-stone-200 bg-white py-2 pl-4 pr-4 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
          />
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs text-stone-400 dark:border-stone-800">
              <th className="px-6 py-3 font-medium">用户</th>
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">注册时间</th>
              <th className="px-6 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={u.display_name}
                      seed={u.avatar_seed || u.username}
                      size={32}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/users/${u.username}`}
                        className="block truncate font-medium text-stone-900 hover:text-green-800 dark:text-stone-100 dark:hover:text-green-400"
                      >
                        {u.display_name}
                        {u.id === me?.id && (
                          <span className="ml-1.5 text-xs text-stone-400">（我）</span>
                        )}
                      </Link>
                      <p className="text-xs text-stone-400">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-stone-500 dark:text-stone-400">
                  {u.email}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"
                    }`}
                  >
                    {u.role === "admin" ? "管理员" : "用户"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === "banned"
                        ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-400"
                    }`}
                  >
                    {u.status === "banned" ? "已禁用" : "正常"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-stone-400">
                  {formatDate(u.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {u.id !== me?.id && (
                    <span className="inline-flex items-center gap-2">
                      <UserRoleActions userId={u.id} role={u.role} />
                      <UserStatusActions userId={u.id} status={u.status} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
