import { notFound } from "next/navigation";
import {
  attachLikeState,
  getProfileForMode,
  getUserStatsForMode,
  getPublicPhotosForUserForMode,
  getPortfoliosForUserForMode,
} from "@/lib/db-read";
import { getCurrentUser } from "@/lib/auth-adapter";
import { UserProfileClient } from "./client";
import type { Photo } from "@/types";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  const profile = await getProfileForMode(id);

  if (!profile) notFound();

  const [stats, basePhotos, portfolios, user] = await Promise.all([
    getUserStatsForMode(id),
    getPublicPhotosForUserForMode(id),
    getPortfoliosForUserForMode(id),
    getCurrentUser(),
  ]);
  const photos = (await attachLikeState(basePhotos, user?.id)) as Photo[];

  return (
    <UserProfileClient
      key={id}
      profile={profile}
      stats={stats}
      photos={photos}
      portfolios={portfolios}
    />
  );
}
