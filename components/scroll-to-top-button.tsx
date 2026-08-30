"use client";

import { useEffect, useState } from "react";

/** 长页面回到顶部的悬浮按钮。 */
export function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="回到顶部"
      title="回到顶部"
      className="fixed bottom-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white/90 text-lg text-stone-600 shadow-lg transition hover:text-green-800 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:text-green-400"
    >
      ↑
    </button>
  );
}
