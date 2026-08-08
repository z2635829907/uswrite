"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ShieldCheck, ShieldSlash, UserMinus, UserPlus, X } from "@phosphor-icons/react";

export function ReviewActions({ postId }: { postId: number }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  async function act(decision: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/admin/posts/${postId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "操作失败");
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="填写驳回原因（必填）"
          className="w-44 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-red-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={busy || !reason.trim()}
          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          确认驳回
        </button>
        <button
          type="button"
          onClick={() => setRejecting(false)}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs dark:border-stone-700"
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full bg-green-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-900 disabled:opacity-50 dark:bg-green-400 dark:text-stone-950"
      >
        <Check size={13} weight="bold" />
        通过
      </button>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        <X size={13} weight="bold" />
        驳回
      </button>
    </span>
  );
}

export function UserStatusActions({ userId, status }: { userId: number; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function act(next: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "操作失败");
      setBusy(false);
    }
  }
  return status === "banned" ? (
    <button
      type="button"
      onClick={() => act("active")}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full bg-green-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-green-400 dark:text-stone-950"
    >
      <UserPlus size={13} weight="bold" />
      解禁
    </button>
  ) : (
    <button
      type="button"
      onClick={() => act("banned")}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      <UserMinus size={13} weight="bold" />
      禁用
    </button>
  );
}

export function UserRoleActions({ userId, role }: { userId: number; role: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function act(next: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "操作失败");
      setBusy(false);
    }
  }
  return role === "admin" ? (
    <button
      type="button"
      onClick={() => act("user")}
      disabled={busy}
      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:border-stone-400 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
    >
      取消管理员
    </button>
  ) : (
    <button
      type="button"
      onClick={() => act("admin")}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
    >
      <ShieldCheck size={13} weight="bold" />
      设为管理员
    </button>
  );
}

export function CommentModerationActions({ commentId, status }: { commentId: number; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function act(next: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  }
  return status === "hidden" ? (
    <button
      type="button"
      onClick={() => act("visible")}
      disabled={busy}
      className="rounded-full bg-green-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-green-400 dark:text-stone-950"
    >
      恢复显示
    </button>
  ) : (
    <button
      type="button"
      onClick={() => act("hidden")}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      <ShieldSlash size={13} weight="bold" />
      隐藏
    </button>
  );
}
