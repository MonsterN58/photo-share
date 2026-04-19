const OPTIMIZED_REMOTE_HOSTS = new Set([
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
  "gitee.com",
]);

export function shouldBypassImageOptimization(src: string | null | undefined) {
  if (!src) {
    return true;
  }

  // Local user uploads are already compressed by the browser before upload.
  // Serving them directly avoids unnecessary server-side re-encoding overhead.
  if (src.startsWith("/uploads/")) {
    return true;
  }

  // Other /public assets (logos, icons) can use Next.js optimization.
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

