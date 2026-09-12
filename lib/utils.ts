export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(ts: number | null) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(ts);
}

export function excerptOf(content: string, max = 120) {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max) + "…";
}

export function parseTags(tags: string) {
  return tags
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function avatarColor(seed: string) {
  const hue =
    [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 45% 42%)`;
}

export function coverUrl(seed: string, w = 1200, h = 800) {
  return `https://picsum.photos/seed/${encodeURIComponent(
    seed || "shiguang"
  )}/${w}/${h}`;
}

export function initials(name: string) {
  return (name || "拾").trim().slice(0, 1).toUpperCase();
}

export function siteTitle(title?: string) {
  return title ? `${title} · uswrite` : "uswrite · 一个安静的文字社区";
}
