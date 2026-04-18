import { getPublicPhotos } from "@/lib/data";
import { MasonryGrid } from "@/components/photo/masonry-grid";
import { FilterBar } from "@/components/photo/filter-bar";
import { getCurrentUser } from "@/lib/auth-adapter";
import { attachLikeState } from "@/lib/db-read";
import type { Photo } from "@/types";
import { Suspense } from "react";

interface HomeProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const sort = params.sort || "latest";

  // Use cached query for public photos (no per-user data)
  let photos = await getPublicPhotos(sort);

  const user = await getCurrentUser();
  photos = (await attachLikeState(photos, user?.id)) as Photo[];

  return (
    <section className="mx-auto max-w-[1800px] sm:px-3 lg:px-4 pt-0 sm:pt-4 pb-16">
      <div className="flex items-center justify-end mb-3 px-3 sm:px-0 pt-3 sm:pt-0">
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>
      </div>
      <MasonryGrid
        key={`home:${sort}:${photos.length}`}
        initialPhotos={photos}
        sort={sort}
      />
    </section>
  );
}
