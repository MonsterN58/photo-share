import { createClient } from "@/lib/supabase/server";
import { getPublicPhotos } from "@/lib/data";
import { MasonryGrid } from "@/components/photo/masonry-grid";
import { FilterBar } from "@/components/photo/filter-bar";
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

  // Merge per-user like state (non-cacheable, user-specific)
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
