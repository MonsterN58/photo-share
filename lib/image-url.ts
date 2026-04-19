const OPTIMIZED_REMOTE_HOSTS = new Set([
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
  "gitee.com",
]);

export function shouldBypassImageOptimization(src: string | null | undefined) {
  if (!src) {
    return true;
  }

  if (src.startsWith("/")) {
    return false;
  }

  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    return !OPTIMIZED_REMOTE_HOSTS.has(url.hostname);
  } catch {
    return true;
  }
}

