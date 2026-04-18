import { z } from "zod";

export const mainstreamEmailDomains = new Set([
  "qq.com",
  "foxmail.com",
  "163.com",
  "126.com",
  "yeah.net",
  "sina.com",
  "sina.cn",
  "sohu.com",
  "aliyun.com",
  "189.cn",
  "139.com",
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "yahoo.co.jp",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "gmx.com",
  "nankai.edu.cn",
  "mail.nankai.edu.cn",
]);

export function isMainstreamEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(1);
  return Boolean(domain && mainstreamEmailDomains.has(domain));
}

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "用户名至少 2 个字符")
  .max(30, "用户名最多 30 个字符");

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("请输入有效的邮箱地址")
    .refine(isMainstreamEmail, "注册仅支持国内外主流邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
  username: usernameSchema,
  agreeTerms: z.preprocess(
    (value) => value === "on",
    z.literal(true, { error: "请先阅读并同意用户协议与隐私说明" }),
  ),
});

export const uploadSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多 100 个字符"),
  description: z.string().max(500, "描述最多 500 个字符").optional(),
  is_public: z.boolean().default(true),
  allow_download: z.boolean().default(true),
});

export const commentSchema = z.object({
  content: z.string().min(1, "评论不能为空").max(500, "评论最多 500 个字符"),
  parent_id: z.string().uuid().optional().nullable(),
});

export const editPhotoSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多 100 个字符"),
  description: z.string().max(500, "描述最多 500 个字符").optional(),
  is_public: z.boolean(),
  allow_download: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type EditPhotoInput = z.infer<typeof editPhotoSchema>;
