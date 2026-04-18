import { uploadToGitee } from "@/lib/gitee-storage";
import { uploadToGitHub } from "@/lib/github-storage";
import { uploadToLocal } from "@/lib/local-storage";

export type StorageMode = "gitee" | "github" | "local";

export function getStorageMode(): StorageMode {
  const mode = process.env.STORAGE_MODE?.trim().toLowerCase();
  if (mode === "github" || mode === "local" || mode === "gitee") {
    return mode;
  }
  return "gitee";
}

export async function uploadImage(
  fileBuffer: Buffer,
  filename: string
): Promise<{ url: string; path: string }> {
  const mode = getStorageMode();

  if (mode === "github") {
    return uploadToGitHub(fileBuffer, filename);
  }

  if (mode === "local") {
    return uploadToLocal(fileBuffer, filename);
  }

  return uploadToGitee(fileBuffer, filename);
}
