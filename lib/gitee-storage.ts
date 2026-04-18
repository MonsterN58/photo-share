const GITEE_API_BASE = process.env.GITEE_API_BASE?.trim() || "https://gitee.com/api/v5";
const DEFAULT_BRANCH = "master";
const DEFAULT_IMAGE_DIR = "uploads";
const DEFAULT_INITIAL_REPO = "picture";
const REPO_SIZE_LIMIT_KB = 3 * 1024 * 1024;
const MAX_REPO_COUNT = 100;
const REPO_CACHE_TTL_MS = 30 * 60 * 1000;
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

function getOptionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "webp";
  const ext = filename.slice(lastDot + 1).toLowerCase();
  return /^[a-z0-9]+$/.test(ext) ? ext : "webp";
}

function buildContentPath(filename: string): string {
  const imageDir = getOptionalEnv("GITEE_IMAGE_DIR", DEFAULT_IMAGE_DIR);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = getFileExtension(filename);
  const uniqueName = `${crypto.randomUUID()}.${ext}`;

  return [imageDir, year, month, uniqueName]
    .filter(Boolean)
    .join("/");
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildRawUrl(owner: string, repo: string, branch: string, contentPath: string): string {
  return `https://gitee.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/raw/${encodeURIComponent(branch)}/${encodePath(contentPath)}`;
}

interface GiteeCreateFileResponse {
  content?: {
    path?: string;
    download_url?: string | null;
  };
}

interface GiteeRepoInfo {
  size?: number;
  default_branch?: string;
  public?: boolean;
  private?: boolean;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions: RequestInit = { ...init };
      let timeout: ReturnType<typeof setTimeout> | undefined;

      if (typeof AbortController !== "undefined") {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 30_000);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(url, fetchOptions);
      if (timeout) clearTimeout(timeout);

      if (response.status >= 500 && attempt < retries) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
        );
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
        );
      }
    }
  }

  throw new Error(
    `Gitee API 请求失败（已重试 ${retries} 次）: ${lastError?.message || "未知错误"}`
  );
}

function withAccessToken(url: string, token: string): string {
  const target = new URL(url);
  target.searchParams.set("access_token", token);
  return target.toString();
}

async function getRepoInfo(
  owner: string,
  repo: string,
  token: string
): Promise<GiteeRepoInfo | null> {
  const response = await fetchWithRetry(
    withAccessToken(
      `${GITEE_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token
    )
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`获取 Gitee 仓库信息失败 (${response.status}): ${text}`);
  }

  const data = (await response.json()) as GiteeRepoInfo;
  return {
    size: data.size ?? 0,
    default_branch: data.default_branch || DEFAULT_BRANCH,
    public: data.public,
    private: data.private,
  };
}

async function createRepo(repoName: string, token: string): Promise<void> {
  const body = new URLSearchParams({
    access_token: token,
    name: repoName,
    description: "Photo storage repository - auto created",
    public: "1",
    private: "false",
    auto_init: "true",
  });

  const response = await fetchWithRetry(`${GITEE_API_BASE}/user/repos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`创建 Gitee 仓库 ${repoName} 失败: ${text}`);
  }
}

async function resolveActiveRepo(owner: string, token: string): Promise<string> {
  if (activeRepoCache && Date.now() - activeRepoCache.checkedAt < REPO_CACHE_TTL_MS) {
    return activeRepoCache.repo;
  }

  const initialRepo = getOptionalEnv("GITEE_REPO_NAME", DEFAULT_INITIAL_REPO);
  const candidates = [
    initialRepo,
    ...Array.from({ length: MAX_REPO_COUNT }, (_, i) =>
      i === 0 ? `${initialRepo}1` : `${initialRepo}${i + 1}`
    ),
  ];

  for (const repoName of candidates) {
    const info = await getRepoInfo(owner, repoName, token);

    if (info === null) {
      await createRepo(repoName, token);
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
      activeRepoCache = { repo: repoName, checkedAt: Date.now() };
      return repoName;
    }

    if (info.private === true || info.public === false) {
      throw new Error(`Gitee 仓库 ${repoName} 不是公开仓库，前端无法直接展示图片`);
    }

    if ((info.size ?? 0) < REPO_SIZE_LIMIT_KB) {
      activeRepoCache = { repo: repoName, checkedAt: Date.now() };
      return repoName;
    }
  }

  throw new Error("所有可用的 Gitee 仓库均已满，无法继续上传");
}

export async function uploadToGitee(
  fileBuffer: Buffer,
  filename: string
): Promise<{ url: string; path: string }> {
  const token = requireEnv("GITEE_TOKEN");
  const owner = requireEnv("GITEE_REPO_OWNER");
  const repo = await resolveActiveRepo(owner, token);
  const branch = getOptionalEnv("GITEE_REPO_BRANCH", DEFAULT_BRANCH);
  const contentPath = buildContentPath(filename);

  const body = new URLSearchParams({
    access_token: token,
    message: `upload image ${contentPath}`,
    content: fileBuffer.toString("base64"),
    branch,
  });

  const response = await fetchWithRetry(
    `${GITEE_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/contents/${encodePath(contentPath)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gitee 仓库上传失败 (${response.status}): ${text}`);
  }

  const result = (await response.json()) as GiteeCreateFileResponse;
  const uploadedPath = result.content?.path || contentPath;
  const url = result.content?.download_url || buildRawUrl(owner, repo, branch, uploadedPath);

  return {
    url,
    path: uploadedPath,
  };
}
