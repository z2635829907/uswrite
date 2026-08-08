"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { useState } from "react";

const links = [
  { href: "/posts", label: "文章" },
  { href: "/posts?sort=hot", label: "热门" },
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
