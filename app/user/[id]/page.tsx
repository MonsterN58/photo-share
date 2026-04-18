import { notFound } from "next/navigation";
import {
  getProfileForMode,
  getUserStatsForMode,
  getPublicPhotosForUserForMode,
  getPortfoliosForUserForMode,
} from "@/lib/db-read";
import { UserProfileClient } from "./client";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  const profile = await getProfileForMode(id);

  if (!profile) notFound();

  const [stats, photos, portfolios] = await Promise.all([
    getUserStatsForMode(id),
    getPublicPhotosForUserForMode(id),
    getPortfoliosForUserForMode(id),
  ]);

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
