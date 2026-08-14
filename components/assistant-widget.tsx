"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  PaperPlaneTilt,
  Sparkle,
  X,
} from "@phosphor-icons/react";

interface Source {
  post_id: number;
  title: string;
  slug: string;
  excerpt?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

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
          content: err instanceof Error ? err.message : "请求失败，请稍后再试",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="打开 AI 助手"
        className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-green-800 text-white shadow-xl shadow-stone-950/20 transition hover:scale-105 hover:bg-green-900 active:scale-95 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
      >
        {open ? <X size={22} weight="bold" /> : <Sparkle size={24} weight="fill" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[70] flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-950/20 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center gap-3 border-b border-stone-100 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-800 text-white dark:bg-green-400 dark:text-stone-950">
              <Sparkle size={18} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                拾光 AI 助手
              </p>
              <p className="text-xs text-stone-400">
                基于站内文章回答，点击参考文章可查看原文
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-sm leading-relaxed text-stone-400">
                你好，我是拾光 AI 助手。
                <br />
                可以问我“有哪些关于旅行的文章？”
                <br />
                或“台风天适合做什么？”
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-md bg-green-800 text-white dark:bg-green-400 dark:text-stone-950"
                      : "rounded-bl-md border border-stone-200 bg-stone-50 text-stone-800 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-100"
                  }`}
                >
                  {msg.content}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.sources.map((s) => (
                        <Link
                          key={s.post_id}
                          href={`/posts/${s.slug}`}
                          target="_blank"
                          className="rounded-full border border-green-800/30 bg-green-800/10 px-2.5 py-1 text-[11px] text-green-800 transition hover:bg-green-800/20 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-stone-100 px-4 py-3 dark:border-stone-800"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问点什么…"
              aria-label="向 AI 助手提问"
              className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-green-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="发送"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-800 text-white transition hover:bg-green-900 disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
            >
              <PaperPlaneTilt size={17} weight="fill" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
