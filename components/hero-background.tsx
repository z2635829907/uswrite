"use client";

import { useEffect, useState } from "react";

const IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80",
    label: "山野晨光",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80",
    label: "碧海金沙",
  },
  {
    src: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80",
    label: "湖光山色",
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80",
    label: "林间幽径",
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
    label: "森林晨雾",
  },
  {
    src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1920&q=80",
    label: "雪山湖泊",
  },
];

const INTERVAL = 6000;

export default function HeroBackground() {
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = (current + 1) % IMAGES.length;
      // 先预加载下一张，避免淡入时闪白
      const img = new Image();
      img.src = IMAGES[next].src;
      setIncoming(next);
      // 等新图层淡入完成后，把"当前图"换成新图
      window.setTimeout(() => {
        setCurrent(next);
        setIncoming(null);
      }, 1200);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, [current]);

  const active = IMAGES[current];
  const incomingImg = incoming !== null ? IMAGES[incoming] : null;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${active.src})`,
        }}
      />
      {incomingImg && (
        <div
          className="hero-bg-fade absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${incomingImg.src})`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/55 via-stone-950/35 to-stone-950/65" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/70 to-transparent" />

      <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-stone-950/45 px-3.5 py-1.5 text-xs text-stone-100 backdrop-blur">
        <span className="font-medium">{active.label}</span>
        <span className="text-stone-400">
          {current + 1} / {IMAGES.length}
        </span>
      </div>

      <div className="absolute bottom-7 right-6 flex gap-1.5">
        {IMAGES.map((img, i) => (
          <span
            key={img.src}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current
                ? "w-6 bg-white"
                : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
