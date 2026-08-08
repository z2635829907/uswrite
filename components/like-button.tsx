"use client";

import { Heart } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  signedIn,
}: {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiked(data.liked);
      setCount(data.count);
      router.refresh();
    } catch {
      setLiked(initialLiked);
      setCount(initialCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "取消点赞" : "点赞"}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
        liked
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
          : "border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-800 dark:text-stone-300 dark:hover:text-stone-100"
      }`}
    >
      <Heart size={17} weight={liked ? "fill" : "regular"} />
      {count > 0 ? count : "点赞"}
    </button>
  );
}
