"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Article, MusicNotes, Robot } from "@phosphor-icons/react";
import { useMusicEngine } from "@/lib/use-music-engine";
import { AssistantPanel } from "./assistant-panel";

const PET_STORAGE_KEY = "shiguang-cat-pet-pos";
const PET_SIZE = 120; // 猫咪显示宽度(px)
const LONG_PRESS_MS = 260; // 长按判定
const MOVE_THRESHOLD = 7; // 开始拖动的位移阈值(px)

const BUBBLES = [
  "喵～今天也要元气满满哦！",
  "你觉得我的围巾好看吗？",
  "摸得我好舒服呀～",
  "写不下去的时候,就来找我玩吧！",
  "嘘,我在等下一篇文章上线呢。",
  "喵呜～要不要听首歌放松一下？",
  "我是拾光的小守护喵!",
  "别戳啦,再戳我要跳起来啦！",
  "灵感来了记得告诉我哦！",
  "和你一起看文章真好~",
];

type PetAnim = "jump" | "squash" | "shake";
const ANIM_SEQ: PetAnim[] = ["jump", "squash", "shake"];

function loadInitialPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(PET_STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved) as { x?: number; y?: number };
      if (
        typeof p.x === "number" &&
        typeof p.y === "number" &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y)
      ) {
        return { x: p.x, y: p.y };
      }
    }
  } catch {
    /* 忽略损坏的存储值 */
  }
  return null;
}

export default function CatPet() {
  const router = useRouter();
  const pathname = usePathname();
  const { tracks, index, playing, togglePlay } = useMusicEngine();

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [anim, setAnim] = useState<PetAnim | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [orbSide, setOrbSide] = useState<"left" | "right">("right");

  const animIndex = useRef(0);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);

  // 交互手势状态
  const gesture = useRef<"idle" | "pressing" | "dragging">("idle");
  const downAt = useRef({ x: 0, y: 0 });
  const downPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const animTimer = useRef<number | null>(null);
  const bubbleTimer = useRef<number | null>(null);
  const lookFrame = useRef<number | null>(null);
  const lookTarget = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // 初始化位置
  useEffect(() => {
    const saved = loadInitialPos();
    if (saved) {
      const clamped = clampToViewport(saved);
      posRef.current = clamped;
      setPos(clamped);
    } else {
      const initial = clampToViewport({
        x: (typeof window !== "undefined" ? window.innerWidth : 1200) - PET_SIZE - 24,
        y: (typeof window !== "undefined" ? window.innerHeight : 800) - PET_SIZE - 24,
      });
      posRef.current = initial;
      setPos(initial);
    }
    setMounted(true);
  }, []);

  // 定时眨眼:固定每 3 秒眨一次,眨约 0.17 秒
  useEffect(() => {
    let cancelled = false;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        window.setTimeout(() => {
          if (cancelled) return;
          setBlinking(false);
          schedule();
        }, 170);
      }, 3000);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // 鼠标跟踪:猫轻微迎向鼠标方向(最多约 6px)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) return;
      const p = posRef.current;
      if (!p) return;
      const cx = p.x + PET_SIZE / 2;
      const cy = p.y + PET_SIZE / 2;
      // 以视口中心为基准归一化
      const nx = (e.clientX - cx) / (window.innerWidth || 1);
      const ny = (e.clientY - cy) / (window.innerHeight || 1);
      const len = Math.hypot(nx, ny) || 1;
      const clamped = Math.min(1, len);
      lookTarget.current = {
        x: (nx / len) * clamped * 6,
        y: (ny / len) * clamped * 5,
      };
      if (lookFrame.current) cancelAnimationFrame(lookFrame.current);
      lookFrame.current = requestAnimationFrame(() => {
        setLook(lookTarget.current);
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (lookFrame.current) cancelAnimationFrame(lookFrame.current);
    };
  }, []);

  // 点击外部关闭工具栏
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (
        menuRef.current?.contains(target) ||
        petRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [menuOpen]);

  function clampToViewport(p: { x: number; y: number }) {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const x = Math.max(4, Math.min(w - PET_SIZE - 4, p.x));
    const y = Math.max(4, Math.min(h - PET_SIZE - 4, p.y));
    return { x, y };
  }

  function randomBubble() {
    return BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
  }

  const triggerInteraction = useCallback(() => {
    // 轮流触发三种动画
    const a = ANIM_SEQ[animIndex.current % ANIM_SEQ.length];
    animIndex.current += 1;
    setAnim(a);
    setInteracting(true);
    if (animTimer.current) window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => {
      setAnim(null);
      setInteracting(false);
    }, 620);

    // 随机中文气泡(背景不透明,不遮挡猫咪)
    setBubble(randomBubble());
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 2300);
  }, []);

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (gesture.current === "idle") return;
      const dx = e.clientX - downAt.current.x;
      const dy = e.clientY - downAt.current.y;
      if (
        gesture.current === "pressing" &&
        Math.abs(dx) + Math.abs(dy) > MOVE_THRESHOLD
      ) {
        // 超过阈值 -> 进入拖动
        if (longPressTimer.current) {
          window.clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        gesture.current = "dragging";
        draggingRef.current = true;
        hasMoved.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      if (gesture.current === "dragging") {
        setBubble(null);
        const next = clampToViewport({
          x: downPos.current.x + dx,
          y: downPos.current.y + dy,
        });
        posRef.current = next;
        setPos(next);
      }
    },
    []
  );

  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (gesture.current === "pressing") {
      // 未长按、未拖动 -> 视为一次点击互动
      triggerInteraction();
    }
    if (gesture.current === "dragging" && posRef.current) {
      try {
        localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        /* 存储失败时忽略 */
      }
    }
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      draggingRef.current = false;
      gesture.current = "idle";
    hasMoved.current = false;
  }, [onMove, triggerInteraction]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // 点击小球等交互控件时不启动猫咪拖动手势
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("[data-no-drag], [data-pet-action]")
      ) {
        return;
      }
      // 仅左键或触摸
      if (e.pointerType === "mouse" && e.button !== 0) return;
      gesture.current = "pressing";
      downAt.current = { x: e.clientX, y: e.clientY };
      downPos.current = posRef.current ?? { x: 0, y: 0 };
      hasMoved.current = false;

      // 长按进入拖动
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      longPressTimer.current = window.setTimeout(() => {
        if (gesture.current === "pressing" && !hasMoved.current) {
          gesture.current = "dragging";
          document.body.style.userSelect = "none";
          document.body.style.cursor = "grabbing";
          setBubble("按住我就可以拖走啦～");
        }
      }, LONG_PRESS_MS);

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [onMove, onUp]
  );

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    // 右键小球按钮时不重复开关菜单
    const target = e.target;
    if (
      target instanceof Element &&
      target.closest("[data-pet-action]")
    ) {
      return;
    }
    // 右侧放不下球组时翻转到左侧
    const current = posRef.current ?? { x: 0, y: 0 };
    const rightRoom =
      (typeof window !== "undefined" ? window.innerWidth : 1200) -
      (current.x + PET_SIZE) -
      12;
    setOrbSide(rightRoom >= 150 ? "right" : "left");
    setMenuOpen((v) => !v);
  }

  function scrollToLatest() {
    if (pathname === "/") {
      document.getElementById("latest")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/");
      window.setTimeout(() => {
        document.getElementById("latest")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }
  }

  function handleMenu(action: "assistant" | "latest" | "music") {
    setMenuOpen(false);
    if (action === "assistant") {
      setAssistantOpen(true);
    } else if (action === "latest") {
      scrollToLatest();
    } else {
      togglePlay();
      const current = tracks[index];
      if (current) {
        setBubble(`♪ 正在播放《${current.name}》`);
      } else {
        setBubble(tracks.length === 0 ? "曲库还没加载出来,稍等一会儿哦～" : "音乐马上就来啦!");
      }
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      bubbleTimer.current = window.setTimeout(() => setBubble(null), 2400);
    }
  }

  if (!mounted || !pos) return null;

  return (
    <>
      {/* 猫咪本体 */}
      <div
        ref={petRef}
        className="fixed z-[80] select-none"
        style={{ left: pos.x, top: pos.y, width: PET_SIZE, height: PET_SIZE }}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
        role="button"
        aria-label="网站宠物小猫"
        title="点击互动 · 按住拖动 · 右键打开菜单"
      >
        <div className="relative h-full w-full">
          {/* 对话气泡 */}
          {bubble && (
            <div
              className="pet-bubble-in pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-[81] w-max max-w-[200px] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-center text-xs font-medium leading-snug text-stone-700 shadow-lg shadow-stone-950/10"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {bubble}
              <span className="absolute left-1/2 top-full -mt-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-stone-200 bg-white" />
            </div>
          )}

          {/* 呼吸层(scaleY+tranlateY) */}
          <div className="pet-breathe h-full w-full">
            {/* 迎向鼠标层(平移) */}
            <div
              className="pet-look h-full w-full"
              style={{ transform: `translate(${look.x}px, ${look.y}px)` }}
            >
              {/* 互动动画层(jump/squash/shake) */}
              <div className={`h-full w-full ${anim ? `pet-anim-${anim}` : ""}`}>
                <Image
                  src={blinking ? "/images/cat-pet-blink.png" : "/images/cat-pet.png"}
                  alt="拾光小猫"
                  width={PET_SIZE}
                  height={PET_SIZE}
                  priority
                  draggable={false}
                  className={`pointer-events-none h-full w-full object-contain transition-[filter] duration-200 ${
                    interacting
                      ? "brightness-105 saturate-105"
                      : "hover:brightness-105 hover:saturate-105"
                  }`}
                />
              </div>
            </div>
          </div>
          {/* 右键工具栏:小球从上到下排列在小猫右侧 */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="pet-pop-in pointer-events-none absolute inset-0 z-[90]"
            >
              <div
                className="pointer-events-auto absolute top-1/2 flex -translate-y-1/2 flex-col gap-3"
                style={
                  orbSide === "right"
                    ? { left: "calc(100% + 10px)" }
                    : { right: "calc(100% + 10px)" }
                }
              >
                {/* AI 助手 */}
                <button
                  type="button"
                  data-pet-action="assistant"
                  data-no-drag
                  onClick={() => handleMenu("assistant")}
                  className="group pointer-events-auto"
                  aria-label="打开 AI 助手"
                >
                  <span className="pet-orb flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-lg shadow-stone-900/15 ring-1 ring-stone-200 transition group-hover:scale-110 dark:bg-stone-100 dark:text-stone-900 dark:ring-stone-400/40">
                    <Robot size={21} weight="bold" />
                  </span>
                  <span className="pet-orb-label">AI 助手</span>
                </button>

                {/* 最新文章 */}
                <button
                  type="button"
                  data-pet-action="latest"
                  data-no-drag
                  onClick={() => handleMenu("latest")}
                  className="group pointer-events-auto"
                  aria-label="进入最新文章"
                >
                  <span className="pet-orb flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-lg shadow-stone-900/15 ring-1 ring-stone-200 transition group-hover:scale-110 dark:bg-stone-100 dark:text-stone-900 dark:ring-stone-400/40">
                    <Article size={21} weight="bold" />
                  </span>
                  <span className="pet-orb-label">最新文章</span>
                </button>

                {/* 音乐 */}
                <button
                  type="button"
                  data-pet-action="music"
                  data-no-drag
                  onClick={() => handleMenu("music")}
                  className="group pointer-events-auto"
                  aria-label={playing ? "暂停音乐" : "播放音乐"}
                >
                  <span className="pet-orb flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-lg shadow-stone-900/15 ring-1 ring-stone-200 transition group-hover:scale-110 dark:bg-stone-100 dark:text-stone-900 dark:ring-stone-400/40">
                    <MusicNotes size={21} weight="bold" />
                  </span>
                  <span className="pet-orb-label">{playing ? "暂停音乐" : "播放音乐"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI 助手聊天面板 */}
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
