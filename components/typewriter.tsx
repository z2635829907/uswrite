"use client";

import { useEffect, useState } from "react";

/**
 * 打字机展示:把完整文本按小步进逐字显示。
 * 即使底层传输很快,也能稳定呈现"边生成边打字"的效果。
 */
export function TypeWriter({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (text.length === 0) {
      setShown("");
      return;
    }
    if (shown.length >= text.length) {
      setShown(text);
      return;
    }
    const id = window.setInterval(() => {
      setShown((s) => {
        if (s.length < text.length) return text.slice(0, s.length + 3);
        return s;
      });
    }, 12);
    return () => window.clearInterval(id);
  }, [text]);

  return <>{shown}</>;
}
