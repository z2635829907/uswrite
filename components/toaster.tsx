"use client";

import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

/** 全局轻提示容器,监听 window 上的 app-toast 事件。 */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as ToastItem;
      setItems((prev) => [...prev, d]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== d.id));
      }, 2600);
    };
    window.addEventListener("app-toast", on);
    return () => window.removeEventListener("app-toast", on);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-6 z-[90] flex flex-col items-end gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur transition ${
            t.type === "error"
              ? "bg-red-600/95 text-white"
              : "bg-stone-900/92 text-stone-50 dark:bg-stone-100/95 dark:text-stone-900"
          }`}
        >
          <span aria-hidden>{t.type === "error" ? "⚠" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
