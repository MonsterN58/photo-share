const GITHUB_API_BASE = process.env.GITHUB_API_PROXY?.trim() || "https://api.github.com";
const DEFAULT_BRANCH = "main";
const DEFAULT_IMAGE_DIR = "uploads";
const INITIAL_REPO = "picture";
const REPO_SIZE_LIMIT_KB = 3 * 1024 * 1024; // 3 GB（单位 KB，GitHub API 返回 KB）
const MAX_REPO_COUNT = 100;
const REPO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟重检一次
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let activeRepoCache: { repo: string; checkedAt: number } | null = null;

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

interface GitHubRepoInfo {
  size: number;           // GitHub 返回的仓库大小，单位 KB
  default_branch: string;
}

/**
 * 带重试的 fetch 封装，兼容不挂代理时网络不稳定的情况。
 * 对网络错误和 5xx 错误进行重试，每次等待时间递增。
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions: RequestInit = { ...init };
      let timeout: ReturnType<typeof setTimeout> | undefined;
      // AbortController may not exist in very old Node environments
      if (typeof AbortController !== "undefined") {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 30_000);
        fetchOptions.signal = controller.signal;
      }
      const response = await fetch(url, fetchOptions);
      if (timeout) clearTimeout(timeout);
      // 5xx 服务端错误时重试
      if (response.status >= 500 && attempt < retries) {
        await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw new Error(
    `GitHub API 请求失败（已重试 ${retries} 次）: ${lastError?.message || "未知错误"}。` +
    `如果你没有使用代理，可以在 .env.local 中设置 GITHUB_API_PROXY 为 GitHub API 镜像地址。`
  );
}

async function getRepoInfo(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubRepoInfo | null> {
  const response = await fetchWithRetry(
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`获取仓库信息失败 (${response.status})`);
  }
  const data = (await response.json()) as GitHubRepoInfo;
  return { size: data.size, default_branch: data.default_branch };
}

async function createRepo(repoName: string, token: string): Promise<void> {
  const response = await fetchWithRetry(`${GITHUB_API_BASE}/user/repos`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      name: repoName,
      description: "Photo storage repository - auto created",
      private: false,
      auto_init: true,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`创建 GitHub 仓库 ${repoName} 失败: ${text}`);
  }
}

/**
 * 按顺序检测 picture → picture1 → picture2 → …，
 * 找到第一个存在且 < 3 GB 的仓库；若仓库不存在则自动创建。
 * 结果缓存 30 分钟，减少 API 调用。
 */
async function resolveActiveRepo(owner: string, token: string): Promise<string> {
  if (activeRepoCache && Date.now() - activeRepoCache.checkedAt < REPO_CACHE_TTL_MS) {
    return activeRepoCache.repo;
  }

  const candidates = [
    INITIAL_REPO,
    ...Array.from({ length: MAX_REPO_COUNT }, (_, i) => `picture${i + 1}`),
  ];

  for (const repoName of candidates) {
    const info = await getRepoInfo(owner, repoName, token);

    if (info === null) {
      // 仓库不存在，自动创建并使用
      await createRepo(repoName, token);
      // 等待 GitHub 完成初始化（生成默认分支）
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
      activeRepoCache = { repo: repoName, checkedAt: Date.now() };
      return repoName;
    }

    if (info.size < REPO_SIZE_LIMIT_KB) {
      activeRepoCache = { repo: repoName, checkedAt: Date.now() };
      return repoName;
    }
  }

  throw new Error("所有可用的 GitHub 仓库均已满，无法继续上传");
}

export async function uploadToGitHub(
  fileBuffer: Buffer,
  filename: string
): Promise<{ url: string; path: string }> {
  const token = requireEnv("GITHUB_TOKEN");
  const owner = requireEnv("GITHUB_REPO_OWNER");
  // 动态解析当前活跃仓库（自动容量检测 + 创建新仓库）
  const repo = await resolveActiveRepo(owner, token);
  const branch = process.env.GITHUB_REPO_BRANCH?.trim() || DEFAULT_BRANCH;
  const contentPath = buildContentPath(filename);

  const response = await fetchWithRetry(
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
