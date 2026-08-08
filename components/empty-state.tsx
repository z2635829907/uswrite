import Link from "next/link";
import { Feather } from "@phosphor-icons/react/dist/ssr";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 px-8 py-20 text-center dark:border-stone-700">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-stone-800">
        <Feather size={22} />
      </span>
      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-full bg-green-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
