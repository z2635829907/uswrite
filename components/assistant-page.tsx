"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, PaperPlaneTilt, Sparkle, Trash } from "@phosphor-icons/react";
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

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assistant/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.messages) return;
        setLoggedIn(true);
        setMessages(
          data.messages.map((m: Record<string, unknown>) => ({
            role: m.role as Message["role"],
            content: String(m.content || ""),
            sources: (m.sources as Source[]) || [],
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources || [] },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "请求失败，请稍后再试",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function clearHistory() {
    if (!loggedIn || busy) return;
    const res = await fetch("/api/assistant/history", { method: "DELETE" });
    if (res.ok) setMessages([]);
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden px-4 py-10 lg:py-14">
      {/* 毛玻璃渐变背景 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-green-300/50 blur-3xl dark:bg-green-500/20" />
        <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-teal-300/50 blur-3xl dark:bg-teal-500/20" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute inset-0 bg-gradient-to-br from-green-100/70 via-white/40 to-indigo-100/70 dark:from-stone-950 dark:via-stone-900/60 dark:to-stone-950" />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/60 shadow-2xl shadow-stone-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-stone-900/60">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-4 border-b border-white/50 px-6 py-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-lg">
                <Sparkle size={22} weight="fill" />
              </span>
              <div>
                <h1 className="bg-gradient-to-r from-green-800 to-teal-600 bg-clip-text text-xl font-black tracking-tight text-transparent dark:from-green-400 dark:to-teal-300">
                  uswrite AI 助手
                </h1>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  基于站内文章与知识库回答，点击参考文章可查看原文
                </p>
              </div>
            </div>
            {loggedIn ? (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-3.5 py-1.5 text-xs font-medium text-stone-600 backdrop-blur transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:text-red-400"
              >
                <Trash size={13} />
                清空记录
              </button>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-3.5 py-1.5 text-xs text-stone-500 backdrop-blur sm:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
                <ArrowClockwise size={13} />
                登录后自动保存聊天记录
              </span>
            )}
          </div>

          {/* 消息区 */}
          <div className="h-[26rem] space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400/30 to-teal-400/30 text-green-700 dark:text-green-300">
                  <Sparkle size={26} weight="fill" />
                </span>
                <p className="max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  你好，我是uswrite AI 助手。
                  <br />
                  可以问我“有哪些关于旅行的文章？”
                  <br />
                  或“台风天适合做什么？”
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-green-700 to-teal-600 text-white shadow-lg dark:from-green-500 dark:to-teal-500 dark:text-stone-950"
                      : "rounded-bl-md border border-white/60 bg-white/70 text-stone-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-stone-800/70 dark:text-stone-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <>
                      <AssistantMarkdown content={msg.content} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/40 pt-2.5 dark:border-white/10">
                          <span className="mr-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                            参考：
                          </span>
                          {msg.sources.map((s, j) =>
                            s.slug ? (
                              <Link
                                key={j}
                                href={`/posts/${s.slug}`}
                                target="_blank"
                                className="max-w-[180px] truncate rounded-full border border-green-800/30 bg-green-800/10 px-2.5 py-1 text-[11px] text-green-800 transition hover:bg-green-800/20 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-400"
                              >
                                {s.title}
                              </Link>
                            ) : (
                              <span
                                key={j}
                                className="max-w-[180px] truncate rounded-full border border-teal-700/30 bg-teal-700/10 px-2.5 py-1 text-[11px] text-teal-800 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
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
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/60 bg-white/70 px-4 py-3 text-sm text-stone-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-stone-800/70 dark:text-stone-400">
                  思考中…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* 输入区 */}
          <form
            onSubmit={send}
            className="flex items-center gap-3 border-t border-white/50 px-5 py-4 dark:border-white/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问点什么，比如：有哪些关于旅行的文章？"
              aria-label="向 AI 助手提问"
              className="min-w-0 flex-1 rounded-full border border-white/60 bg-white/70 px-5 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none backdrop-blur transition focus:border-green-700/60 dark:border-white/10 dark:bg-white/10 dark:text-stone-100 dark:focus:border-green-400/60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="发送"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-teal-500 text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <PaperPlaneTilt size={19} weight="fill" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
