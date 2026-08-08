import Link from "next/link";
import { Feather } from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "@/components/auth-forms";
import { getSessionUser } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-800 text-white dark:bg-green-400 dark:text-stone-950">
            <Feather size={22} weight="bold" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            欢迎回来
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            登录后继续你的写作
          </p>
        </div>
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-xs text-stone-400 dark:text-stone-500">
        管理员演示账号：admin / Admin@2026
      </p>
      <Link
        href="/"
        className="mt-3 text-center text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        返回首页
      </Link>
    </div>
  );
}
