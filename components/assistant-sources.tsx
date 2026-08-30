"use client";

import Link from "next/link";
import type { Source } from "./use-assistant-chat";

/** AI 回答下面的参考来源:文章可点击,知识条目仅供展示(用虚线+📚 区分)。 */
export function AssistantSources({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {sources.map((s, j) =>
        s.slug ? (
          <Link
            key={j}
            href={`/posts/${s.slug}`}
            target="_blank"
            title="查看这篇文章"
            className="max-w-[140px] truncate rounded-full border border-green-800/30 bg-green-800/10 px-2 py-0.5 text-[10px] text-green-800 transition hover:bg-green-800/20 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400"
          >
            {s.title}
          </Link>
        ) : (
          <span
            key={j}
            title="知识库条目，仅供展示"
            className="max-w-[140px] truncate rounded-full border border-dashed border-teal-700/40 bg-teal-700/5 px-2 py-0.5 text-[10px] text-teal-800 dark:border-teal-400/40 dark:bg-teal-400/5 dark:text-teal-300"
          >
            📚 {s.title}
          </span>
        )
      )}
    </div>
  );
}
