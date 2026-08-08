import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export function Pagination({
  page,
  total,
  pageSize,
  href,
}: {
  page: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-12 flex items-center justify-center gap-3" aria-label="分页">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
        >
          <ArrowLeft size={15} />
          上一页
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2 text-sm text-stone-300 dark:text-stone-600">
          <ArrowLeft size={15} />
          上一页
        </span>
      )}
      <span className="text-sm text-stone-400 dark:text-stone-500">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link
          href={href(page + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
        >
          下一页
          <ArrowRight size={15} />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2 text-sm text-stone-300 dark:text-stone-600">
          下一页
          <ArrowRight size={15} />
        </span>
      )}
    </nav>
  );
}
