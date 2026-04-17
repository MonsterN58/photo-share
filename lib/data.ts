import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Photo } from "@/types";

const PAGE_SIZE = 30;
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/** Cached public photos for the home feed (no per-user like state). */
export const getPublicPhotos = unstable_cache(
  async (sort: string, page: number = 0) => {
    let qb = supabase
      .from("photos")
      .select("*, profiles(*)")
      .eq("is_public", true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sort === "popular") {
      qb = qb.order("likes", { ascending: false }).order("views", { ascending: false });
    } else {
      qb = qb.order("created_at", { ascending: false });
    }

    const { data } = await qb;
    return (data as Photo[]) || [];
  },
  ["public-photos"],
  { revalidate: 60, tags: ["public-photos"] }
);

/** Cached public photos for search (no per-user like state). */
export const getSearchPhotos = unstable_cache(
  async (query: string, sort: string) => {
    const safeQuery = query.replace(/[%_,()]/g, " ").trim();

    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${safeQuery}%`);

    const authorIds =
      matchedProfiles?.map((p) => p.id as string).filter(Boolean) || [];

    const searchFilters = [
      `title.ilike.%${safeQuery}%`,
      `description.ilike.%${safeQuery}%`,
      ...(authorIds.length > 0 ? [`user_id.in.(${authorIds.join(",")})`] : []),
    ];

    let qb = supabase
      .from("photos")
      .select("*, profiles(*)")
      .eq("is_public", true)
      .or(searchFilters.join(","))
      .range(0, PAGE_SIZE - 1);

    if (sort === "popular") {
      qb = qb.order("likes", { ascending: false }).order("views", { ascending: false });
    } else {
      qb = qb.order("created_at", { ascending: false });
    }

    const { data } = await qb;
    return (data as Photo[]) || [];
  },
  ["search-photos"],
  { revalidate: 30, tags: ["search-photos"] }
);
