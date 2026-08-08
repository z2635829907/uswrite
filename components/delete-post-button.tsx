"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react";

export function DeletePostButton({ postId }: { postId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/posts");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <span className="text-sm text-red-600 dark:text-red-400">确认删除？</span>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            删除
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300"
          >
            取消
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:border-red-300 hover:text-red-600 dark:border-stone-700 dark:text-stone-300 dark:hover:text-red-400"
        >
          <Trash size={15} />
          删除文章
        </button>
      )}
    </>
  );
}
