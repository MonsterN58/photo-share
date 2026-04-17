"use client";

import { PhotoCard } from "./photo-card";
import type { Photo } from "@/types";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface MasonryGridProps {
  initialPhotos: Photo[];
  query?: string;
  sort?: string;
  userId?: string;
}

const PAGE_SIZE = 20;
const SKELETON_HEIGHTS = [260, 340, 300, 380];

export function MasonryGrid({ initialPhotos, query, sort, userId }: MasonryGridProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPhotos.length >= PAGE_SIZE);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const supabase = createClient();
    let qb = supabase
      .from("photos")
      .select("*, profiles(*)")
      .eq("is_public", true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (query) {
      qb = qb.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (userId) {
      qb = qb.eq("user_id", userId);
    }
    if (sort === "popular") {
      qb = qb.order("views", { ascending: false });
    } else {
      qb = qb.order("created_at", { ascending: false });
    }

    const { data } = await qb;
    const newPhotos = (data as Photo[]) || [];

    if (newPhotos.length < PAGE_SIZE) setHasMore(false);
    setPhotos((prev) => [...prev, ...newPhotos]);
    setPage((p) => p + 1);
    setLoading(false);
  }, [loading, hasMore, page, query, sort, userId]);

  useEffect(() => {
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
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

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {photos.map((photo) => (
          <div key={photo.id} className="break-inside-avoid">
            <PhotoCard photo={photo} />
          </div>
        ))}
        {loading &&
          SKELETON_HEIGHTS.map((height, i) => (
            <div key={`skeleton-${i}`} className="break-inside-avoid">
              <Skeleton
                className="w-full rounded-lg"
                style={{ height: `${height}px` }}
              />
            </div>
          ))}
      </div>
      <div ref={observerRef} className="h-10" />
    </>
  );
}
