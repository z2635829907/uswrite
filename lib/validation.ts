import { z } from "zod";
import { CATEGORIES } from "./categories";

export const registerSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  displayName: z.string().min(1, "昵称不能为空").max(20, "昵称最多 20 个字符"),
});

export const loginSchema = z.object({
  account: z.string().min(1, "请输入用户名或邮箱"),
  password: z.string().min(1, "请输入密码"),
});

export const postSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(80, "标题最多 80 个字符"),
  content: z.string().min(1, "内容不能为空").max(50000, "内容过长"),
  excerpt: z.string().max(200, "摘要最多 200 个字符").optional().default(""),
  tags: z.string().max(80, "标签过长").optional().default(""),
  coverSeed: z.string().max(100, "封面种子过长").optional().default(""),
  category: z
    .enum([...CATEGORIES.map((c) => c.key), "uncategorized"] as const)
    .optional()
    .default("uncategorized"),
  action: z.enum(["draft", "submit"]),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "评论不能为空")
    .max(1000, "评论最多 1000 个字符"),
});

export const profileSchema = z.object({
  displayName: z.string().min(1, "昵称不能为空").max(20, "昵称最多 20 个字符"),
  bio: z.string().max(200, "简介最多 200 个字符").optional().default(""),
  website: z
    .string()
    .max(200, "网址过长")
    .optional()
    .default("")
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "网址需以 http(s):// 开头"),
  avatarSeed: z.string().max(100).optional().default(""),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(8, "新密码至少 8 位"),
});
