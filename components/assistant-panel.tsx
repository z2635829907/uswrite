"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, PaperPlaneTilt, Sparkle, X } from "@phosphor-icons/react";
import { AssistantMarkdown } from "./assistant-markdown";

interface Source {
  post_id?: number | null;
  title: string;
  slug?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  // 打开面板时,登录用户自动加载历史聊天记录
  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/assistant/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages?.length) {
          setMessages(
            data.messages.map((m: Record<string, unknown>) => ({
              role: m.role as Message["role"],
              content: String(m.content || ""),
              sources: (m.sources as Source[]) || [],
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "思考中…" }]);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", content: data.answer, sources: data.sources || [] },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m.slice(0, -1),
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "请求失败,请稍后再试",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[70] flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-2xl shadow-stone-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-stone-900/80">
      <div className="flex items-center justify-between gap-3 border-b border-white/50 px-4 py-3.5 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-teal-500 text-white">
            <Sparkle size={17} weight="fill" />
          </span>
          <div>
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
              拾光 AI 助手
            </p>
            <p className="text-[11px] text-stone-400">基于站内文章回答</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-[11px] text-stone-500 backdrop-blur transition hover:text-green-800 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:text-green-400"
          >
            全屏
            <ArrowSquareOut size={12} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 AI 助手"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/40 text-stone-500 backdrop-blur transition hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-xs leading-relaxed text-stone-400">
            你好,我是拾光 AI 助手。
            <br />
            可以问我“有哪些关于旅行的文章？”
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === "user"
                  ? "rounded-br-md bg-green-800 text-white dark:bg-green-400 dark:text-stone-950"
                  : "rounded-bl-md border border-white/60 bg-white/70 text-stone-800 dark:border-white/10 dark:bg-stone-800/70 dark:text-stone-100"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <>
                  <AssistantMarkdown content={msg.content} />
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.sources.map((s, j) =>
                        s.slug ? (
                          <Link
                            key={j}
                            href={`/posts/${s.slug}`}
                            target="_blank"
                            className="max-w-[140px] truncate rounded-full border border-green-800/30 bg-green-800/10 px-2 py-0.5 text-[10px] text-green-800 transition hover:bg-green-800/20 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400"
                          >
                            {s.title}
                          </Link>
                        ) : (
                          <span
                            key={j}
                            className="max-w-[140px] truncate rounded-full border border-teal-700/30 bg-teal-700/10 px-2 py-0.5 text-[10px] text-teal-800 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
                          >
                            {s.title}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-white/50 px-3.5 py-3 dark:border-white/10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="问点什么…"
          aria-label="向 AI 助手提问"
          className="min-w-0 flex-1 rounded-full border border-white/60 bg-white/70 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none backdrop-blur transition focus:border-green-800/60 dark:border-white/10 dark:bg-white/10 dark:text-stone-100 dark:focus:border-green-400/60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="发送"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-800 text-white transition hover:bg-green-900 disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
        >
          <PaperPlaneTilt size={16} weight="fill" />
        </button>
      </form>
    </div>
  );
}
