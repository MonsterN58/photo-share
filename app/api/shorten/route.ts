import { NextRequest, NextResponse } from "next/server";
import { getDatabaseMode } from "@/lib/database-mode";
import { getOrCreateShortLink } from "@/lib/local-db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const photoId = body?.photoId;
  if (!photoId || typeof photoId !== "string") {
    return NextResponse.json({ error: "Missing photoId" }, { status: 400 });
  }

  const mode = getDatabaseMode();

  if (mode === "local") {
    try {
      const code = getOrCreateShortLink(photoId);
      const origin = request.headers.get("origin") || new URL(request.url).origin;
      return NextResponse.json({ code, url: `${origin}/s/${code}` });
    } catch (err) {
      console.error("Short link error:", err);
      return NextResponse.json({ error: "Failed to create short link" }, { status: 500 });
    }
  }

  // Supabase mode: use a deterministic code (no table needed if not set up)
  // Fall back to a base62 encoding of the first 8 bytes of UUID
  const code = photoId.replace(/-/g, "").slice(0, 9);
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return NextResponse.json({ code, url: `${origin}/s/${code}` });
}
