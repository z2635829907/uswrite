export type Role = "user" | "admin";
export type UserStatus = "active" | "banned";
export type PostStatus = "draft" | "pending" | "approved" | "rejected";
export type CommentStatus = "visible" | "hidden";

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  bio: string;
  website: string;
  avatar_seed: string;
  role: Role;
  status: UserStatus;
  created_at: number;
  updated_at: number;
}

export interface PublicUser {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  website: string;
  avatar_seed: string;
  role: Role;
  created_at: number;
}

export interface Post {
  id: number;
  author_id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_seed: string;
  tags: string;
  status: PostStatus;
  rejection_reason: string;
  views: number;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface PostWithMeta extends Post {
  author: PublicUser;
  tagsList: string[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  bookmarked_by_me: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  status: CommentStatus;
  created_at: number;
  author?: PublicUser;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  actor_id: number | null;
  type: "like" | "comment" | "review" | "system";
  post_id: number | null;
  content: string;
  read: number;
  created_at: number;
  actor?: PublicUser;
  post_slug?: string;
  post_title?: string;
}
