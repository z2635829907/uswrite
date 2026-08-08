import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChatCircle,
  Heart,
  ShieldCheck,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";
import { MarkAllRead } from "@/components/mark-all-read";
import { EmptyState } from "@/components/empty-state";
import { getNotifications, unreadNotificationCount } from "@/lib/queries";
import { getSessionUser } from "@/lib/server-session";
import { timeAgo } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ReactNode> = {
  like: <Heart size={17} weight="fill" className="text-red-500" />,
  comment: <ChatCircle size={17} className="text-green-700 dark:text-green-400" />,
  review: <ShieldCheck size={17} className="text-amber-600 dark:text-amber-400" />,
  system: <Megaphone size={17} className="text-stone-400" />,
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");
  const items = getNotifications(user.id);
  const unread = unreadNotificationCount(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            通知
          </h1>
          {unread > 0 && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {unread} 条未读
            </p>
          )}
        </div>
        <MarkAllRead />
      </div>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="还没有通知"
            description="有人赞了或评论了你的文章时，会在这里提醒你。"
            action={{ href: "/posts", label: "去看看文章" }}
          />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-stone-200 dark:divide-stone-800">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3.5 py-5 ${
                !item.read ? "opacity-100" : "opacity-60"
              }`}
            >
              <span className="mt-0.5">{TYPE_ICON[item.type] || TYPE_ICON.system}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                  {item.content}
                </p>
                {item.post_slug && (
                  <Link
                    href={`/posts/${item.post_slug}`}
                    className="mt-1 inline-block text-xs text-green-800 hover:underline dark:text-green-400"
                  >
                    查看相关文章
                  </Link>
                )}
                <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
                  {timeAgo(item.created_at)}
                  {!item.read && (
                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-green-700 align-middle dark:bg-green-400" />
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
