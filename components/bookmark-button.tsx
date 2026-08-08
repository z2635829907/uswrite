"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookmarkButton({
  postId,
  initialBookmarked,
  signedIn,
}: {
  postId: number;
  initialBookmarked: boolean;
  signedIn: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookmarked(data.bookmarked);
      router.refresh();
    } catch {
      setBookmarked(initialBookmarked);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "取消收藏" : "收藏"}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
        bookmarked
          ? "border-green-800 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-950/50 dark:text-green-400"
          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
      }`}
    >
      <BookmarkSimple size={17} weight={bookmarked ? "fill" : "regular"} />
      {bookmarked ? "已收藏" : "收藏"}
    </button>
  );
}
