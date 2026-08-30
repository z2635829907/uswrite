"use client";

import { MoonStars, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      title={dark ? "切换到浅色模式" : "切换到深色模式"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:text-stone-900 active:scale-95 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
    >
      {dark ? <Sun size={17} weight="bold" /> : <MoonStars size={17} weight="bold" />}
    </button>
  );
}
