"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Source {
  post_id?: number | null;
  title: string;
  slug?: string | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

/**
 * AI 助手共用的对话状态与流式发送逻辑。
 * 悬浮面板与全屏页共用同一份实现,避免重复代码导致的"改了这漏了那"。
 * @param enabled 是否加载历史(面板在打开时才加载,全屏页一直加载)
 */
export function useAssistantChat(enabled: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "generating">("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || loaded) return;
    fetch("/api/assistant/history")
      .then((res) => {
        if (res.ok) setHasAccount(true);
        return res.ok ? res.json() : null;
      })
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
  }, [enabled, loaded]);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || busy) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setPhase("loading");
    setMessages((m) => [...m, { role: "assistant", content: "", sources: [] }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "请求失败");
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let sources: Source[] = [];
      let gotMeta = false;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const s = line.slice(5).trim();
          if (!s) continue;
          try {
            const obj = JSON.parse(s);
            if (typeof obj.delta === "string" && obj.delta) {
              setPhase("generating");
              acc += obj.delta;
              setMessages((m) => [
                ...m.slice(0, -1),
                { role: "assistant", content: acc, sources },
              ]);
            }
            if (obj.sources) sources = obj.sources as Source[];
            if (obj.done) {
              gotMeta = true;
              setPhase("idle");
              setMessages((m) => [
                ...m.slice(0, -1),
                { role: "assistant", content: acc, sources },
              ]);
            }
          } catch {
            // 忽略解析失败的片断
          }
        }
      }
      if (!gotMeta) {
        setMessages((m) => [
          ...m.slice(0, -1),
          {
            role: "assistant",
            content: acc || "没有拿到回答，请稍后再试",
            sources,
          },
        ]);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((m) => [
          ...m.slice(0, -1),
          {
            role: "assistant",
            content: err instanceof Error ? err.message : "请求失败，请稍后再试",
            sources: [],
          },
        ]);
      }
    } finally {
      setBusy(false);
      setPhase("idle");
      abortRef.current = null;
    }
  }, [input, busy]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setPhase("idle");
  }, []);

  const clearHistory = useCallback(async () => {
    const res = await fetch("/api/assistant/history", { method: "DELETE" });
    if (res.ok) setMessages([]);
  }, []);

  return { messages, input, setInput, busy, send, clearHistory, hasAccount, phase, stop };
}
