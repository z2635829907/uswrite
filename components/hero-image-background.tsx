"use client";

/**
 * 首页主视觉背景:书桌小熊高清图片,左对齐贴住页面左边缘。
 */
export default function HeroImageBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/images/hero-desk-bear.jpg')",
          backgroundPosition: "left center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/45 via-stone-950/20 to-stone-950/60" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/70 to-transparent" />
    </div>
  );
}
