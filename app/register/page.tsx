import { Feather } from "@phosphor-icons/react/dist/ssr";
import { RegisterForm } from "@/components/auth-forms";
import { getSessionUser } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-800 text-white dark:bg-green-400 dark:text-stone-950">
            <Feather size={22} weight="bold" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            加入uswrite
          </h1>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            写下你的第一篇文字
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
