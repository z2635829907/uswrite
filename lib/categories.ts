export const CATEGORIES = [
  { key: "travel", label: "旅游", emoji: "✈️" },
  { key: "life", label: "生活", emoji: "🏠" },
  { key: "emotion", label: "情感", emoji: "💌" },
  { key: "food", label: "美食", emoji: "🍜" },
  { key: "sports", label: "体育", emoji: "⚽" },
  { key: "entertainment", label: "娱乐", emoji: "🎬" },
  { key: "game", label: "游戏", emoji: "🎮" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const DEFAULT_CATEGORY = "uncategorized";

export function categoryLabel(key: string | null | undefined) {
  if (!key || key === DEFAULT_CATEGORY) return "未分类";
  return CATEGORIES.find((c) => c.key === key)?.label ?? "未分类";
}

export function isCategoryKey(key: string): key is CategoryKey {
  return CATEGORIES.some((c) => c.key === key);
}
