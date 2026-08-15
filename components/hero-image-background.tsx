"use client";

/**
 * 首页主视觉背景:书桌小熊高清图片。
 * 图片右边缘对齐页面右边缘,左侧留空给插件使用。
 */
export default function HeroImageBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/images/hero-desk-bear.jpg')",
          backgroundPosition: "right center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/45 via-stone-950/20 to-stone-950/60" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/70 to-transparent" />
    </div>
  );
}
