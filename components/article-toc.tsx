"use client";

import { useMemo } from "react";

interface TocItem {
  level: number;
  text: string;
  index: number;
}

/** 文章目录:基于正文的 Markdown 标题生成,点击跳到对应章节。 */
export function ArticleToc({ content }: { content: string }) {
  const items = useMemo<TocItem[]>(() => {
    const out: TocItem[] = [];
    let idx = 0;
    for (const line of content.split("\n")) {
      const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
      if (m) {
        const text = m[2].trim().replace(/[#*_`>]/g, "");
        out.push({ level: m[1].length, text, index: idx++ });
      }
    }
    return out;
  }, [content]);

  if (items.length === 0) return null;

  const go = (index: number) => {
    const els = document.querySelectorAll<HTMLElement>(
      ".md-body h2, .md-body h3"
    );
    els[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <details className="group mt-8 rounded-2xl border border-stone-200 bg-white/70 px-5 py-4 dark:border-stone-800 dark:bg-stone-900/70">
      <summary className="cursor-pointer select-none text-sm font-bold text-stone-900 dark:text-stone-100">
        目录
      </summary>
      <nav className="mt-3 space-y-1.5">
        {items.map((it) => (
          <button
            key={it.index}
            type="button"
            onClick={() => go(it.index)}
            style={{ paddingLeft: `${(it.level - 2) * 14 + 4}px` }}
            className="block w-full truncate text-left text-sm text-stone-600 transition hover:text-green-800 dark:text-stone-300 dark:hover:text-green-400"
          >
            {it.text}
          </button>
        ))}
      </nav>
    </details>
  );
}
