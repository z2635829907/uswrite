"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Article, MusicNotes, Robot } from "@phosphor-icons/react";
import { useMusicEngine } from "@/lib/use-music-engine";
import { AssistantPanel } from "./assistant-panel";

const PET_STORAGE_KEY = "shiguang-cat-pet-pos";
const PET_MOVED_KEY = "shiguang-cat-pet-moved";
const GREETED_KEY = "shiguang-cat-pet-greeted";
const USED_KEY = "shiguang-cat-pet-used";
const PET_SIZE = 120; // 猫咪显示宽度(px)
const PEEK_RIGHT_EXTRA = 31.5; // 探头状态额外往右贴的像素,让竖墙贴近屏幕右缘
const PEEK_TOP_EXTRA = 16; // 探头状态额外往上抬的像素,让探头猫更靠上
const LONG_PRESS_MS = 260; // 长按判定
const MOVE_THRESHOLD = 7; // 开始拖动的位移阈值(px)

const BUBBLES = [
  "喵～今天也要元气满满哦！",
  "你觉得我的围巾好看吗？",
  "摸得我好舒服呀～",
  "写不下去的时候,就来找我玩吧！",
  "嘘,我在等下一篇文章上线呢。",
  "喵呜～要不要听首歌放松一下？",
  "我是 uswrite 的小守护喵!",
  "别戳啦,再戳我要跳起来啦！",
  "灵感来了记得告诉我哦！",
  "和你一起看文章真好~",
];

// 主动聊天语句:每隔一段时间主动找用户说话
const PROACTIVE = [
  "今天过得怎么样呀？",
  "有什么有趣的事,快说给我听听？",
  "你最近在读什么书呀？",
  "写文章累了吗？歇一会儿吧～",
  "要不要听首音乐放空一下？",
  "我刚刚偷偷看了你的主页,真好看喵！",
  "有什么开心的事想跟我分享吗？",
  "天气这么好,适合写点什么～",
  "灵感来了要赶紧记下来,别让它跑掉啦！",
  "喝水了吗？记得让眼睛休息一下哦！",
  "遇到烦心事了？跟我说说,我听着呢～",
  "要不要一起去看看大家的文章？",
  "我今天又长大了一点点,你发现了吗？",
  "你最喜欢这个网站的哪个角落呀？",
  "陪我看会儿星星吧,喵～",
  "有没有想去的地方？写下来告诉我～",
];

type PetAnim = "jump" | "squash" | "shake";
const ANIM_SEQ: PetAnim[] = ["jump", "squash", "shake"];

function loadInitialPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    // 只有用户主动拖动过后才恢复记忆位置;否则刷新一律回到右下角
    const moved = localStorage.getItem(PET_MOVED_KEY) === "1";
    if (!moved) return null;
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
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [pose, setPose] = useState<"peek" | "sit">("peek");
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
  const bubbleHideTimer = useRef<number | null>(null);
  const lookFrame = useRef<number | null>(null);
  const lookTarget = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const greetTimers = useRef<number[]>([]);
  const bubbleRef = useRef<string | null>(null);
  const lastProactive = useRef<string | null>(null);

  const clearGreet = useCallback(() => {
    greetTimers.current.forEach((t) => window.clearTimeout(t));
    greetTimers.current = [];
  }, []);

  // 用户一旦主动交互(点击/右键/使用菜单),就停止主动引导并视为已使用过
  const markInteracted = useCallback(() => {
    clearGreet();
    setPose("sit"); // 交互后从"探头"唤醒为"端坐"
    try {
      localStorage.setItem(USED_KEY, "1");
    } catch {
      /* 存储失败时忽略 */
    }
  }, [clearGreet]);

  // 隐藏气泡:先淡出(约0.3秒),再彻底移除文案
  const hideBubble = useCallback(() => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    setBubbleOpen(false);
    if (bubbleHideTimer.current) window.clearTimeout(bubbleHideTimer.current);
    bubbleHideTimer.current = window.setTimeout(() => setBubble(null), 320);
  }, []);

  // 显示气泡:立即淡入,并按给定时长后自动淡出(0 表示不自动消失)
  const showBubble = useCallback(
    (text: string, hideAfterMs: number) => {
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      if (bubbleHideTimer.current) window.clearTimeout(bubbleHideTimer.current);
      setBubble(text);
      setBubbleOpen(true);
      if (hideAfterMs > 0) {
        bubbleTimer.current = window.setTimeout(() => hideBubble(), hideAfterMs);
      }
    },
    [hideBubble]
  );

  // 让气泡状态能随时在定时器里读到最新值
  useEffect(() => {
    bubbleRef.current = bubble;
  }, [bubble]);

  // 初始化位置
  useEffect(() => {
    const saved = loadInitialPos();
    if (saved) {
      const clamped = clampToViewport(saved);
      posRef.current = clamped;
      setPos(clamped);
    } else {
      const initial = clampToViewport({
        x: (typeof window !== "undefined" ? window.innerWidth : 1200) - PET_SIZE - 12,
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

  // 进入页面主动打招呼:首次进入问候+引导右键;老访客若从未交互则温柔提醒一次
  useEffect(() => {
    if (!mounted) return;
    clearGreet();
    let greeted = false;
    let used = false;
    try {
      greeted = localStorage.getItem(GREETED_KEY) === "1";
      used = localStorage.getItem(USED_KEY) === "1";
    } catch {
      /* 忽略 */
    }
    if (!greeted) {
      greetTimers.current.push(
        window.setTimeout(() => {
          showBubble("喵～你好呀", 0);
          greetTimers.current.push(
            window.setTimeout(() => {
              showBubble("试试右键点击我", 2300);
              greetTimers.current.push(
                window.setTimeout(() => {
                  try {
                    localStorage.setItem(GREETED_KEY, "1");
                  } catch {
                    /* 忽略 */
                  }
                  hideBubble();
                }, 2300)
              );
            }, 1500)
          );
        }, 650)
      );
    } else if (!used) {
      greetTimers.current.push(
        window.setTimeout(() => {
          showBubble("喵～记得右键点点我哦", 2500);
        }, 2600)
      );
    }
    return () => clearGreet();
  }, [mounted, clearGreet, showBubble, hideBubble]);

  // 主动聊天:打招呼后每 9 秒说一句,说满 3 句后切换为每 30 秒一句(持续循环)
  useEffect(() => {
    if (!mounted) return;
    const pick = (): string => {
      let msg: string;
      let guard = 0;
      do {
        msg = PROACTIVE[Math.floor(Math.random() * PROACTIVE.length)];
        guard += 1;
      } while (msg === lastProactive.current && guard < 6);
      return msg;
    };
    let delay = 9000; // 当前间隔
    let roundsLeft = 3; // 9 秒阶段剩余次数(打招呼除外)
    let timer: number;
    const tick = () => {
      // 用户正在拖拽/点击,或已有气泡时,本拍顺延
      if (
        !draggingRef.current &&
        gesture.current === "idle" &&
        !bubbleRef.current
      ) {
        const msg = pick();
        lastProactive.current = msg;
        showBubble(msg, 6000);
        if (roundsLeft > 0) {
          roundsLeft -= 1;
          if (roundsLeft === 0) {
            delay = 30000; // 三轮后切到 30 秒循环
          }
        }
      }
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 9000); // 打招呼结束后再等 9 秒说第一句
    return () => window.clearTimeout(timer);
  }, [mounted, showBubble]);

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
    // 允许盒子右缘最多超出视口 8px,让小猫能贴到墙角落
    const x = Math.max(4, Math.min(w - PET_SIZE - 4, p.x));
    const y = Math.max(4, Math.min(h - PET_SIZE - 4, p.y));
    return { x, y };
  }

  function randomBubble() {
    return BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
  }

  const triggerInteraction = useCallback(() => {
    // 主动交互过,停止引导与问候
    markInteracted();
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
    showBubble(randomBubble(), 2300);
  }, [markInteracted, showBubble]);

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (gesture.current === "idle") return;
      const dx = e.clientX - downAt.current.x;
      const dy = e.clientY - downAt.current.y;
      if (
        gesture.current === "pressing" &&
        pose === "sit" &&
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
        hideBubble();
        const next = clampToViewport({
          x: downPos.current.x + dx,
          y: downPos.current.y + dy,
        });
        posRef.current = next;
        setPos(next);
      }
    },
    [hideBubble, pose]
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
        localStorage.setItem(PET_MOVED_KEY, "1");
      } catch {
        /* 存储失败时忽略 */
      }
      markInteracted();
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
  }, [onMove, triggerInteraction, markInteracted]);

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
      if (pose === "sit") {
        longPressTimer.current = window.setTimeout(() => {
          if (gesture.current === "pressing" && !hasMoved.current) {
            gesture.current = "dragging";
            document.body.style.userSelect = "none";
            document.body.style.cursor = "grabbing";
            showBubble("按住我就可以拖走啦～", 0);
          }
        }, LONG_PRESS_MS);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [onMove, onUp, showBubble, pose]
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
    // 用户已按引导使用右键,停止主动引导
    markInteracted();
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
    // 用户使用了菜单,停止主动引导
    markInteracted();
    setMenuOpen(false);
    if (action === "assistant") {
      setAssistantOpen(true);
    } else if (action === "latest") {
      scrollToLatest();
    } else {
      togglePlay();
      const current = tracks[index];
      let msg: string;
      if (current) {
        msg = `♪ 正在播放《${current.name}》`;
      } else {
        msg =
          tracks.length === 0
            ? "曲库还没加载出来,稍等一会儿哦～"
            : "音乐马上就来啦!";
      }
      showBubble(msg, 2400);
    }
  }

  if (!mounted || !pos) return null;

  // 探头与端坐使用不同位置:探头单独贴到右缘,端坐用常规角落位置
  const catLeft =
    pose === "peek"
      ? (typeof window !== "undefined" ? window.innerWidth : 1200) -
        PET_SIZE +
        PEEK_RIGHT_EXTRA
      : pos.x;
  const catTop = pose === "peek" ? pos.y - PEEK_TOP_EXTRA : pos.y;

  return (
    <>
      {/* 猫咪本体 */}
      <div
        ref={petRef}
        className="fixed z-[80] select-none"
        style={{ left: catLeft, top: catTop, width: PET_SIZE, height: PET_SIZE }}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
        role="button"
        aria-label="网站宠物小猫"
        title="点击互动 · 按住拖动 · 右键打开菜单"
      >
        <div className="relative h-full w-full">
          {/* 对话气泡:用透明度过渡实现淡入淡出 */}
          <div
            className={`pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-[81] w-max max-w-[200px] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-center text-xs font-medium leading-snug text-stone-700 shadow-lg shadow-stone-950/10 transition-opacity duration-300 ease-out ${
              bubbleOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ whiteSpace: "pre-wrap" }}
          >
            {bubble ?? ""}
            <span className="absolute left-1/2 top-full -mt-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-stone-200 bg-white" />
          </div>

          {/* 呼吸层(scaleY+tranlateY) */}
          <div className="pet-breathe h-full w-full">
            {/* 迎向鼠标层(平移) */}
            <div
              className="pet-look h-full w-full"
              style={{ transform: `translate(${look.x}px, ${look.y}px)` }}
            >
              {/* 互动动画层(jump/squash/shake) */}
              <div className={`relative h-full w-full ${anim ? `pet-anim-${anim}` : ""}`}>
                {/* 初始:探头谨慎的样子(未交互前) */}
                <Image
                  src="/images/cat-pet-peek.png"
                  alt="uswrite小猫(探头)"
                  width={PET_SIZE}
                  height={PET_SIZE}
                  priority
                  draggable={false}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-out ${
                    pose === "peek" && !menuOpen ? "opacity-100" : "opacity-0"
                  } ${
                    interacting
                      ? "brightness-105 saturate-105"
                      : "hover:brightness-105 hover:saturate-105"
                  }`}
                />
                {/* 端坐 / 眨眼(交互后) */}
                <Image
                  src={blinking ? "/images/cat-pet-blink.png" : "/images/cat-pet.png"}
                  alt="uswrite小猫"
                  width={PET_SIZE}
                  height={PET_SIZE}
                  priority
                  draggable={false}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-out ${
                    pose === "sit" && !menuOpen ? "opacity-100" : "opacity-0"
                  } ${
                    interacting
                      ? "brightness-105 saturate-105"
                      : "hover:brightness-105 hover:saturate-105"
                  }`}
                />
                {/* 右键时:举手打招呼图,与原图交叉淡入淡出 */}
                <Image
                  src="/images/cat-pet-raised.png"
                  alt="uswrite小猫(举手)"
                  width={PET_SIZE}
                  height={PET_SIZE}
                  priority
                  draggable={false}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-out ${
                    menuOpen ? "opacity-100" : "opacity-0"
                  } ${
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
