import { springFetch } from "./spring";
import { assistantFetch } from "./assistant";
import type { Comment, NotificationItem, PostWithMeta, PublicUser } from "./types";

export interface PostFilters {
  tag?: string;
  category?: string;
  q?: string;
  sort?: "latest" | "hot";
  page?: number;
  pageSize?: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface CategoryCount {
  key: string;
  label: string;
  emoji: string;
  count: number;
}

/** 公共文章列表(支持标签、分类、搜索、排序、分页)。 */
export async function getPublicPosts(
  filters: PostFilters = {},
  token?: string | null
): Promise<{ posts: PostWithMeta[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort === "hot") params.set("sort", "hot");
  params.set("page", String(filters.page || 1));
  params.set("pageSize", String(filters.pageSize || 10));
  const data = await springFetch<{
    posts: PostWithMeta[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/posts?${params.toString()}`, { token });
  return {
    posts: data.posts || [],
    total: Number(data.total || 0),
    page: Number(data.page || 1),
    pageSize: Number(data.pageSize || 10),
  };
}

export async function getPostBySlug(slug: string, token?: string | null): Promise<PostWithMeta> {
  const data = await springFetch<{ post: PostWithMeta }>(
    `/api/posts/${encodeURIComponent(slug)}`,
    { token }
  );
  return data.post;
}

export async function getPostById(id: number, token?: string | null): Promise<PostWithMeta> {
  const data = await springFetch<{ post: PostWithMeta }>(`/api/posts/by-id/${id}`, {
    token,
  });
  return data.post;
}

export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  const data = await springFetch<{ user: PublicUser }>(
    `/api/users/${encodeURIComponent(username)}`
  );
  return data.user || null;
}

export async function getUserPosts(
  username: string,
  token?: string | null,
  includePrivate = false
): Promise<PostWithMeta[]> {
  const data = await springFetch<{ posts: PostWithMeta[] }>(
    `/api/users/${encodeURIComponent(username)}/posts?includePrivate=${
      includePrivate ? 1 : 0
    }`,
    { token }
  );
  return data.posts || [];
}

export async function getRelatedPosts(
  post: PostWithMeta,
  token?: string | null
): Promise<PostWithMeta[]> {
  const data = await springFetch<{ posts: PostWithMeta[] }>(
    `/api/posts/${post.id}/related?limit=3`,
    { token }
  );
  return data.posts || [];
}

export async function getTopTags(limit = 12): Promise<TagCount[]> {
  const data = await springFetch<{ tags: TagCount[] }>(`/api/tags?limit=${limit}`);
  return data.tags || [];
}

export async function getVisibleComments(postId: number): Promise<Comment[]> {
  const data = await springFetch<{ comments: Comment[] }>(
    `/api/posts/${postId}/comments`
  );
  return data.comments || [];
}

export async function getNotifications(
  limit = 30,
  token?: string | null
): Promise<NotificationItem[]> {
  const data = await springFetch<{ notifications: NotificationItem[] }>(
    `/api/notifications?limit=${limit}`,
    { token }
  );
  return data.notifications || [];
}

export async function unreadNotificationCount(token?: string | null): Promise<number> {
  const data = await springFetch<{ unread: number }>("/api/notifications/unread-count", {
    token,
  });
  return Number(data.unread || 0);
}

export async function getStats(): Promise<{
  users: number;
  posts: number;
  likes: number;
  comments: number;
}> {
  return springFetch("/api/stats");
}

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const data = await springFetch<{ categories: CategoryCount[] }>("/api/categories");
  return data.categories || [];
}

export async function getRecommended(limit = 12, token?: string | null): Promise<PostWithMeta[]> {
  const data = await springFetch<{ posts: PostWithMeta[] }>(
    `/api/recommended?limit=${limit}`,
    { token }
  );
  return data.posts || [];
}

export async function getFavorites(token?: string | null): Promise<PostWithMeta[]> {
  const data = await springFetch<{ posts: PostWithMeta[] }>("/api/me/favorites", {
    token,
  });
  return data.posts || [];
}

// ---------- AI 助手 ----------

export interface RagEntry {
  id: number;
  title: string;
  content: string;
  updated_at: number;
}

export async function getAssistantHistory(
  token?: string | null
): Promise<Array<Record<string, unknown>>> {
  const data = await assistantFetch<{ messages: Array<Record<string, unknown>> }>(
    "/api/assistant/history",
    { token }
  );
  return data.messages || [];
}

export async function clearAssistantHistory(token?: string | null): Promise<void> {
  await assistantFetch("/api/assistant/history", { method: "DELETE", token });
}

export async function getAdminRagEntries(token?: string | null): Promise<RagEntry[]> {
  const data = await assistantFetch<{ entries: RagEntry[] }>("/api/admin/rag", { token });
  return data.entries || [];
}

export async function createRagEntry(
  token: string | null | undefined,
  data: { title: string; content: string }
): Promise<void> {
  await assistantFetch("/api/admin/rag", { method: "POST", body: data, token });
}

export async function updateRagEntry(
  token: string | null | undefined,
  id: number,
  data: { title: string; content: string }
): Promise<void> {
  await assistantFetch(`/api/admin/rag/${id}`, { method: "PATCH", body: data, token });
}

export async function deleteRagEntry(
  token: string | null | undefined,
  id: number
): Promise<void> {
  await assistantFetch(`/api/admin/rag/${id}`, { method: "DELETE", token });
}

// ---------- 后台管理接口 ----------

export async function getAdminOverview(token?: string | null): Promise<{
  users: number;
  posts: number;
  pending: number;
  comments: number;
}> {
  const data = await springFetch<{ users: number; posts: number; pendingPosts: number; comments: number }>(
    "/api/admin/overview",
    { token }
  );
  return {
    users: Number(data.users || 0),
    posts: Number(data.posts || 0),
    pending: Number(data.pendingPosts || 0),
    comments: Number(data.comments || 0),
  };
}

export async function getAdminPosts(
  filters: { status?: string; category?: string; q?: string; page?: number; pageSize?: number },
  token?: string | null
): Promise<{ posts: PostWithMeta[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(filters.page || 1));
  params.set("pageSize", String(filters.pageSize || 100));
  const data = await springFetch<{ posts: PostWithMeta[]; total: number }>(
    `/api/admin/posts?${params.toString()}`,
    { token }
  );
  return { posts: data.posts || [], total: Number(data.total || 0) };
}

export async function getAdminUsers(
  q = "",
  token?: string | null
): Promise<Array<Record<string, unknown>>> {
  const data = await springFetch<{ users: Array<Record<string, unknown>> }>(
    `/api/admin/users?q=${encodeURIComponent(q)}`,
    { token }
  );
  return data.users || [];
}

export async function getAdminComments(
  token?: string | null
): Promise<Array<Record<string, unknown>>> {
  const data = await springFetch<{ comments: Array<Record<string, unknown>> }>(
    "/api/admin/comments",
    { token }
  );
  return data.comments || [];
}
