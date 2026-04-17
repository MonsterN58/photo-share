"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { uploadToGitHub } from "@/lib/github-storage";
import { createClient } from "@/lib/supabase/server";
import { editPhotoSchema, uploadSchema } from "@/lib/validators";

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
  const allowDownload = formData.get("allow_download") !== "false";
  const width = parseInt(formData.get("width") as string) || 0;
  const height = parseInt(formData.get("height") as string) || 0;

  const parsed = uploadSchema.safeParse({
    title,
    description,
    is_public: isPublic,
    allow_download: allowDownload,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { error: "请选择图片文件" };
  }

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
      allow_download: parsed.data.allow_download,
      width,
      height,
    });

    if (dbError) {
      return { error: `保存失败: ${dbError.message}` };
    }

    revalidatePath("/");
    revalidatePath("/me");
    revalidateTag("public-photos", "max");
    revalidateTag("search-photos", "max");
    return { success: true, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
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
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
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
    allow_download: formData.get("allow_download") !== "false",
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
      allow_download: parsed.data.allow_download,
    })
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function incrementViews(photoId: string) {
  const supabase = await createClient();
  await supabase.rpc("increment_views", { photo_id: photoId });
}

export async function likePhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const { data: existingLike, error: selectError } = await supabase
    .from("photo_likes")
    .select("photo_id")
    .eq("photo_id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) return { error: selectError.message };
  if (existingLike) return { error: "你已经给这张照片点过赞了" };

  const { error: insertError } = await supabase.from("photo_likes").insert({
    photo_id: photoId,
    user_id: user.id,
  });

  if (insertError) {
    if ("code" in insertError && insertError.code === "23505") {
      return { error: "你已经给这张照片点过赞了" };
    }
    return { error: insertError.message };
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("likes")
    .eq("id", photoId)
    .single();

  if (photoError) return { error: photoError.message };

  const { error: updateError } = await supabase
    .from("photos")
    .update({ likes: (photo?.likes || 0) + 1 })
    .eq("id", photoId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function deletePhotos(photoIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const ids = photoIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return { error: "请选择要删除的照片" };

  const { error } = await supabase
    .from("photos")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/me");
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true, deletedCount: ids.length };
}
