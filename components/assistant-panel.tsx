"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowSquareOut, PaperPlaneTilt, Sparkle, X } from "@phosphor-icons/react";
import { AssistantMarkdown } from "./assistant-markdown";
import { useAssistantChat } from "./use-assistant-chat";
import { AssistantSources } from "./assistant-sources";
import { TypeWriter } from "./typewriter";

export function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, input, setInput, busy, send, phase, stop } =
    useAssistantChat(open);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

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
              uswrite AI 助手
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
            你好,我是uswrite AI 助手。
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
                  {busy && i === messages.length - 1 && phase === "loading" ? (
                    <p className="animate-pulse text-sm text-stone-400">
                      正在检索文章并思考…
                    </p>
                  ) : busy && i === messages.length - 1 ? (
                    <p className="whitespace-pre-wrap">
                      <TypeWriter text={msg.content} />
                    </p>
                  ) : (
                    <AssistantMarkdown content={msg.content} />
                  )}
                  {busy &&
                    i === messages.length - 1 &&
                    phase === "generating" &&
                    msg.content !== "" && (
                      <span
                        aria-hidden
                        className="ml-0.5 inline-block h-3.5 w-[3px] animate-pulse rounded-sm bg-green-700 align-text-bottom dark:bg-green-300"
                      />
                    )}
                  <AssistantSources sources={msg.sources} />
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
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
        {busy ? (
          <button
            type="button"
            onClick={stop}
            aria-label="停止生成"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 dark:bg-red-500 dark:text-stone-950"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-white" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="发送"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-800 text-white transition hover:bg-green-900 disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        )}
      </form>
    </div>
  );
}
