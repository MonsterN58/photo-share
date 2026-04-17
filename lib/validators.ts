import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
  username: z.string().min(2, "用户名至少 2 个字符").max(30, "用户名最多 30 个字符"),
});

export const uploadSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多 100 个字符"),
  description: z.string().max(500, "描述最多 500 个字符").optional(),
  is_public: z.boolean().default(true),
});

export const commentSchema = z.object({
  content: z.string().min(1, "评论不能为空").max(500, "评论最多 500 个字符"),
  parent_id: z.string().uuid().optional().nullable(),
});

export const editPhotoSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多 100 个字符"),
  description: z.string().max(500, "描述最多 500 个字符").optional(),
  is_public: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type EditPhotoInput = z.infer<typeof editPhotoSchema>;
