import { notFound } from "next/navigation";
import {
  attachLikeState,
  getPortfolioByIdForMode,
  getPublicPhotosForAlbumForMode,
} from "@/lib/db-read";
import { getCurrentUser } from "@/lib/auth-adapter";
import { PortfolioDetail } from "./client";
import type { Photo } from "@/types";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = await params;
  const [portfolio, user] = await Promise.all([
    getPortfolioByIdForMode(id),
    getCurrentUser(),
  ]);

  if (!portfolio) notFound();
  if (!portfolio.is_public && user?.id !== portfolio.user_id) notFound();

  const albumPhotos = await getPublicPhotosForAlbumForMode(portfolio.album_id);
  const photos = (await attachLikeState(albumPhotos, user?.id)) as Photo[];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <PortfolioDetail portfolio={portfolio} photos={photos} />
    </div>
  );
}
