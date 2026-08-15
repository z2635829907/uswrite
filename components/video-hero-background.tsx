"use client";

/**
 * 首页主视觉背景:书桌小熊视频循环播放 + 渐变遮罩保证文字可读。
 * 视频很小(约 0.34MB),自动静音循环播放,带封面图兜底。
 */
export default function VideoHeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/desk-bear.mp4"
        poster="/videos/desk-bear-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/55 via-stone-950/35 to-stone-950/65" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/70 to-transparent" />
    </div>
  );
}
