export function shouldBypassImageOptimization(src: string | null | undefined) {
  return Boolean(src?.startsWith("/uploads/"));
}

