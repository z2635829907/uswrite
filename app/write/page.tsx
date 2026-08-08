import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { Editor } from "@/components/editor";

export default async function WritePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/write");
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:py-14">
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        写一篇新文章
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        可以先存草稿，写完再提交审核。发布后仍可随时编辑。
      </p>
      <div className="mt-8">
        <Editor />
      </div>
    </div>
  );
}
