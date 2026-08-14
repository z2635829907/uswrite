import { getAdminRagEntries } from "@/lib/queries";
import { getSpringToken } from "@/lib/server-session";
import { RagEntryManager } from "@/components/rag-entry-manager";

export default async function AdminRagPage() {
  const token = await getSpringToken();
  const entries = await getAdminRagEntries(token);

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        AI 知识库
      </h1>
      <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
        管理员维护的知识条目，会进入 AI 助手的检索范围；普通用户只能问答，无法修改知识库。
      </p>
      <div className="mt-6">
        <RagEntryManager initialEntries={entries} />
      </div>
    </div>
  );
}
