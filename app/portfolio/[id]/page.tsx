import { notFound } from "next/navigation";
import { attachLikeState, getPortfolioByIdForMode } from "@/lib/db-read";
import { getCurrentUser } from "@/lib/auth-adapter";
import { PortfolioDetail } from "./client";
import type { Photo } from "@/types";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = await params;
  const portfolio = await getPortfolioByIdForMode(id);

  if (!portfolio) notFound();

  // Get photos in the album
  const { getUserPhotosForMode } = await import("@/lib/db-read");
  const [allPhotos, user] = await Promise.all([
    getUserPhotosForMode(portfolio.user_id),
    getCurrentUser(),
  ]);
  const albumPhotos = allPhotos.filter((p) => p.album_id === portfolio.album_id && p.is_public);
  const photos = (await attachLikeState(albumPhotos, user?.id)) as Photo[];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <PortfolioDetail portfolio={portfolio} photos={photos} />
    </div>
  );
}
