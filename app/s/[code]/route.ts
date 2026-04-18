import { NextRequest, NextResponse } from "next/server";
import { getDatabaseMode } from "@/lib/database-mode";
import { getPhotoIdByShortCode } from "@/lib/local-db";

interface Props {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { code } = await params;
  const mode = getDatabaseMode();

  if (mode === "local") {
    const photoId = getPhotoIdByShortCode(code);
    if (photoId) {
      return NextResponse.redirect(new URL(`/photo/${photoId}`, request.url));
    }
  } else {
    // Supabase mode: code is the first 9 chars of UUID without dashes
    // We need to query Supabase for a photo whose id starts with the reconstructed prefix
    // For now, redirect to home if not found
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("photos")
      .select("id")
      .ilike("id", `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}%`)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      return NextResponse.redirect(new URL(`/photo/${data.id}`, request.url));
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
