"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import {
  deletePortfolioByOwner,
  getAlbumByOwner,
  getPortfolioByAlbum,
  insertPortfolio,
  updatePortfolioCoverByOwner,
} from "@/lib/local-db";
import { parseCoverUrls, serializeCoverUrls } from "@/lib/cover";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function publishPortfolio(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const albumId = String(formData.get("album_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const coverUrlInput = String(formData.get("cover_url") || "").trim();
  const coverUrl = coverUrlInput ? serializeCoverUrls(parseCoverUrls(coverUrlInput)) : null;
  const isPublic = formData.get("is_public") !== "false";

  if (!albumId || !/^[0-9a-f-]{36}$/i.test(albumId)) return { error: "请选择相册" };
  if (!title || title.length > 100) return { error: "请输入标题（最多100字）" };
  if (description.length > 500) return { error: "描述最多500字" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();

    // Verify album ownership
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .eq("user_id", user.id)
      .single();

    if (albumError || !album) return { error: "相册不存在" };

    // Check duplicate
    const { data: existing } = await supabase
      .from("portfolios")
      .select("id")
      .eq("album_id", albumId)
      .maybeSingle();

    if (existing) return { error: "该相册已发布为作品集" };

    const { error } = await supabase.from("portfolios").insert({
      user_id: user.id,
      album_id: albumId,
      title,
      description: description || null,
      cover_url: coverUrl,
      is_public: isPublic,
    });

    if (error) return { error: error.message };
  } else {
    if (!getAlbumByOwner(albumId, user.id)) return { error: "相册不存在" };
    if (getPortfolioByAlbum(albumId)) return { error: "该相册已发布为作品集" };

    insertPortfolio({
      userId: user.id,
      albumId,
      title,
      description: description || null,
      coverUrl,
      isPublic,
    });
  }

  revalidatePath("/portfolios");
  revalidatePath("/me");
  return { success: true };
}

export async function deletePortfolio(portfolioId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("portfolios")
      .delete()
      .eq("id", portfolioId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    deletePortfolioByOwner(portfolioId, user.id);
  }

  revalidatePath("/portfolios");
  revalidatePath("/me");
  return { success: true };
}

export async function updatePortfolioCover(portfolioId: string, coverUrl: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (!portfolioId || !/^[0-9a-f-]{36}$/i.test(portfolioId)) return { error: "无效的作品集" };
  const normalizedCoverUrl = serializeCoverUrls(parseCoverUrls(coverUrl));
  if (!normalizedCoverUrl) return { error: "请选择封面图片" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("portfolios")
      .update({ cover_url: normalizedCoverUrl })
      .eq("id", portfolioId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    const changed = updatePortfolioCoverByOwner(portfolioId, user.id, normalizedCoverUrl);
    if (!changed) return { error: "作品集不存在或无权限" };
  }

  revalidatePath("/portfolios");
  revalidatePath("/me");
  return { success: true };
}
