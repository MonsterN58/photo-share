"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadToGitHub } from "@/lib/github-storage";
import { uploadSchema, editPhotoSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function uploadPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "请先登录" };
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const isPublic = formData.get("is_public") === "true";
  const width = parseInt(formData.get("width") as string) || 0;
  const height = parseInt(formData.get("height") as string) || 0;

  const parsed = uploadSchema.safeParse({
    title,
    description,
    is_public: isPublic,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { error: "请选择图片文件" };
  }

  // 限制文件大小 20MB
  if (file.size > 20 * 1024 * 1024) {
    return { error: "文件大小不能超过 20MB" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToGitHub(buffer, file.name);

    const { error: dbError } = await supabase.from("photos").insert({
      url,
      title: parsed.data.title,
      description: parsed.data.description || null,
      user_id: user.id,
      is_public: parsed.data.is_public,
      width,
      height,
    });

    if (dbError) {
      return { error: "保存失败: " + dbError.message };
    }

    revalidatePath("/");
    revalidatePath("/me");
    return { success: true, url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "上传失败";
    return { error: message };
  }
}

export async function deletePhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  return { success: true };
}

export async function updatePhoto(photoId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const parsed = editPhotoSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    is_public: formData.get("is_public") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("photos")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      is_public: parsed.data.is_public,
    })
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function incrementViews(photoId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_views", { photo_id: photoId });
}
