import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { ProfileForm, PasswordForm } from "@/components/settings-forms";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        账号设置
      </h1>
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          个人资料
        </h2>
        <div className="mt-5">
          <ProfileForm user={{ ...user }} />
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          修改密码
        </h2>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
