import fs from "node:fs";
import path from "node:path";

const DEFAULT_URL_PREFIX = "/uploads";

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "webp";
  const ext = filename.slice(lastDot + 1).toLowerCase();
  return /^[a-z0-9]+$/.test(ext) ? ext : "webp";
}

function getOutputRoot() {
  return path.join(process.cwd(), "public", "uploads");
}

function getUrlPrefix() {
  return DEFAULT_URL_PREFIX;
}

export async function uploadToLocal(
  fileBuffer: Buffer,
  filename: string
): Promise<{ url: string; path: string }> {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = getFileExtension(filename);
  const relativePath = [year, month, `${crypto.randomUUID()}.${ext}`].join("/");
  const outputRoot = getOutputRoot();
  const absolutePath = path.join(outputRoot, relativePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, fileBuffer);

  return {
    url: `${getUrlPrefix()}/${relativePath.replace(/\\/g, "/")}`,
    path: relativePath.replace(/\\/g, "/"),
  };
}
