"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, NotePencil, Plus, Trash, X } from "@phosphor-icons/react";
import { formatDate } from "@/lib/utils";
import type { RagEntry } from "@/lib/queries";

export function RagEntryManager({ initialEntries }: { initialEntries: RagEntry[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<RagEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  async function act(
    url: string,
    method: string,
    body?: { title: string; content: string }
  ) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || busy) return;
    await act("/api/admin/rag", "POST", { title, content });
    setTitle("");
    setContent("");
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim() || !editContent.trim() || busy) return;
    await act(`/api/admin/rag/${id}`, "PATCH", { title: editTitle, content: editContent });
    setEditingId(null);
  }

  function startEdit(entry: RagEntry) {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 新增知识条目 */}
      <form
        onSubmit={add}
        className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
          <Plus size={16} />
          新增知识条目
        </h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题，例如：uswrite社区介绍"
          aria-label="知识条目标题"
          className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="知识内容，AI 会基于这些内容回答用户问题"
          aria-label="知识条目内容"
          className="mt-3 w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={busy || !title.trim() || !content.trim()}
            className="rounded-full bg-green-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-900 disabled:opacity-50 dark:bg-green-400 dark:text-stone-950"
          >
            添加
          </button>
        </div>
      </form>

      {/* 知识条目列表 */}
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-stone-400 dark:border-stone-700">
          还没有知识条目，先添加一条试试。
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              {editingId === entry.id ? (
                <div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    aria-label="编辑标题"
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-green-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    aria-label="编辑内容"
                    className="mt-3 w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-4 py-1.5 text-sm disabled:opacity-50 dark:border-stone-700"
                    >
                      <X size={14} />
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(entry.id)}
                      disabled={busy || !editTitle.trim() || !editContent.trim()}
                      className="inline-flex items-center gap-1 rounded-full bg-green-800 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-green-400 dark:text-stone-950"
                    >
                      <Check size={14} weight="bold" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-stone-900 dark:text-stone-100">
                      {entry.title}
                    </h3>
                    <span className="shrink-0 text-xs text-stone-400">
                      更新于 {formatDate(entry.updated_at)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {entry.content}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3.5 py-1.5 text-xs text-stone-600 transition hover:border-stone-400 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
                    >
                      <NotePencil size={13} />
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => act(`/api/admin/rag/${entry.id}`, "DELETE")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <Trash size={13} />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
