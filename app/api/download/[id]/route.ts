import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getPhotoByIdForMode } from "@/lib/db-read";

const MAX_BYTES = 25 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "photo"
  );
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

async function readLocalImage(urlPath: string) {
  const relativePath = urlPath.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  const normalizedPublicRoot = path.join(process.cwd(), "public");
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(normalizedPublicRoot);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("invalid local path");
  }

  const body = await fs.readFile(resolvedPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".avif"
            ? "image/avif"
            : "image/jpeg";

  return { body, contentType };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const photo = await getPhotoByIdForMode(id);
  if (!photo) return new NextResponse("Not found", { status: 404 });
  if (!photo.allow_download) return new NextResponse("Download not allowed", { status: 403 });

  if (!photo.is_public) {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });
    if (photo.user_id !== user.id) return new NextResponse("Forbidden", { status: 403 });
  }

  let body: ArrayBuffer;
  let contentType: string | null = null;

  if (photo.url.startsWith("/")) {
    try {
      const localFile = await readLocalImage(photo.url);
      if (localFile.body.byteLength > MAX_BYTES) {
        return new NextResponse("File too large", { status: 413 });
      }
      body = localFile.body.buffer.slice(
        localFile.body.byteOffset,
        localFile.body.byteOffset + localFile.body.byteLength
      );
      contentType = localFile.contentType;
    } catch {
      return new NextResponse("Image unavailable", { status: 502 });
    }
  } else {
    let imageResponse: Response;
    try {
      imageResponse = await fetch(photo.url, {
        headers: { "User-Agent": "NKU-Photo-Proxy/1.0" },
      });
    } catch {
      return new NextResponse("Failed to fetch image", { status: 502 });
    }

    if (!imageResponse.ok) return new NextResponse("Image unavailable", { status: 502 });

    const contentLength = Number(imageResponse.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BYTES) return new NextResponse("File too large", { status: 413 });

    body = await imageResponse.arrayBuffer();
    contentType = imageResponse.headers.get("content-type");
  }

  const ext = getExtension(contentType);
  const utf8Filename = `${sanitizeFilename(photo.title)}.${ext}`;
  const asciiFilename = `${createAsciiFilename(photo.title)}.${ext}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
