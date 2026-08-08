"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { Avatar } from "./avatar";
import { timeAgo } from "@/lib/utils";
import type { Comment } from "@/lib/types";

export function CommentSection({
  postId,
  initialComments,
  signedIn,
  currentUserId,
  isPostAuthor,
  isAdmin,
}: {
  postId: number;
  initialComments: Comment[];
  signedIn: boolean;
  currentUserId: number | null;
  isPostAuthor: boolean;
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) {
      router.push("/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "评论失败");
      setComments((prev) => [...prev, data.comment]);
      setContent("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "评论失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: number) {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      router.refresh();
    }
  }

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
        评论
        <span className="text-sm font-normal text-stone-400">
          {comments.length}
        </span>
      </h2>

      <form onSubmit={submit} className="mt-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder={signedIn ? "写下你的想法…" : "登录后即可发表评论"}
          aria-label="评论内容"
          className="w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="rounded-full bg-green-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
          >
            {busy ? "发送中…" : "发表评论"}
          </button>
        </div>
      </form>

      <ul className="mt-8 space-y-6">
        {comments.length === 0 && (
          <li className="rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center text-sm text-stone-400 dark:border-stone-700">
            还没有评论，来坐第一排吧。
          </li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="flex gap-3.5 border-b border-stone-100 pb-6 last:border-0 dark:border-stone-800"
          >
            <Avatar
              name={c.author?.display_name || "用户"}
              seed={c.author?.avatar_seed || ""}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {c.author?.display_name}
                  </span>
                  <span className="text-xs text-stone-400">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                {(c.user_id === currentUserId || isPostAuthor || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="删除评论"
                    className="rounded-full p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  >
                    <Trash size={15} />
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {c.content}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
