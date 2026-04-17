"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normalizePhotoIds(photoIds: string[]) {
  return photoIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
}

export async function createAlbum(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (name.length < 1) return { error: "请输入相册名称" };
  if (name.length > 60) return { error: "相册名称最多 60 个字符" };
  if (description.length > 200) return { error: "相册描述最多 200 个字符" };

  const { data, error } = await supabase
    .from("albums")
    .insert({
      user_id: user.id,
      name,
      description: description || null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/me");
  return { success: true, album: data };
}

export async function deleteAlbum(albumId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };
  if (!albumId || !/^[0-9a-f-]{36}$/i.test(albumId)) return { error: "相册不存在" };

  const { error } = await supabase
    .from("albums")
    .delete()
    .eq("id", albumId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/me");
  return { success: true };
}

export async function assignPhotosToAlbum(photoIds: string[], albumId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const ids = normalizePhotoIds(photoIds);
  if (ids.length === 0) return { error: "请选择照片" };

  if (albumId) {
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .eq("user_id", user.id)
      .single();

    if (albumError || !album) return { error: "相册不存在" };
  }

  const { error } = await supabase
    .from("photos")
    .update({ album_id: albumId })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/me");
  return { success: true, updatedCount: ids.length };
}
