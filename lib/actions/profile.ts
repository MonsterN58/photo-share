"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadToGitHub } from "@/lib/github-storage";
import { revalidatePath, revalidateTag } from "next/cache";

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return { error: "请选择图片文件" };
  if (file.size > 5 * 1024 * 1024) return { error: "头像文件不能超过 5MB" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) return { error: "仅支持 JPG、PNG、WebP 或 GIF 格式" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToGitHub(buffer, `avatar-${file.name}`);

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);

    if (dbError) return { error: dbError.message };

    revalidatePath("/me");
    revalidatePath("/");
    revalidateTag("public-photos", "max");
    revalidateTag("search-photos", "max");
    return { success: true, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "上传失败" };
  }
}
