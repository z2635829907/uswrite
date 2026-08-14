import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { getSessionUser, getSpringToken } from "@/lib/server-session";
import { getFavorites } from "@/lib/queries";
import { coverUrl, formatDate } from "@/lib/utils";

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/favorites");

  const token = await getSpringToken();
  const posts = await getFavorites(token);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
        我的收藏
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        收藏的文章都在这里，随时回来继续读。
      </p>

      {posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="还没有收藏"
            description="读到喜欢的文章时，点一下收藏按钮，它就会出现在这里。"
            action={{ href: "/posts", label: "去逛逛" }}
          />
        </div>
      ) : (
        <div className="mt-8 border-t border-stone-200 dark:border-stone-800">
          {posts.map((post) => (
            <article
              key={post!.id}
              className="grid gap-5 border-b border-stone-200 py-6 sm:grid-cols-[1fr_200px] sm:items-center dark:border-stone-800"
            >
              <div>
                <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  <Link
                    href={`/posts/${post!.slug}`}
                    className="transition hover:text-green-800 dark:hover:text-green-400"
                  >
                    {post!.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {post!.excerpt}
                </p>
                <p className="mt-2.5 text-xs text-stone-400 dark:text-stone-500">
                  {post!.author.display_name} · {formatDate(post!.published_at)} ·{" "}
                  {post!.like_count} 赞
                </p>
              </div>
              {post!.cover_seed && (
                <Link
                  href={`/posts/${post!.slug}`}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100 sm:aspect-[16/9] dark:bg-stone-800"
                >
                  <Image
                    src={coverUrl(post!.cover_seed, 400, 240)}
                    alt={post!.title}
                    fill
                    sizes="(min-width: 640px) 200px, 100vw"
                    className="object-cover"
                  />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
