import { createClient } from "@/lib/supabase/server";
import { MasonryGrid } from "@/components/photo/masonry-grid";
import { SearchBar } from "@/components/photo/search-bar";
import { FilterBar } from "@/components/photo/filter-bar";
import type { Photo } from "@/types";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params.q || "";
  const sort = params.sort || "latest";

  const supabase = await createClient();

  let qb = supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("is_public", true)
    .range(0, 19);

  if (query) {
    qb = qb.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  if (sort === "popular") {
    qb = qb.order("views", { ascending: false });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }

  const { data } = await qb;
  const photos = (data as Photo[]) || [];

  return (
    <>
      {/* Hero / Search Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              发现精彩瞬间
            </h1>
            <p className="text-gray-500 text-base sm:text-lg">
              来自创作者的高质量摄影作品
            </p>
            <Suspense fallback={<Skeleton className="h-12 w-full rounded-xl" />}>
              <SearchBar className="max-w-xl mx-auto" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Filter bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {query && (
              <p className="text-sm text-gray-500">
                搜索 &ldquo;{query}&rdquo; 的结果
              </p>
            )}
          </div>
          <Suspense fallback={null}>
            <FilterBar />
          </Suspense>
        </div>

        <MasonryGrid
          key={`${query}:${sort}:${photos.map((photo) => photo.id).join(",")}`}
          initialPhotos={photos}
          query={query}
          sort={sort}
        />
      </section>
    </>
  );
}
