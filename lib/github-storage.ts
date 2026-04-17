const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_BRANCH = "main";
const DEFAULT_IMAGE_DIR = "uploads";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "webp";
  const ext = filename.slice(lastDot + 1).toLowerCase();
  return /^[a-z0-9]+$/.test(ext) ? ext : "webp";
}

function buildContentPath(filename: string): string {
  const imageDir = process.env.GITHUB_IMAGE_DIR?.trim() || DEFAULT_IMAGE_DIR;
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = getFileExtension(filename);
  const uniqueName = `${crypto.randomUUID()}.${ext}`;

  return [imageDir, year, month, uniqueName]
    .filter(Boolean)
    .join("/");
}

function buildRawUrl(owner: string, repo: string, branch: string, contentPath: string): string {
  const encodedPath = contentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/${encodeURIComponent(branch)}/${encodedPath}`;
}

function buildCdnUrl(owner: string, repo: string, branch: string, contentPath: string): string {
  const encodedPath = contentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://cdn.jsdelivr.net/gh/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}@${encodeURIComponent(branch)}/${encodedPath}`;
}

interface GitHubCreateFileResponse {
  content?: {
    path?: string;
    download_url?: string | null;
  };
}

export async function uploadToGitHub(
  fileBuffer: Buffer,
  filename: string
): Promise<{ url: string; path: string }> {
  const token = requireEnv("GITHUB_TOKEN");
  const owner = requireEnv("GITHUB_REPO_OWNER");
  const repo = requireEnv("GITHUB_REPO_NAME");
  const branch = process.env.GITHUB_REPO_BRANCH?.trim() || DEFAULT_BRANCH;
  const contentPath = buildContentPath(filename);

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/contents/${contentPath}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `upload image ${contentPath}`,
        content: fileBuffer.toString("base64"),
        branch,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub 仓库上传失败 (${response.status}): ${text}`);
  }

  const result = (await response.json()) as GitHubCreateFileResponse;
  const uploadedPath = result.content?.path || contentPath;
  const fallbackUrl =
    result.content?.download_url || buildRawUrl(owner, repo, branch, uploadedPath);
  const url = process.env.GITHUB_IMAGE_CDN === "raw"
    ? fallbackUrl
    : buildCdnUrl(owner, repo, branch, uploadedPath);

  return {
    url,
    path: uploadedPath,
  };
}
