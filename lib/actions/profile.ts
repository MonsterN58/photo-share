"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import { updateProfile, updateProfileAvatar } from "@/lib/local-db";
import { uploadImage } from "@/lib/storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function uploadAvatar(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return { error: "请选择图片文件" };
  if (file.size > 5 * 1024 * 1024) return { error: "头像文件不能超过 5MB" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) return { error: "仅支持 JPG、PNG、WebP 或 GIF 格式" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImage(buffer, `avatar-${file.name}`);

    if (getDatabaseMode() === "remote") {
      const supabase = await createSupabaseClient();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);

      if (dbError) return { error: dbError.message };
    } else {
      updateProfileAvatar(user.id, url);
    }

    revalidatePath("/me");
    revalidatePath("/");
    revalidateTag("public-photos", "max");
    revalidateTag("search-photos", "max");
    return { success: true, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "上传失败" };
  }
}

export async function uploadCover(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const file = formData.get("cover") as File;
  if (!file || file.size === 0) return { error: "请选择图片文件" };
  if (file.size > 10 * 1024 * 1024) return { error: "封面文件不能超过 10MB" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImage(buffer, `cover-${file.name}`);

    if (getDatabaseMode() === "remote") {
      const supabase = await createSupabaseClient();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ cover_url: url })
        .eq("id", user.id);

      if (dbError) return { error: dbError.message };
    } else {
      updateProfile(user.id, { cover_url: url });
    }

    revalidatePath("/me");
    revalidatePath(`/user/${user.id}`);
    return { success: true, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "上传失败" };
  }
}

export async function updateProfileInfo(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const username = String(formData.get("username") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!username || username.length > 30) return { error: "用户名不能为空且最多30字" };
  if (bio.length > 200) return { error: "简介最多200字" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username, bio: bio || null })
      .eq("id", user.id);

    if (error) return { error: error.message };
  } else {
    updateProfile(user.id, { username, bio: bio || null });
  }

  revalidatePath("/me");
  revalidatePath(`/user/${user.id}`);
  revalidatePath("/");
  revalidateTag("public-photos", "max");
  return { success: true };
}
