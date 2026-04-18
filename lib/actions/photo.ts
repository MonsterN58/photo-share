"use server";

import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import {
  deletePhotoByOwner,
  deletePhotosByOwner,
  getPhotoById,
  getPhotoByFileHash,
  incrementViews as incrementPhotoViews,
  insertNotification,
  insertPhoto,
  likePhotoOnce,
  unlikePhotoOnce,
  updatePhotoByOwner,
} from "@/lib/local-db";
import { uploadImage } from "@/lib/storage";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { editPhotoSchema, uploadSchema } from "@/lib/validators";

export async function uploadPhoto(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

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
  if (!file || file.size === 0) return { error: "请选择图片文件" };
  if (file.size > 20 * 1024 * 1024) return { error: "文件大小不能超过 20MB" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Check for duplicate image
    if (getDatabaseMode() === "remote") {
      const supabase = await createSupabaseClient();
      const { data: existing } = await supabase
        .from("photos")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("file_hash", fileHash)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return { error: `该图片已上传过（${existing.title}），请勿重复上传` };
      }
    } else {
      const existing = getPhotoByFileHash(user.id, fileHash);
      if (existing) {
        return { error: `该图片已上传过（${existing.title}），请勿重复上传` };
      }
    }

    const { url } = await uploadImage(buffer, file.name);

    let photoId: string | undefined;

    if (getDatabaseMode() === "remote") {
      const supabase = await createSupabaseClient();
      const { data, error: dbError } = await supabase.from("photos").insert({
        url,
        title: parsed.data.title,
        description: parsed.data.description || null,
        user_id: user.id,
        is_public: parsed.data.is_public,
        allow_download: parsed.data.allow_download,
        width,
        height,
        file_hash: fileHash,
      }).select("id").single();

      if (dbError) return { error: `保存失败: ${dbError.message}` };
      photoId = data?.id;
    } else {
      const photo = insertPhoto({
        url,
        title: parsed.data.title,
        description: parsed.data.description || null,
        userId: user.id,
        isPublic: parsed.data.is_public,
        allowDownload: parsed.data.allow_download,
        width,
        height,
        fileHash,
      });
      photoId = photo.id;
    }

    revalidatePath("/");
    revalidatePath("/me");
    revalidateTag("public-photos", "max");
    revalidateTag("search-photos", "max");
    return { success: true, url, photoId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return { error: message };
  }
}

export async function deletePhoto(photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    deletePhotoByOwner(photoId, user.id);
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function updatePhoto(photoId: string, formData: FormData) {
  const user = await getCurrentUser();
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

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
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
  } else {
    const changed = updatePhotoByOwner(photoId, user.id, {
      title: parsed.data.title,
      description: parsed.data.description || null,
      isPublic: parsed.data.is_public,
      allowDownload: parsed.data.allow_download,
    });

    if (!changed) return { error: "照片不存在或无权修改" };
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function incrementViews(photoId: string) {
  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    await supabase.rpc("increment_views", { photo_id: photoId });
    return;
  }

  incrementPhotoViews(photoId);
}

export async function likePhoto(photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();

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
      .select("likes, user_id")
      .eq("id", photoId)
      .single();

    if (photoError) return { error: photoError.message };

    const { error: updateError } = await supabase
      .from("photos")
      .update({ likes: (photo?.likes || 0) + 1 })
      .eq("id", photoId);

    if (updateError) return { error: updateError.message };

    // Create notification for remote mode
    if (photo?.user_id && photo.user_id !== user.id) {
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", photo.user_id)
        .eq("type", "like")
        .eq("from_user_id", user.id)
        .eq("photo_id", photoId)
        .is("comment_id", null)
        .limit(1)
        .maybeSingle();

      if (!existingNotification) {
        await supabase.from("notifications").insert({
          user_id: photo.user_id,
          type: "like",
          from_user_id: user.id,
          photo_id: photoId,
          comment_id: null,
        });
      }
    }
  } else {
    const photo = getPhotoById(photoId);
    if (!photo) return { error: "照片不存在" };
    if (!likePhotoOnce(photoId, user.id)) {
      return { error: "你已经给这张照片点过赞了" };
    }
    // Create notification
    insertNotification({
      userId: photo.user_id,
      type: "like",
      fromUserId: user.id,
      photoId,
      commentId: null,
    });
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function unlikePhoto(photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error: deleteError } = await supabase
      .from("photo_likes")
      .delete()
      .eq("photo_id", photoId)
      .eq("user_id", user.id);
    if (deleteError) return { error: deleteError.message };

    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("likes")
      .eq("id", photoId)
      .single();
    if (photoError) return { error: photoError.message };

    await supabase
      .from("photos")
      .update({ likes: Math.max(0, (photo?.likes || 1) - 1) })
      .eq("id", photoId);
  } else {
    unlikePhotoOnce(photoId, user.id);
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/photo/${photoId}`);
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true };
}

export async function deletePhotos(photoIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const ids = photoIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return { error: "请选择要删除的照片" };

  let deletedCount = 0;

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error, count } = await supabase
      .from("photos")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
    deletedCount = count || 0;
  } else {
    deletedCount = deletePhotosByOwner(ids, user.id);
  }

  revalidatePath("/");
  revalidatePath("/me");
  revalidateTag("public-photos", "max");
  revalidateTag("search-photos", "max");
  return { success: true, deletedCount };
}
