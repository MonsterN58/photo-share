"use client";

import { PhotoCard } from "./photo-card";
import type { Photo } from "@/types";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileSearchRow = {
  id: string;
};

type PhotoLikeRow = {
  photo_id: string;
};

interface MasonryGridProps {
  initialPhotos: Photo[];
  query?: string;
  sort?: string;
  userId?: string;
}

const PAGE_SIZE = 30;

// ─── In-memory pagination cache ────────────────────────────────────────────
// Keyed by "sort:query:userId" so each unique feed maintains its own page cache.
const pageCache = new Map<string, { photos: Photo[]; page: number; hasMore: boolean }>();

function getCacheKey(sort?: string, query?: string, userId?: string) {
  return `${sort || "latest"}:${query || ""}:${userId || ""}`;
}
// ────────────────────────────────────────────────────────────────────────────

function useColumnCount() {
  const [count, setCount] = useState(0); // 0 = SSR/unmounted, measured after mount
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCount(1);
      else if (w < 1024) setCount(2);
      else if (w < 1536) setCount(3);
      else setCount(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return count;
}

function distributeToColumns(photos: Photo[], numColumns: number): Photo[][] {
  if (numColumns <= 1) {
    return [photos];
  }

  const columns: Photo[][] = Array.from({ length: numColumns }, () => []);
  const heights = new Array(numColumns).fill(0);
  for (const photo of photos) {
    const ar = photo.height && photo.width ? photo.height / photo.width : 0.75;
    let minIdx = 0;
    for (let i = 1; i < numColumns; i++) {
      if (heights[i] < heights[minIdx]) minIdx = i;
    }
    columns[minIdx].push(photo);
    heights[minIdx] += ar;
  }
  return columns;
}

interface MasonryGridProps {
  initialPhotos: Photo[];
  query?: string;
  sort?: string;
  userId?: string;
  onRefresh?: () => void;
}

export function MasonryGrid({ initialPhotos, query, sort, userId }: MasonryGridProps) {
  const cacheKey = getCacheKey(sort, query, userId);
  const cached = pageCache.get(cacheKey);

  const [photos, setPhotos] = useState<Photo[]>(cached?.photos ?? initialPhotos);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(cached !== undefined ? cached.hasMore : initialPhotos.length >= PAGE_SIZE);
  const [page, setPage] = useState(cached?.page ?? 1);
  const observerRef = useRef<HTMLDivElement>(null);
  const numColumns = useColumnCount();
  const columns = useMemo(() => distributeToColumns(photos, numColumns), [photos, numColumns]);

  // Keep cache in sync with state changes
  const syncCache = useCallback((nextPhotos: Photo[], nextPage: number, nextHasMore: boolean) => {
    pageCache.set(cacheKey, { photos: nextPhotos, page: nextPage, hasMore: nextHasMore });
  }, [cacheKey]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const supabase = createClient();
    let searchFilters: string[] = [];
    if (query) {
      const safeQuery = query.replace(/[%_,()]/g, " ").trim();
      const { data: matchedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", `%${safeQuery}%`);
      const authorIds =
        (matchedProfiles as ProfileSearchRow[] | null)?.map((profile) => profile.id).filter(Boolean) || [];

      searchFilters = [
        `title.ilike.%${safeQuery}%`,
        `description.ilike.%${safeQuery}%`,
        ...(authorIds.length > 0 ? [`user_id.in.(${authorIds.join(",")})`] : []),
      ];
    }

    let qb = supabase
      .from("photos")
      .select("*, profiles(*)")
      .eq("is_public", true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (searchFilters.length > 0) {
      qb = qb.or(searchFilters.join(","));
    }
    if (userId) {
      qb = qb.eq("user_id", userId);
    }
    if (sort === "popular") {
      qb = qb.order("likes", { ascending: false }).order("views", { ascending: false });
    } else {
      qb = qb.order("created_at", { ascending: false });
    }

    const { data } = await qb;
    let newPhotos = (data as Photo[]) || [];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && newPhotos.length > 0) {
      const { data: likedRows } = await supabase
        .from("photo_likes")
        .select("photo_id")
        .eq("user_id", user.id)
        .in(
          "photo_id",
          newPhotos.map((photo) => photo.id)
        );
      const likedIds = new Set(
        (likedRows as PhotoLikeRow[] | null)?.map((row) => row.photo_id) || []
      );
      newPhotos = newPhotos.map((photo) => ({
        ...photo,
        has_liked: likedIds.has(photo.id),
      }));
    }

    if (newPhotos.length < PAGE_SIZE) setHasMore(false);
    setPhotos((prev) => {
      const next = [...prev, ...newPhotos];
      syncCache(next, page + 1, newPhotos.length >= PAGE_SIZE);
      return next;
    });
    setPage((p) => p + 1);
    setLoading(false);
  }, [loading, hasMore, page, query, sort, userId, syncCache]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  if (photos.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm">还没有照片</p>
      </div>
    );
  }

  // numColumns === 0 means we haven't measured the client window yet (SSR / before mount).
  // Render a single invisible placeholder to avoid hydration mismatch.
  if (numColumns === 0) {
    return (
      <div className="flex flex-col">
        {photos.map((photo) => (
          <div key={photo.id} className="opacity-0">
            <PhotoCard photo={photo} trackViews={false} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex sm:gap-3 items-start">
        {columns.map((colPhotos, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col sm:gap-3 min-w-0">
            {colPhotos.map((photo) => (
              <div key={photo.id}>
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>
        ))}
        {loading &&
          Array.from({ length: numColumns }).map((_, colIdx) => (
            <div key={`skel-col-${colIdx}`} className="flex-1 flex flex-col sm:gap-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${colIdx}-${i}`}
                  className="w-full sm:rounded-lg bg-gray-100 animate-pulse"
                  style={{ height: `${160 + ((colIdx * 3 + i) % 5) * 50}px` }}
                />
              ))}
            </div>
          ))}
      </div>
      <div ref={observerRef} className="h-10" />
    </>
  );
}
