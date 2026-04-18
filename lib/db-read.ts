import { createClient as createPublicSupabaseClient } from "@supabase/supabase-js";
import type { Album, Comment, Notification, Photo, Portfolio, Profile } from "@/types";
import { getDatabaseMode } from "@/lib/database-mode";
import { normalizePhotoAsset } from "@/lib/asset-url";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  getAlbumsForUser as getLocalAlbumsForUser,
  getCommentsForPhoto as getLocalCommentsForPhoto,
  getLikedPhotoIds as getLocalLikedPhotoIds,
  getNotificationsForUser as getLocalNotificationsForUser,
  getPhotoById as getLocalPhotoById,
  getPhotoMetadata as getLocalPhotoMetadata,
  getPortfolioById as getLocalPortfolioById,
  getPortfoliosForUser as getLocalPortfoliosForUser,
  getProfile as getLocalProfile,
  getPublicPhotos as getLocalPublicPhotos,
  getPublicPhotosForUser as getLocalPublicPhotosForUser,
  getPublicPortfolios as getLocalPublicPortfolios,
  getUnreadNotificationCount as getLocalUnreadNotificationCount,
  getUserPhotos as getLocalUserPhotos,
  getUserStats as getLocalUserStats,
  searchPublicPhotos as searchLocalPublicPhotos,
  withLikeState as withLocalLikeState,
} from "@/lib/local-db";

const PAGE_SIZE = 30;
let publicSupabase: ReturnType<typeof createPublicSupabaseClient> | null = null;

type ProfileIdRow = { id: string };

function getPublicSupabase() {
  if (!publicSupabase) {
    publicSupabase = createPublicSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return publicSupabase;
}

export async function getPublicPhotosForMode(sort: string, page?: number) {
  if (getDatabaseMode() === "local") {
    return getLocalPublicPhotos(sort, page);
  }

  const supabase = getPublicSupabase();
  let qb = supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("is_public", true);

  if (typeof page === "number") {
    qb = qb.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  }

  if (sort === "popular") {
    qb = qb.order("likes", { ascending: false }).order("views", { ascending: false });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }
  const { data } = await qb;
  return ((data as Photo[]) || []).map(normalizePhotoAsset);
}

export async function getSearchPhotosForMode(query: string, sort: string, page = 0) {
  if (getDatabaseMode() === "local") {
    return searchLocalPublicPhotos(query, sort, page);
  }

  const supabase = getPublicSupabase();
  const safeQuery = query.replace(/[%_,()]/g, " ").trim();

  const { data: matchedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", `%${safeQuery}%`);

  const authorIds =
    ((matchedProfiles as ProfileIdRow[] | null) || []).map((profile) => profile.id).filter(Boolean);

  const searchFilters = [
    `title.ilike.%${safeQuery}%`,
    `description.ilike.%${safeQuery}%`,
    ...(authorIds.length > 0 ? [`user_id.in.(${authorIds.join(",")})`] : []),
  ];

  let qb = supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("is_public", true);

  qb = qb
    .or(searchFilters.join(","))
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (sort === "popular") {
    qb = qb.order("likes", { ascending: false }).order("views", { ascending: false });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }
  const { data } = await qb;
  return ((data as Photo[]) || []).map(normalizePhotoAsset);
}

export async function attachLikeState(photos: Photo[], userId?: string | null) {
  if (!userId || photos.length === 0) return photos;

  if (getDatabaseMode() === "local") {
    return withLocalLikeState(photos, userId);
  }

  const supabase = await createSupabaseClient();
  const { data: likedRows } = await supabase
    .from("photo_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .in(
      "photo_id",
      photos.map((photo) => photo.id)
    );

  const likedIds = new Set(likedRows?.map((row) => row.photo_id as string) || []);
  return photos.map((photo) => ({
    ...photo,
    has_liked: likedIds.has(photo.id),
  }));
}

export async function getUserPhotosForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalUserPhotos(userId);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("photos")
    .select("*, profiles(*), albums(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data as Photo[]) || []).map(normalizePhotoAsset);
}

export async function getAlbumsForUserForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalAlbumsForUser(userId);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("albums")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data as Album[]) || [];
}

export async function getProfileForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalProfile(userId) || null;
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getPhotoByIdForMode(id: string) {
  if (getDatabaseMode() === "local") {
    return getLocalPhotoById(id);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase.from("photos").select("*, profiles(*)").eq("id", id).maybeSingle();
  return data ? normalizePhotoAsset(data as Photo) : null;
}

export async function getPhotoMetadataForMode(id: string) {
  if (getDatabaseMode() === "local") {
    return getLocalPhotoMetadata(id);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("photos")
    .select("title, description")
    .eq("id", id)
    .maybeSingle();

  return (data as Pick<Photo, "title" | "description"> | null) ?? undefined;
}

export async function getCommentsForPhotoForMode(photoId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalCommentsForPhoto(photoId);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("comments")
    .select("*, profiles(*)")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  return (data as Comment[]) || [];
}

export async function getLikedPhotoIdsForMode(userId: string, photoIds: string[]) {
  if (getDatabaseMode() === "local") {
    return getLocalLikedPhotoIds(userId, photoIds);
  }

  if (photoIds.length === 0) return new Set<string>();

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("photo_likes")
    .select("photo_id")
    .eq("user_id", userId)
    .in("photo_id", photoIds);

  return new Set((data || []).map((row) => row.photo_id as string));
}

// ============ Portfolio queries ============

export async function getPublicPortfoliosForMode(page = 0) {
  if (getDatabaseMode() === "local") {
    return getLocalPublicPortfolios(page);
  }

  // Remote mode - Supabase
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("portfolios")
    .select("*, profiles(*), albums(*)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);

  return (data as Portfolio[]) || [];
}

export async function getPortfoliosForUserForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalPortfoliosForUser(userId);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("portfolios")
    .select("*, profiles(*), albums(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data as Portfolio[]) || [];
}

export async function getPortfolioByIdForMode(id: string) {
  if (getDatabaseMode() === "local") {
    const row = getLocalPortfolioById(id);
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      album_id: row.album_id,
      title: row.title,
      description: row.description,
      cover_url: row.cover_url,
      is_public: Boolean(row.is_public),
      created_at: row.created_at,
      profiles: row.profile_id ? { id: row.profile_id, username: row.profile_username, avatar_url: row.profile_avatar_url, bio: row.profile_bio, cover_url: null, created_at: row.profile_created_at } : undefined,
    } as Portfolio;
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("portfolios")
    .select("*, profiles(*), albums(*)")
    .eq("id", id)
    .maybeSingle();

  return (data as Portfolio | null) ?? null;
}

// ============ Notification queries ============

export async function getNotificationsForMode(userId: string, unreadOnly = false) {
  if (getDatabaseMode() === "local") {
    const rows = getLocalNotificationsForUser(userId, unreadOnly);
    return rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type as "like" | "comment",
      from_user_id: row.from_user_id,
      photo_id: row.photo_id,
      comment_id: row.comment_id,
      is_read: Boolean(row.is_read),
      created_at: row.created_at,
      from_profile: row.from_username ? { id: row.from_user_id, username: row.from_username, avatar_url: row.from_avatar_url, bio: null, cover_url: null, created_at: "" } : undefined,
      photo_title: row.photo_title,
      comment_content: row.comment_content,
    })) as Notification[];
  }

  const supabase = await createSupabaseClient();
  let qb = supabase
    .from("notifications")
    .select("*, from_profile:profiles!notifications_from_user_id_fkey(*), photos(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    qb = qb.eq("is_read", false);
  }

  const { data } = await qb;
  return (data as Notification[]) || [];
}

export async function getUnreadNotificationCountForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalUnreadNotificationCount(userId);
  }

  const supabase = await createSupabaseClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return count || 0;
}

// ============ User profile queries ============

export async function getUserStatsForMode(userId: string) {
  if (getDatabaseMode() === "local") {
    return getLocalUserStats(userId);
  }

  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from("photos")
    .select("views, likes")
    .eq("user_id", userId);

  const stats = (data || []).reduce(
    (acc, row) => ({
      total_views: acc.total_views + (row.views || 0),
      total_likes: acc.total_likes + (row.likes || 0),
    }),
    { total_views: 0, total_likes: 0 }
  );

  return stats;
}

export async function getPublicPhotosForUserForMode(userId: string, page?: number) {
  if (getDatabaseMode() === "local") {
    return getLocalPublicPhotosForUser(userId, page);
  }

  const supabase = await createSupabaseClient();
  let qb = supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("user_id", userId)
    .eq("is_public", true);

  qb = qb.order("created_at", { ascending: false });

  if (typeof page === "number") {
    qb = qb.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  }

  const { data } = await qb;

  return ((data as Photo[]) || []).map(normalizePhotoAsset);
}
