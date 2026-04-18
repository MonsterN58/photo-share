import type { Photo } from "@/types";

const DEFAULT_GITHUB_BRANCH = "main";

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getGitHubAssetBase() {
  const owner = process.env.GITHUB_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_REPO_NAME?.trim();
  const branch = process.env.GITHUB_REPO_BRANCH?.trim() || DEFAULT_GITHUB_BRANCH;

  if (!owner || !repo) {
    return null;
  }

  if (process.env.GITHUB_IMAGE_CDN?.trim() === "raw") {
    return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/${encodeURIComponent(branch)}`;
  }

  return `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}@${encodeURIComponent(branch)}`;
}

function extractLegacyRepoPath(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "gitee.com") {
      return null;
    }

    const match = parsed.pathname.match(/^\/[^/]+\/[^/]+\/raw\/[^/]+\/(.+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function normalizeAssetUrl(url: string) {
  const githubBase = getGitHubAssetBase();
  if (!githubBase) {
    return url;
  }

  const legacyPath = extractLegacyRepoPath(url);
  if (!legacyPath) {
    return url;
  }

  return `${githubBase}/${encodePath(legacyPath)}`;
}

export function normalizePhotoAsset<T extends Photo>(photo: T): T {
  const normalizedUrl = normalizeAssetUrl(photo.url);
  if (normalizedUrl === photo.url) {
    return photo;
  }

  return {
    ...photo,
    url: normalizedUrl,
  };
}
