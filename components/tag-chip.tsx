import Link from "next/link";

export function TagChip({ tag, count }: { tag: string; count?: number }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-600 transition hover:border-green-800 hover:text-green-800 active:scale-[0.98] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-green-400 dark:hover:text-green-400"
    >
      #{tag}
      {typeof count === "number" && (
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {count}
        </span>
      )}
    </Link>
  );
}
