"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PencilSimple, WarningCircle } from "@phosphor-icons/react";
import { MarkdownView } from "./markdown-view";
import { coverUrl } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import type { Post } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending: "待审核",
  approved: "已发布",
  rejected: "已驳回",
};

export function Editor({ post }: { post?: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [tags, setTags] = useState(post?.tags || "");
  const [category, setCategory] = useState(
    post?.category || "uncategorized"
  );
  const [coverSeed, setCoverSeed] = useState(post?.cover_seed || "");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState("");

  async function save(action: "draft" | "submit") {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(post ? `/api/posts/${post.id}` : "/api/posts", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          excerpt,
          tags,
          category,
          coverSeed,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      if (!post) {
        router.push("/write/" + data.id);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请稍后再试");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {post && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm dark:border-stone-800 dark:bg-stone-900">
          <span className="font-medium text-stone-900 dark:text-stone-100">
            当前状态：
          </span>
          <span
            className={
              post.status === "approved"
                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-400"
                : post.status === "rejected"
                  ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400"
                  : post.status === "pending"
                    ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            }
          >
            {STATUS_LABEL[post.status]}
          </span>
          {post.status === "rejected" && post.rejection_reason && (
            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <WarningCircle size={15} weight="fill" />
              驳回原因：{post.rejection_reason}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
              !preview
                ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-500 dark:text-stone-400"
            }`}
          >
            <PencilSimple size={14} />
            写作
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
              preview
                ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-500 dark:text-stone-400"
            }`}
          >
            <Eye size={14} />
            预览
          </button>
        </div>
        <p className="hidden text-xs text-stone-400 sm:block">
          支持 Markdown 语法，如 # 标题、**加粗**、列表与代码块
        </p>
      </div>

      {preview ? (
        <div className="rounded-3xl border border-stone-200 bg-white px-6 py-10 sm:px-10 dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            {title || "未命名文章"}
          </h1>
          <div className="mt-8">
            <MarkdownView content={content || "（正文为空）"} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题，一句话说清楚你写了什么"
            aria-label="标题"
            className="w-full rounded-2xl border border-stone-200 bg-white px-5 py-4 text-2xl font-bold tracking-tight text-stone-900 placeholder-stone-300 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-600 dark:focus:border-green-400"
          />
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-stone-600 dark:text-stone-300">
              分类
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="文章分类"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
            >
              <option value="uncategorized">未分类</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium text-stone-600 dark:text-stone-300">
                标签
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="用逗号分隔，最多 5 个，如：生活, 随笔"
                aria-label="标签"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cover" className="text-sm font-medium text-stone-600 dark:text-stone-300">
                封面
              </label>
              <input
                id="cover"
                type="text"
                value={coverSeed}
                onChange={(e) => setCoverSeed(e.target.value)}
                placeholder="输入任意英文关键词作为封面（留空则用标题）"
                aria-label="封面关键词"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="excerpt" className="text-sm font-medium text-stone-600 dark:text-stone-300">
              摘要
            </label>
            <input
              id="excerpt"
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="一两句话介绍文章内容，留空则自动截取正文"
              aria-label="摘要"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
            />
          </div>
          {coverSeed && (
            <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl(coverSeed, 1200, 480)}
                alt="封面预览"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            placeholder={"在这里写下正文…\n\n支持 Markdown：\n# 一级标题\n## 二级标题\n**加粗** *斜体*\n- 列表项\n> 引用\n`代码`"}
            aria-label="正文"
            className="editor-textarea w-full resize-y rounded-2xl border border-stone-200 bg-white px-5 py-4 leading-relaxed text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-600 dark:focus:border-green-400"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={busy !== null}
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-stone-400 hover:text-stone-900 active:translate-y-px disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-100"
        >
          {busy === "draft" ? "保存中…" : "保存草稿"}
        </button>
        <button
          type="button"
          onClick={() => save("submit")}
          disabled={busy !== null || !title.trim() || !content.trim()}
          className="rounded-full bg-green-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
        >
          {busy === "submit"
            ? "提交中…"
            : post && post.status === "approved"
              ? "保存修改"
              : "提交审核"}
        </button>
      </div>
    </div>
  );
}
