import { unstable_cache } from "next/cache";
import { getPublicPhotosForMode, getSearchPhotosForMode } from "@/lib/db-read";

export const getPublicPhotos = unstable_cache(
  async (sort: string, page?: number) => {
    return getPublicPhotosForMode(sort, page);
  },
  ["public-photos"],
  { revalidate: 60, tags: ["public-photos"] }
);

export const getSearchPhotos = unstable_cache(
  async (query: string, sort: string, page: number = 0) => {
    return getSearchPhotosForMode(query, sort, page);
  },
  ["search-photos"],
  { revalidate: 30, tags: ["search-photos"] }
);
