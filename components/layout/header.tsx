import Link from "next/link";
import {
  Bell,
  BookmarkSimple,
  Feather,
  GearSix,
  House,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import { siteConfig } from "@/lib/site";
import type { User } from "@/lib/types";
import { NavLinks, MobileNav } from "./nav";

export function Header({
  user,
  unread,
}: {
  user: User | null;
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-baseline gap-1.5 text-xl font-black tracking-tight"
          >
            {siteConfig.name}
            <span className="text-xs font-medium tracking-widest text-stone-400 dark:text-stone-500">
              {siteConfig.nameLatin}
            </span>
          </Link>
          <NavLinks />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/notifications"
                aria-label="通知"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link
                href="/write"
                className="hidden items-center gap-1.5 rounded-full bg-green-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px sm:inline-flex dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
              >
                <Feather size={15} weight="bold" />
                写文章
              </Link>
              <details className="menu relative">
                <summary className="cursor-pointer rounded-full transition hover:opacity-80">
                  <Avatar
                    name={user.display_name}
                    seed={user.avatar_seed || user.username}
                    size={34}
                  />
                </summary>
                <div className="menu-panel absolute right-0 top-11 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
                  <div className="border-b border-stone-100 px-3 py-2.5 dark:border-stone-800">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {user.display_name}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      @{user.username}
                      {user.role === "admin" && " · 管理员"}
                    </p>
                  </div>
                  <MenuItem
                    href={`/users/${user.username}`}
                    icon={<UserCircle size={17} />}
                    label="我的主页"
                  />
                  <MenuItem
                    href="/favorites"
                    icon={<BookmarkSimple size={17} />}
                    label="我的收藏"
                  />
                  <MenuItem
                    href="/settings"
                    icon={<GearSix size={17} />}
                    label="账号设置"
                  />
                  {user.role === "admin" && (
                    <MenuItem
                      href="/admin"
                      icon={<House size={17} />}
                      label="管理后台"
                    />
                  )}
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <SignOut size={17} />
                      退出登录
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-green-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
              >
                注册
              </Link>
            </div>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      {icon}
      {label}
    </Link>
  );
}
