"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/types";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: user.display_name,
    bio: user.bio,
    website: user.website,
    avatarSeed: user.avatar_seed,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMessage("资料已更新");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="dn" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          昵称
        </label>
        <input
          id="dn"
          type="text"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="bio" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          个人简介
        </label>
        <textarea
          id="bio"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="用一两句话介绍自己"
          className="w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="web" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          个人网站
        </label>
        <input
          id="web"
          type="url"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="seed" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          头像样式
        </label>
        <input
          id="seed"
          type="text"
          value={form.avatarSeed}
          onChange={(e) => setForm({ ...form, avatarSeed: e.target.value })}
          placeholder="任意字符，用于生成你的专属头像"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      {message && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-green-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
      >
        {busy ? "保存中…" : "保存资料"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      setMessage("密码已更新");
      setForm({ currentPassword: "", newPassword: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "修改失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="cp" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          当前密码
        </label>
        <input
          id="cp"
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          autoComplete="current-password"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="np" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          新密码
        </label>
        <input
          id="np"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          placeholder="至少 8 位"
          autoComplete="new-password"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
        />
      </div>
      {message && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        {busy ? "修改中…" : "修改密码"}
      </button>
    </form>
  );
}
