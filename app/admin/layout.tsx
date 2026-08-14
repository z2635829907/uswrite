import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChartBar,
  ChatCircle,
  Database,
  NotePencil,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { getSessionUser } from "@/lib/server-session";

const nav = [
  { href: "/admin", label: "仪表盘", icon: <ChartBar size={17} /> },
  { href: "/admin/posts", label: "帖子审核", icon: <NotePencil size={17} /> },
  { href: "/admin/users", label: "用户管理", icon: <UsersThree size={17} /> },
  { href: "/admin/comments", label: "评论管理", icon: <ChatCircle size={17} /> },
  { href: "/admin/rag", label: "AI 知识库", icon: <Database size={17} /> },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:py-14">
      <aside className="lg:w-52 lg:shrink-0">
        <p className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
          管理后台
        </p>
        <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-stone-400 transition hover:text-stone-900 dark:hover:text-stone-100"
          >
            <ArrowLeft size={17} />
            返回前台
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
