"use client";

/**
 * 首页主视觉背景:书桌小熊高清图片,左对齐贴住页面左边缘,不叠加任何文字。
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
    </div>
  );
}
