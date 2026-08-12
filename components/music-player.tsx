"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMusicEngine, formatTime } from "@/lib/use-music-engine";

const PLAYER_STORAGE_KEY = "shiguang-player-pos";

function loadInitialPos(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  try {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      if (
        typeof parsed.x === "number" &&
        typeof parsed.y === "number" &&
        Number.isFinite(parsed.x) &&
        Number.isFinite(parsed.y)
      ) {
        return { x: parsed.x, y: parsed.y };
      }
    }
  } catch {
    /* 忽略损坏的存储值 */
  }
  return {
    x: 16,
    y: 88,
  };
}

export default function MusicPlayer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const {
    tracks,
    index,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    failed,
    lyric,
    lyricNext,
    togglePlay,
    skipTo,
    seekTo,
    changeVolume,
    toggleMute,
  } = useMusicEngine();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pos, setPos] = useState<{ x: number; y: number }>(() =>
    loadInitialPos()
  );
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mini, setMini] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [dominant, setDominant] = useState<[string, string]>([
    "34,197,94",
    "20,83,45",
  ]);

  const current = tracks[index];
  const cover = current?.pic || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // 点击播放器外部时自动收起为小圆圈，避免挡住页面内容
  useEffect(() => {
    const onOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const host = hostRef.current;
      if (!host || host.contains(target)) return;
      setMini(true);
    };
    window.addEventListener("pointerdown", onOutsidePointerDown, true);
    return () =>
      window.removeEventListener("pointerdown", onOutsidePointerDown, true);
  }, []);

  useEffect(() => {
    extractColor(cover);
  }, [cover]);

  function extractColor(url: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255;
          if (a > 0.5) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n += 1;
          }
        }
        if (n === 0) return;
        const dr = Math.round(r / n);
        const dg = Math.round(g / n);
        const db = Math.round(b / n);
        setDominant([
          `${dr},${dg},${db}`,
          `${Math.round(dr * 0.55)},${Math.round(dg * 0.5)},${Math.round(
            db * 0.7
          )}`,
        ]);
      } catch {
        /* 跨域受限时保持默认渐变 */
      }
    };
    img.src = url;
  }

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const startPos = { ...pos };
      posRef.current = startPos;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPos,
        moved: false,
      };
      setDragging(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        const next = {
          x: drag.startPos.x + dx,
          y: drag.startPos.y + dy,
        };
        next.x = Math.max(
          -8,
          Math.min(window.innerWidth - (mini ? 56 : 384) + 8, next.x)
        );
        next.y = Math.max(
          -8,
          Math.min(window.innerHeight - (mini ? 56 : 120) + 8, next.y)
        );
        setPos(next);
        posRef.current = next;
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== dragRef.current?.pointerId) return;
        dragRef.current = null;
        setDragging(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          localStorage.setItem(
            PLAYER_STORAGE_KEY,
            JSON.stringify(posRef.current)
          );
        } catch {
          /* 存储失败时忽略 */
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [pos, mini]
  );

  const didDrag = useCallback(() => dragRef.current?.moved ?? false, []);

  const isInteractiveTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return true;
    if (target.closest("button, input, select, textarea, a")) return true;
    return target.closest("[data-no-drag]") !== null;
  }, []);

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isInteractiveTarget(e.target)) return;
      startDrag(e);
    },
    [isInteractiveTarget, startDrag]
  );

  const progress = duration > 0 ? currentTime / duration : 0;
  const gradientStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, rgba(${dominant[0]},0.55), rgba(${dominant[1]},0.35)), var(--player-base)`,
    }),
    [dominant]
  );

  if (failed) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-xs text-stone-500 shadow-lg dark:border-stone-700 dark:bg-stone-900/90"
        ref={hostRef}
      >
        音乐播放器暂时无法加载
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      data-player="floating"
      className="player-host fixed left-0 top-0 z-50"
      style={mounted ? { left: pos.x, top: pos.y } : undefined}
    >
      {mini ? (
        <button
          type="button"
          aria-label="展开音乐播放器"
          onClick={() => {
            if (!didDrag()) setMini(false);
          }}
          onPointerDown={startDrag}
          className={`group relative h-14 w-14 overflow-hidden rounded-full shadow-lg shadow-stone-900/20 ring-1 ring-stone-900/10 transition hover:scale-105 dark:ring-white/10 ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${playing ? "animate-disc-spin" : ""}`}
          data-no-drag
          style={{
            backgroundImage: cover ? `url(${cover})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            touchAction: "none",
          }}
        >
          {playing && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-white">
              ♪
            </span>
          )}
        </button>
      ) : (
        <div
          onPointerDown={onCardPointerDown}
          className={`relative w-[360px] overflow-hidden rounded-3xl shadow-2xl shadow-stone-900/20 ring-1 backdrop-blur-xl ${
            dragging
              ? "ring-stone-500/60 dark:ring-white/40"
              : "ring-stone-900/10 dark:ring-white/10"
          }`}
          style={
            {
              "--player-base": "rgba(250,250,249,0.72)",
              touchAction: dragging ? "none" : undefined,
            } as React.CSSProperties
          }
        >
          <div className="pointer-events-none absolute inset-0" style={gradientStyle} />
          <div className="pointer-events-none absolute inset-0 bg-white/30 dark:bg-stone-950/30" />

          <div className="relative p-5">
            <button
              type="button"
              aria-label="拖动播放器"
              title="按住拖动"
              data-no-drag
              onPointerDown={startDrag}
              className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-900/5 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-white/10 dark:hover:text-stone-300 ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ touchAction: "none" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.7" />
                <circle cx="15" cy="6" r="1.7" />
                <circle cx="9" cy="12" r="1.7" />
                <circle cx="15" cy="12" r="1.7" />
                <circle cx="9" cy="18" r="1.7" />
                <circle cx="15" cy="18" r="1.7" />
              </svg>
            </button>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="disc-spin relative h-28 w-28 overflow-hidden rounded-full shadow-inner ring-4 ring-white/70 dark:ring-stone-800/70">
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
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.55)_0%,transparent_34%)]" />
                  <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900/85 ring-2 ring-white/60 dark:ring-stone-700" />
                </div>
                <button
                  type="button"
                  aria-label={playing ? "暂停" : "播放"}
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-950/35 text-white backdrop-blur-sm transition hover:bg-stone-950/50 active:scale-95"
                >
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-stone-900 dark:text-stone-100">
                  {current?.name || "加载中…"}
                </p>
                <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                  {current?.artist || "未知歌手"}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
                    {formatTime(currentTime)}
                  </span>
                  <button
                    type="button"
                    aria-label="播放进度"
                    className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-stone-300/70 dark:bg-stone-700/70"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      seekTo((e.clientX - rect.left) / rect.width);
                    }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-stone-900/70 dark:bg-white/70"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <span
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-stone-900/20 transition group-hover:scale-110 dark:ring-white/30"
                      style={{ left: `calc(${progress * 100}% - 6px)` }}
                    />
                  </button>
                  <span className="shrink-0 text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-stone-600 dark:text-stone-300">
                    <button
                      type="button"
                      aria-label="上一首"
                      onClick={() => skipTo(index - 1)}
                      className="transition hover:scale-110 hover:text-stone-900 dark:hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="下一首"
                      onClick={() => skipTo(index + 1)}
                      className="transition hover:scale-110 hover:text-stone-900 dark:hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={muted ? "取消静音" : "静音"}
                      onClick={toggleMute}
                      className="transition hover:scale-110 hover:text-stone-900 dark:hover:text-white"
                    >
                      {muted || volume === 0 ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      data-no-drag
                      value={muted ? 0 : volume}
                      aria-label="音量"
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="h-1 w-16 cursor-pointer accent-stone-900 dark:accent-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="播放列表"
                      onClick={() => setListOpen((v) => !v)}
                      className={`transition hover:scale-110 ${
                        listOpen
                          ? "text-stone-900 dark:text-white"
                          : "text-stone-600 dark:text-stone-300"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="收起播放器"
                      onClick={() => setMini(true)}
                      className="text-stone-500 transition hover:scale-110 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 15.5 12 8l7 7.5-1.4 1.5L12 11l-5.6 6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
              <div className="px-4 py-3" style={gradientStyle}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500/90 dark:text-stone-400/90">
                  歌词
                </p>
                <p
                  className="mt-1 truncate text-sm font-semibold text-stone-900 dark:text-stone-50"
                  data-lyric="current"
                >
                  {lyric || "…"}
                </p>
                <p className="mt-0.5 truncate text-xs text-stone-500/90 dark:text-stone-300/80">
                  {lyricNext}
                </p>
              </div>
            </div>
          </div>

          {listOpen && (
            <div className="relative max-h-56 overflow-y-auto border-t border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-stone-950/60">
              {tracks.map((t, i) => (
                <button
                  key={`${t.name}-${i}`}
                  type="button"
                  onClick={() => skipTo(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/60 dark:hover:bg-white/10 ${
                    i === index ? "bg-white/70 dark:bg-white/10" : ""
                  }`}
                >
                  <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
                    {i + 1}
                  </span>
                  {t.pic && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.pic}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs font-medium ${
                        i === index
                          ? "text-stone-900 dark:text-white"
                          : "text-stone-600 dark:text-stone-300"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span className="block truncate text-[10px] text-stone-400 dark:text-stone-500">
                      {t.artist}
                    </span>
                  </span>
                  {i === index && playing && (
                    <span className="shrink-0 text-[10px] text-green-700 dark:text-green-400">
                      ♪ 播放中
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
