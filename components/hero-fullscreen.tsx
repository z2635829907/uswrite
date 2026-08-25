"use client";

import { useEffect, useState } from "react";

const TITLE = "uswrite";
const TAGLINE = "把日子写成诗,记录每一寸微光";
const SUB = "一个安静的文字社区";

export default function HeroFullscreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = window.innerHeight;
      setProgress(Math.min(1, window.scrollY / h));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 滚轮:在首页与"最新文章"之间一步吸附切换,其余滚动保持自由
  useEffect(() => {
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      if (locked) return;
      const vh = window.innerHeight;
      const y = window.scrollY;
      const atTop = y <= 4;
      const atPosts = Math.abs(y - vh) <= 4;
      if (atTop && e.deltaY > 0) {
        e.preventDefault();
        locked = true;
        window.scrollTo({ top: vh, behavior: "smooth" });
        window.setTimeout(() => {
          locked = false;
        }, 900);
      } else if (atPosts && e.deltaY < 0) {
        e.preventDefault();
        locked = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.setTimeout(() => {
          locked = false;
        }, 900);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const contentStyle = {
    opacity: 1 - progress,
  };

  return (
    <section
      className="fixed inset-0 z-0 overflow-hidden"
      aria-label="开场"
    >
      {/* 全屏背景图:白天/夜间双图层,切换主题时平滑交叉淡入淡出 */}
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${1 + progress * 0.12})` }}
      >
        {/* 白天背景 */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out dark:opacity-0"
          style={{ backgroundImage: "url('/images/hero-desk-bear.jpg')" }}
        />
        {/* 夜间背景 */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out opacity-0 dark:opacity-100"
          style={{ backgroundImage: "url('/images/hero-night.jpg')" }}
        />
      </div>

      {/* 上下渐变压暗,保证文字可读,并平滑过渡到下方内容 */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/10 to-stone-950/75" />

      {/* 居中艺术字介绍 */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-stone-50"
        style={contentStyle}
      >
        <h1 className="flex overflow-hidden text-6xl font-black leading-none tracking-[0.12em] text-white drop-shadow-[0_2px_28px_rgba(0,0,0,0.55)] sm:text-7xl md:text-8xl">
          {TITLE.split("").map((ch, i) => (
            <span
              key={i}
              className="hero-letter"
              style={{ animationDelay: `${0.12 + i * 0.14}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <p
          className="hero-fade-up mt-6 flex items-center gap-2 text-lg font-medium text-stone-100/95 sm:text-xl"
          style={{ animationDelay: "0.5s" }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-green-400"
            aria-hidden="true"
          >
            <path d="M4 12h14" />
            <path d="M12 6l6 6-6 6" />
          </svg>
          {TAGLINE}
        </p>

        <p
          className="hero-fade-up mt-3 text-sm tracking-wide text-stone-300/85"
          style={{ animationDelay: "0.66s" }}
        >
          {SUB}
        </p>
      </div>

      {/* 底部滚动提示 */}
      <div
        className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 text-stone-200/85"
        style={{ opacity: Math.max(0, 1 - progress * 1.3) }}
      >
        <p className="text-xs tracking-[0.3em]">向下滑动</p>
        <span className="scroll-hint flex h-9 w-5 items-start justify-center rounded-full border border-stone-100/60 p-1.5">
          <span className="h-2 w-1 rounded-full bg-stone-100/80" />
        </span>
      </div>
    </section>
  );
}
