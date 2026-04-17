import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Photo } from "@/types";
import { MyPhotosClient } from "./client";

export default async function MyPhotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const photos = (data as Photo[]) || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的照片</h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {photos.length} 张照片
          </p>
        </div>
      </div>

      <MyPhotosClient photos={photos} />
    </div>
  );
}
