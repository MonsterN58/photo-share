"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import { isUsernameTaken, updateProfile, updateProfileAvatar } from "@/lib/local-db";
import { uploadImage } from "@/lib/storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validators";

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("unique constraint failed");
}

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
  const parsedUsername = usernameSchema.safeParse(username);

  if (!parsedUsername.success) return { error: parsedUsername.error.issues[0].message };
  if (bio.length > 200) return { error: "简介最多200字" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { data: existingProfiles, error: usernameLookupError } = await supabase
      .from("profiles")
      .select("id, username")
      .neq("id", user.id)
      .ilike("username", parsedUsername.data);

    if (usernameLookupError) return { error: usernameLookupError.message };
    if ((existingProfiles || []).some((profile) => profile.username?.toLowerCase() === parsedUsername.data.toLowerCase())) {
      return { error: "该用户名已被使用，请换一个用户名。" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: parsedUsername.data, bio: bio || null })
      .eq("id", user.id);

    if (error) return { error: error.message };
  } else {
    if (isUsernameTaken(parsedUsername.data, user.id)) {
      return { error: "该用户名已被使用，请换一个用户名。" };
    }

    try {
      updateProfile(user.id, { username: parsedUsername.data, bio: bio || null });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { error: "该用户名已被使用，请换一个用户名。" };
      }

      return { error: error instanceof Error ? error.message : "更新失败，请稍后再试。" };
    }
  }

  revalidatePath("/me");
  revalidatePath(`/user/${user.id}`);
  revalidatePath("/");
  revalidateTag("public-photos", "max");
  return { success: true };
}
