import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight">{siteConfig.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {siteConfig.description}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
          <Link className="transition hover:text-stone-900 dark:hover:text-stone-100" href="/posts">
            全部文章
          </Link>
          <Link className="transition hover:text-stone-900 dark:hover:text-stone-100" href="/login">
            登录
          </Link>
          <Link className="transition hover:text-stone-900 dark:hover:text-stone-100" href="/register">
            注册
          </Link>
        </nav>
      </div>
      <div className="border-t border-stone-200 py-5 text-center text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
        拾光 · 记录与分享，让每个想法都有回响
      </div>
    </footer>
  );
}
