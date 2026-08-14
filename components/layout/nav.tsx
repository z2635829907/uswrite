"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

const links = [
  { href: "/posts", label: "文章" },
  { href: "/posts?sort=hot", label: "热门" },
  { href: "/recommended", label: "推荐" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-6 md:flex">
      {links.map((link) => {
        const active =
          link.href === "/posts"
            ? pathname === "/posts" || pathname.startsWith("/posts/")
            : pathname.startsWith("/posts") &&
              (pathname.includes("sort=hot") || false);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-sm font-semibold text-stone-900 dark:text-stone-100"
                : "text-sm text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            }
          >
            {link.label}
          </Link>
        );
      })}
      <div className="relative group">
        <button
          type="button"
          className={`flex items-center gap-1 text-sm transition ${
            pathname.startsWith("/categories")
              ? "font-semibold text-stone-900 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          }`}
        >
          分类
          <CaretDown size={12} />
        </button>
        <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
          <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-900">
            <Link
              href="/categories"
              className="block rounded-xl px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              全部分类
            </Link>
            <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                href={`/categories/${c.key}`}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                <span>{c.emoji}</span>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Link
        href="/assistant"
        className={
          pathname === "/assistant" || pathname.startsWith("/assistant")
            ? "text-sm font-semibold text-stone-900 dark:text-stone-100"
            : "text-sm text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        }
      >
        AI 助手
      </Link>
    </nav>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="菜单"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-300"
      >
        {open ? <X size={20} /> : <List size={20} />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-16 border-b border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
          <nav className="flex flex-col gap-1">
            {[
              { href: "/", label: "首页" },
              { href: "/posts", label: "文章" },
              { href: "/posts?sort=hot", label: "热门" },
              { href: "/recommended", label: "推荐" },
              { href: "/categories", label: "分类" },
              { href: "/assistant", label: "AI 助手" },
              ...CATEGORIES.map((c) => ({
                href: `/categories/${c.key}`,
                label: `${c.emoji} ${c.label}`,
              })),
              { href: "/login", label: "登录" },
              { href: "/register", label: "注册" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-base ${
                  pathname === link.href
                    ? "bg-stone-200/60 font-semibold dark:bg-stone-800"
                    : "text-stone-600 dark:text-stone-300"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
