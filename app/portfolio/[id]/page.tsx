import { notFound } from "next/navigation";
import { getPortfolioByIdForMode, getPublicPhotosForUserForMode } from "@/lib/db-read";
import { getAlbumsForUserForMode } from "@/lib/db-read";
import { PortfolioDetail } from "./client";

interface PortfolioPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { id } = await params;
  const portfolio = await getPortfolioByIdForMode(id);

  if (!portfolio) notFound();

  // Get photos in the album
  const { getUserPhotosForMode } = await import("@/lib/db-read");
  const allPhotos = await getUserPhotosForMode(portfolio.user_id);
  const albumPhotos = allPhotos.filter((p) => p.album_id === portfolio.album_id && p.is_public);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <PortfolioDetail portfolio={portfolio} photos={albumPhotos} />
    </div>
  );
}
