"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { categoryLabel } from "@/lib/categories";
import { coverUrl, formatDate } from "@/lib/utils";
import type { PostWithMeta } from "@/lib/types";
import InlineMusicPlayer from "@/components/inline-music-player";

const BATCH_SIZE = 4;
const INTERVAL = 5000;

export default function LatestPosts({ posts }: { posts: PostWithMeta[] }) {
  const [batch, setBatch] = useState(0);
  const totalBatches = Math.max(1, Math.ceil(posts.length / BATCH_SIZE));

  useEffect(() => {
    if (posts.length <= BATCH_SIZE) return;
    const timer = window.setInterval(() => {
      setBatch((b) => (b + 1) % totalBatches);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, [posts.length, totalBatches]);

  const safeBatch = Math.min(batch, totalBatches - 1);
  const start = safeBatch * BATCH_SIZE;
  const batchPosts = posts.slice(start, start + BATCH_SIZE);
  const featured = batchPosts[0];
  const recent = batchPosts.slice(1, 4);

  if (!featured) return null;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          最新文章
        </h2>
        <div className="flex items-center gap-4">
          {totalBatches > 1 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {Array.from({ length: totalBatches }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === safeBatch
                      ? "w-5 bg-green-800 dark:bg-green-400"
                      : "w-1.5 bg-stone-300 dark:bg-stone-700"
                  }`}
                />
              ))}
            </div>
          )}
          <Link
            href="/posts"
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-green-800 dark:text-stone-400 dark:hover:text-green-400"
          >
            查看全部
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div key={safeBatch} className="featured-fade">
          <Link
            href={`/posts/${featured.slug}`}
            className="group block h-full overflow-hidden rounded-3xl border border-stone-200 bg-white transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
              {featured.cover_seed && (
                <Image
                  src={coverUrl(featured.cover_seed, 900, 560)}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  priority
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              )}
              <span className="absolute left-4 top-4 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
                {categoryLabel(featured.category)}
              </span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold tracking-tight text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                {featured.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                {featured.excerpt}
              </p>
              <p className="mt-4 text-xs text-stone-400">
                {featured.author.display_name} · {formatDate(featured.published_at)} ·{" "}
                {featured.like_count} 赞 · {featured.comment_count} 评论
              </p>
            </div>
          </Link>
        </div>

        <div className="grid content-start gap-4">
          <div key={safeBatch} className="featured-fade grid content-start gap-4">
            {recent.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 sm:h-20 sm:w-32">
                  {post.cover_seed && (
                    <Image
                      src={coverUrl(post.cover_seed, 240, 160)}
                      alt={post.title}
                      fill
                      sizes="128px"
                      className="object-cover transition duration-500 group-hover:scale-[1.06]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-bold text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
                    {post.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                    {post.excerpt}
                  </p>
                  <p className="mt-2 text-[11px] text-stone-400">
                    {post.author.display_name} · {formatDate(post.published_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <InlineMusicPlayer />
        </div>
      </div>
    </div>
  );
}
