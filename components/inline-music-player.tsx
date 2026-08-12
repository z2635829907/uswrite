"use client";

import { useMemo } from "react";
import { useMusicEngine, formatTime } from "@/lib/use-music-engine";

export default function InlineMusicPlayer() {
  const {
    tracks,
    index,
    playing,
    currentTime,
    duration,
    failed,
    lyric,
    lyricNext,
    togglePlay,
    skipTo,
    seekTo,
  } = useMusicEngine();

  const current = tracks[index];
  const cover = current?.pic || "";
  const progress = duration > 0 ? currentTime / duration : 0;

  const gradientStyle = useMemo(
    () => ({
      background:
        "linear-gradient(100deg, color-mix(in srgb, var(--paper) 92%, transparent), color-mix(in srgb, var(--paper) 60%, transparent))",
    }),
    []
  );

  if (failed) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        音乐播放器暂时无法加载
      </div>
    );
  }

  return (
    <div
      data-player="inline"
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900"
      style={gradientStyle}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-stone-200 dark:ring-stone-700">
        <div
          className={`absolute inset-0 rounded-full bg-cover bg-center ${
            playing ? "animate-disc-spin" : ""
          }`}
          style={{
            backgroundImage: cover ? `url(${cover})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900/80 ring-1 ring-white/60" />
      </div>

      <button
        type="button"
        aria-label={playing ? "暂停" : "播放"}
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-700 active:scale-95 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
            {current?.name || "加载中…"}
          </p>
          <p className="shrink-0 text-xs text-stone-400 dark:text-stone-500">
            {current?.artist || "未知歌手"}
          </p>
        </div>

        <div className="relative mt-1.5 h-7 overflow-hidden">
          <p
            key={lyric}
            className="lyric-line truncate text-[13px] font-medium text-stone-700 dark:text-stone-200"
          >
            {lyric || "…"}
          </p>
          {lyricNext && (
            <p className="mt-0.5 truncate text-[11px] text-stone-400 dark:text-stone-500">
              {lyricNext}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-label="播放进度"
          className="group relative mt-1.5 block h-1 w-full cursor-pointer rounded-full bg-stone-300/60 dark:bg-stone-700/60"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-stone-800/70 dark:bg-stone-200/70"
            style={{ width: `${progress * 100}%` }}
          />
        </button>
        <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-stone-500 dark:text-stone-300">
        <button
          type="button"
          aria-label="上一首"
          onClick={() => skipTo(index - 1)}
          className="p-1.5 transition hover:scale-110 hover:text-stone-900 dark:hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="下一首"
          onClick={() => skipTo(index + 1)}
          className="p-1.5 transition hover:scale-110 hover:text-stone-900 dark:hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
