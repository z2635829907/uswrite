import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { getPostById } from "@/lib/queries";
import { Editor } from "@/components/editor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/write/" + id);
  const post = getPostById(Number(id));
  if (!post || post.author_id !== user.id) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:py-14">
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        编辑文章
      </h1>
      <div className="mt-8">
        <Editor post={post} />
      </div>
    </div>
  );
}
