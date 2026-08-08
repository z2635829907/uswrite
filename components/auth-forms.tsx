"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Feather } from "@phosphor-icons/react";

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-green-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-green-400"
      />
    </label>
  );
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登录失败");
      const next = search.get("next");
      router.push(
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : data.user.role === "admin"
            ? "/admin"
            : "/"
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <Field
        label="用户名或邮箱"
        type="text"
        value={account}
        onChange={setAccount}
        placeholder="输入用户名或邮箱"
        autoComplete="username"
      />
      <Field
        label="密码"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="输入密码"
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-green-800 py-3 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
      >
        {busy ? "登录中…" : "登录"}
      </button>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400">
        还没有账号？
        <Link
          href="/register"
          className="ml-1 font-medium text-green-800 hover:underline dark:text-green-400"
        >
          注册一个
        </Link>
      </p>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-stone-400 dark:text-stone-500">
        <Feather size={13} />
        演示账号：demo / Demo@2026
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "注册失败");
      router.push("/write");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "注册失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      <Field
        label="用户名"
        type="text"
        value={form.username}
        onChange={(v) => set("username", v)}
        placeholder="2-20 位，字母、数字或下划线"
        autoComplete="username"
      />
      <Field
        label="昵称"
        type="text"
        value={form.displayName}
        onChange={(v) => set("displayName", v)}
        placeholder="大家看到的名字"
        autoComplete="name"
      />
      <Field
        label="邮箱"
        type="email"
        value={form.email}
        onChange={(v) => set("email", v)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="密码"
        type="password"
        value={form.password}
        onChange={(v) => set("password", v)}
        placeholder="至少 8 位"
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-green-800 py-3 text-sm font-semibold text-white transition hover:bg-green-900 active:translate-y-px disabled:opacity-50 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
      >
        {busy ? "注册中…" : "注册并开始写作"}
      </button>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400">
        已经有账号了？
        <Link
          href="/login"
          className="ml-1 font-medium text-green-800 hover:underline dark:text-green-400"
        >
          直接登录
        </Link>
      </p>
    </form>
  );
}
