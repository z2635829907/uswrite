"use client";

export type ToastType = "success" | "error";

let seq = 0;

/** 轻提示:在页面右下角弹一条短暂消息。 */
export function toast(message: string, type: ToastType = "success") {
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: { id: ++seq, message, type },
    })
  );
}
