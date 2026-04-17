import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Maximum download size: 25 MB
const MAX_BYTES = 25 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "photo";
}

function createAsciiFilename(name: string) {
  return (
    sanitizeFilename(name)
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]+/g, "")
      .replace(/-+/g, "-")
      .trim() || "photo"
  );
}

function getExtension(contentType: string | null) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("avif")) return "avif";
  return "jpg";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Basic UUID validation to prevent path traversal
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();

  // Fetch photo record to verify allow_download
  const { data: photo, error } = await supabase
    .from("photos")
    .select("id, url, title, allow_download, is_public")
    .eq("id", id)
    .single();

  if (error || !photo) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!photo.allow_download) {
    return new NextResponse("Download not allowed", { status: 403 });
  }

  // For private photos, verify ownership
  if (!photo.is_public) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { data: owned } = await supabase
      .from("photos")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!owned) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Proxy the image to the client so the original URL stays hidden
  let imageResponse: Response;
  try {
    imageResponse = await fetch(photo.url, {
      headers: { "User-Agent": "NKU-Photo-Proxy/1.0" },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }

  if (!imageResponse.ok) {
    return new NextResponse("Image unavailable", { status: 502 });
  }

  const contentLength = Number(imageResponse.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return new NextResponse("File too large", { status: 413 });
  }

  const body = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type");
  const ext = getExtension(contentType);
  const utf8Filename = `${sanitizeFilename(photo.title as string)}.${ext}`;
  const asciiFilename = `${createAsciiFilename(photo.title as string)}.${ext}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      "Cache-Control": "no-store",
      // Prevent the browser from leaking the Referer header to the origin host
      "Referrer-Policy": "no-referrer",
    },
  });
}
