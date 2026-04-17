import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Album, Photo, Profile } from "@/types";
import { MyPhotosClient } from "./client";

export default async function MyPhotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data }, { data: albumData }, { data: profileData }] = await Promise.all([
    supabase
      .from("photos")
      .select("*, profiles(*), albums(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("albums")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const photos = (data as Photo[]) || [];
  const albums = (albumData as Album[]) || [];
  const profile = (profileData as Profile) || null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <MyPhotosClient photos={photos} albums={albums} profile={profile} />
    </div>
  );
}
