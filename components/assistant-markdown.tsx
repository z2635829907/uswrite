"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 聊天消息用的轻量 Markdown 渲染:加粗、列表、段落、代码片段。 */
export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-inherit">{children}</strong>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <p className="font-bold">{children}</p>,
          h2: ({ children }) => <p className="font-bold">{children}</p>,
          h3: ({ children }) => <p className="font-bold">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-green-700/40 pl-3 opacity-80 dark:border-green-400/40">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
