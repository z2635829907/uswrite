"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { categoryLabel } from "@/lib/categories";
import { coverUrl, formatDate } from "@/lib/utils";
import type { PostWithMeta } from "@/lib/types";

const INTERVAL = 6000;

export default function FeaturedCarousel({
  posts,
}: {
  posts: PostWithMeta[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % posts.length);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, [posts.length]);

  if (posts.length === 0) return null;
  const post = posts[Math.min(index, posts.length - 1)];

  return (
    <div className="relative">
      <Link
        key={post.id}
        href={`/posts/${post.slug}`}
        className="featured-fade group block overflow-hidden rounded-3xl border border-white/20 bg-white/85 shadow-2xl shadow-stone-950/20 backdrop-blur-xl transition hover:border-white dark:bg-stone-900/85"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
          <Image
            src={coverUrl(post.cover_seed, 1000, 640)}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 480px, 100vw"
            priority
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute left-4 top-4 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
            {categoryLabel(post.category)}
          </span>
          <span className="absolute right-4 top-4 rounded-full bg-stone-950/60 px-2.5 py-1 text-[11px] text-stone-100 backdrop-blur">
            {index + 1} / {posts.length}
          </span>
        </div>
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-stone-900 transition group-hover:text-green-800 dark:text-stone-100 dark:group-hover:text-green-400">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {post.excerpt}
          </p>
          <p className="mt-4 text-xs text-stone-400">
            {post.author.display_name} · {formatDate(post.published_at)}
          </p>
        </div>
      </Link>

      <div className="mt-3 flex justify-center gap-1.5">
        {posts.map((p, i) => (
          <span
            key={p.id}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-5 bg-white/90" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
