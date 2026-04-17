import { createClient } from "@/lib/supabase/server";
import { getSearchPhotos } from "@/lib/data";
import { MasonryGrid } from "@/components/photo/masonry-grid";
import { FilterBar } from "@/components/photo/filter-bar";
import { SearchBar } from "@/components/photo/search-bar";
import type { Photo } from "@/types";
import { Suspense } from "react";
import { Search } from "lucide-react";

interface SearchProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export const metadata = {
  title: "搜索 - NKU印象",
};

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const query = params.q || "";
  const sort = params.sort || "latest";

  let photos: Photo[] = [];

  if (query) {
    // Use cached query for public photos
    photos = await getSearchPhotos(query, sort);

    // Merge per-user like state
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && photos.length > 0) {
      const { data: likedRows } = await supabase
        .from("photo_likes")
        .select("photo_id")
        .eq("user_id", user.id)
        .in(
          "photo_id",
          photos.map((photo) => photo.id)
        );
      const likedIds = new Set(likedRows?.map((row) => row.photo_id as string) || []);
      photos = photos.map((photo) => ({
        ...photo,
        has_liked: likedIds.has(photo.id),
      })) as Photo[];
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="max-w-2xl mx-auto mb-10 space-y-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">搜索照片</h1>
        <p className="text-sm text-gray-500">按标题、描述或作者发现校园印象</p>
        <Suspense
          fallback={
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse mt-4" />
          }
        >
          <SearchBar className="mt-4" />
        </Suspense>
      </div>

      {query ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              &ldquo;{query}&rdquo; 的搜索结果 · {photos.length} 张
            </p>
            <Suspense fallback={null}>
              <FilterBar />
            </Suspense>
          </div>
          <MasonryGrid
            key={`search:${query}:${sort}`}
            initialPhotos={photos}
            query={query}
            sort={sort}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <Search className="h-12 w-12 mb-3" />
          <p className="text-sm text-gray-400">输入关键词开始搜索</p>
        </div>
      )}
    </div>
  );
}
