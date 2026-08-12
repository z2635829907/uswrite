import Link from "next/link";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import { db } from "@/lib/db";

export default async function CategoriesPage() {
  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS n
       FROM posts
       WHERE status = 'approved'
       GROUP BY category`
    )
    .all() as unknown as Array<{ category: string; n: number }>;
  const counts = new Map(rows.map((r) => [r.category, Number(r.n)]));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-16">
      <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        文章分类
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        选择一个分类，浏览这个主题下的文章。
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const count = counts.get(c.key) ?? 0;
          return (
            <Link
              key={c.key}
              href={`/categories/${c.key}`}
              className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-green-800 hover:shadow-lg hover:shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-green-400"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl dark:bg-stone-800">
                {c.emoji}
              </span>
              <span>
                <span className="block text-base font-bold text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                  {c.label}
                </span>
                <span className="mt-0.5 block text-xs text-stone-400">
                  {count} 篇文章
                </span>
              </span>
            </Link>
          );
        })}
        <Link
          href={`/categories/${DEFAULT_CATEGORY}`}
          className="group flex items-center gap-4 rounded-2xl border border-dashed border-stone-300 p-5 transition hover:-translate-y-0.5 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl dark:bg-stone-800">
            📦
          </span>
          <span>
            <span className="block text-base font-bold text-stone-900 dark:text-stone-100">
              未分类
            </span>
            <span className="mt-0.5 block text-xs text-stone-400">
              {counts.get(DEFAULT_CATEGORY) ?? 0} 篇文章
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
