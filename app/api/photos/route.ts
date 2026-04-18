import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getPublicPhotosForMode, getSearchPhotosForMode, attachLikeState } from "@/lib/db-read";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") || 0));
  const sort = url.searchParams.get("sort") || "latest";
  const query = url.searchParams.get("query") || "";
  const user = await getCurrentUser();

  const basePhotos = query.trim()
    ? await getSearchPhotosForMode(query, sort, page)
    : await getPublicPhotosForMode(sort, page);
  const photos = await attachLikeState(basePhotos, user?.id);

  return NextResponse.json({ photos });
}
