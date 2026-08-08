import { db } from "./db";
import type {
  Comment,
  NotificationItem,
  Post,
  PostWithMeta,
  PublicUser,
  User,
} from "./types";
import { parseTags } from "./utils";

function toPublicUser(row: User): PublicUser {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    website: row.website,
    avatar_seed: row.avatar_seed,
    role: row.role,
    created_at: row.created_at,
  };
}

interface PostRow extends Post {
  username: string;
  display_name: string;
  bio: string;
  website: string;
  avatar_seed: string;
  user_role: string;
  user_created_at: number;
  like_count: number;
  comment_count: number;
  liked_by_me: number;
  bookmarked_by_me: number;
}

function toPostWithMeta(row: PostRow, viewerId?: number): PostWithMeta {
  return {
    id: row.id,
    author_id: row.author_id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    cover_seed: row.cover_seed,
    tags: row.tags,
    status: row.status,
    rejection_reason: row.rejection_reason,
    views: row.views,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    tagsList: parseTags(row.tags),
    like_count: Number(row.like_count || 0),
    comment_count: Number(row.comment_count || 0),
    liked_by_me: viewerId ? Number(row.liked_by_me || 0) === 1 : false,
    bookmarked_by_me: viewerId
      ? Number(row.bookmarked_by_me || 0) === 1
      : false,
    author: {
      id: row.author_id,
      username: row.username,
      display_name: row.display_name,
      bio: row.bio,
      website: row.website,
      avatar_seed: row.avatar_seed,
      role: row.user_role as PublicUser["role"],
      created_at: row.user_created_at,
    },
  };
}

const POST_SELECT = `
  SELECT p.*,
    u.username, u.display_name, u.bio, u.website, u.avatar_seed,
    u.role AS user_role, u.created_at AS user_created_at,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'visible') AS comment_count
`;

const POST_JOIN = "JOIN users u ON u.id = p.author_id";

function withViewerFlags(sql: string, viewerId?: number) {
  if (!viewerId) return sql;
  return sql.replace(
    `FROM posts p ${POST_JOIN}`,
    `FROM posts p
     LEFT JOIN likes my_like ON my_like.post_id = p.id AND my_like.user_id = ${viewerId}
     LEFT JOIN bookmarks my_bookmark ON my_bookmark.post_id = p.id AND my_bookmark.user_id = ${viewerId}
     ${POST_JOIN}`
  ).replace(
    "AS comment_count",
    `AS comment_count,
     (my_like.id IS NOT NULL) AS liked_by_me,
     (my_bookmark.id IS NOT NULL) AS bookmarked_by_me`
  );
}

export interface PostFilters {
  tag?: string;
  q?: string;
  sort?: "latest" | "hot";
  page?: number;
  pageSize?: number;
}

export function getPublicPosts(
  filters: PostFilters = {},
  viewerId?: number
): { posts: PostWithMeta[]; total: number; page: number; pageSize: number } {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(24, Math.max(1, filters.pageSize || 10));
  const where: string[] = ["p.status = 'approved'"];
  const params: Array<string | number> = [];

  if (filters.tag) {
    where.push("(',' || p.tags || ',') LIKE ?");
    params.push(`%,${filters.tag},%`);
  }
  if (filters.q) {
    where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)");
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }

  const whereSql = where.join(" AND ");
  const order =
    filters.sort === "hot"
      ? "like_count DESC, p.published_at DESC"
      : "p.published_at DESC";

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${whereSql}`)
    .get(...params) as unknown as { total: number };

  const sql = withViewerFlags(
    `${POST_SELECT}
     FROM posts p ${POST_JOIN}
     WHERE ${whereSql}
     ORDER BY ${order}
     LIMIT ? OFFSET ?`,
    viewerId
  );
  const rows = db
    .prepare(sql)
    .all(...params, pageSize, (page - 1) * pageSize) as unknown as PostRow[];

  return {
    posts: rows.map((r) => toPostWithMeta(r, viewerId)),
    total: Number(totalRow.total),
    page,
    pageSize,
  };
}

export function getPostBySlug(slug: string, viewerId?: number) {
  const sql = withViewerFlags(
    `${POST_SELECT}
     FROM posts p ${POST_JOIN}
     WHERE p.slug = ?`,
    viewerId
  );
  const row = db.prepare(sql).get(slug) as unknown as PostRow | undefined;
  return row ? toPostWithMeta(row, viewerId) : null;
}

export function getPostById(id: number, viewerId?: number) {
  const sql = withViewerFlags(
    `${POST_SELECT}
     FROM posts p ${POST_JOIN}
     WHERE p.id = ?`,
    viewerId
  );
  const row = db.prepare(sql).get(id) as unknown as PostRow | undefined;
  return row ? toPostWithMeta(row, viewerId) : null;
}

export function getUserByUsername(username: string) {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as unknown as User | undefined;
  return row ? toPublicUser(row) : null;
}

export function getUserPosts(
  username: string,
  viewerId?: number,
  includePrivate = false
): PostWithMeta[] {
  const user = getUserByUsername(username);
  if (!user) return [];
  const where = includePrivate
    ? "p.author_id = ? AND p.status IN ('draft','pending','approved','rejected')"
    : "p.author_id = ? AND p.status = 'approved'";
  const sql = withViewerFlags(
    `${POST_SELECT}
     FROM posts p ${POST_JOIN}
     WHERE ${where}
     ORDER BY p.published_at DESC, p.created_at DESC`,
    viewerId
  );
  const rows = db.prepare(sql).all(user.id) as unknown as PostRow[];
  return rows.map((r) => toPostWithMeta(r, viewerId));
}

export function getRelatedPosts(post: PostWithMeta, limit = 3) {
  if (!post.tagsList.length) return [];
  const placeholders = post.tagsList.map(() => "?");
  const params = post.tagsList.map((t) => `%,${t},%`);
  const rows = db
    .prepare(
      `${POST_SELECT}
       FROM posts p ${POST_JOIN}
       WHERE p.status = 'approved' AND p.id != ?
         AND (${placeholders
           .map(() => `(',' || p.tags || ',') LIKE ?`)
           .join(" OR ")})
       ORDER BY p.published_at DESC
       LIMIT ?`
    )
    .all(post.id, ...params, limit) as unknown as PostRow[];
  return rows.map((r) => toPostWithMeta(r));
}

export function getTopTags(limit = 12) {
  const rows = db
    .prepare(
      `SELECT tags FROM posts WHERE status = 'approved' AND tags != ''`
    )
    .all() as unknown as Array<{ tags: string }>;
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of parseTags(row.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function getVisibleComments(postId: number): Comment[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.username, u.display_name, u.avatar_seed
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? AND c.status = 'visible'
       ORDER BY c.created_at ASC`
    )
    .all(postId) as unknown as Array<
      Comment & { username: string; display_name: string; avatar_seed: string }
    >;
  return rows.map((r) => ({
    ...r,
    author: {
      id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      bio: "",
      website: "",
      avatar_seed: r.avatar_seed,
      role: "user" as const,
      created_at: 0,
    },
  }));
}

export function getNotifications(
  userId: number,
  limit = 30
): NotificationItem[] {
  const rows = db
    .prepare(
      `SELECT n.*, u.username, u.display_name, u.avatar_seed, p.slug AS post_slug, p.title AS post_title
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN posts p ON p.id = n.post_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as unknown as Array<
    NotificationItem & {
      username: string;
      display_name: string;
      avatar_seed: string;
    }
  >;
  return rows.map((r) => ({
    ...r,
    actor: r.actor_id
      ? {
          id: r.actor_id,
          username: r.username,
          display_name: r.display_name,
          bio: "",
          website: "",
          avatar_seed: r.avatar_seed,
          role: "user" as const,
          created_at: 0,
        }
      : undefined,
  }));
}

export function unreadNotificationCount(userId: number) {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0"
    )
    .get(userId) as unknown as { n: number };
  return Number(row.n);
}

export function getStats() {
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get() as unknown as {
    n: number;
  };
  const posts = db
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'approved'")
    .get() as unknown as { n: number };
  const likes = db.prepare("SELECT COUNT(*) AS n FROM likes").get() as unknown as {
    n: number;
  };
  const comments = db
    .prepare("SELECT COUNT(*) AS n FROM comments WHERE status = 'visible'")
    .get() as unknown as { n: number };
  return {
    users: Number(users.n),
    posts: Number(posts.n),
    likes: Number(likes.n),
    comments: Number(comments.n),
  };
}

export function getAllComments(limit = 60) {
  const rows = db
    .prepare(
      `SELECT c.*, u.username, u.display_name, p.title AS post_title, p.slug AS post_slug
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN posts p ON p.id = c.post_id
       ORDER BY c.created_at DESC
       LIMIT ?`
    )
    .all(limit) as unknown as Array<
    Comment & {
      username: string;
      display_name: string;
      post_title: string;
      post_slug: string;
    }
  >;
  return rows;
}
