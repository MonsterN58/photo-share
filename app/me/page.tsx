import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getAlbumsForUserForMode, getPortfoliosForUserForMode, getProfileForMode, getUserPhotosForMode } from "@/lib/db-read";
import { MyPhotosClient } from "./client";

export default async function MyPhotosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const photos = await getUserPhotosForMode(user.id);
  const albums = await getAlbumsForUserForMode(user.id);
  const profile = await getProfileForMode(user.id);
  const portfolios = await getPortfoliosForUserForMode(user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <MyPhotosClient photos={photos} albums={albums} profile={profile} portfolios={portfolios} />
    </div>
  );
}
