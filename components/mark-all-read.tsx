"use client";

import { Check } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllRead() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function run() {
    setBusy(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    router.refresh();
    setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900 disabled:opacity-50 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
    >
      <Check size={15} />
      全部标为已读
    </button>
  );
}
