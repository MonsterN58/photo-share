export function parseCoverUrls(coverUrl: string | null | undefined): string[] {
  if (!coverUrl) return [];

  const trimmed = coverUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4);
      }
    } catch {
      return [trimmed];
    }
  }

  return [trimmed];
}

export function serializeCoverUrls(urls: string[]): string {
  const normalized = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).slice(0, 4);
  return normalized.length === 1 ? normalized[0] : JSON.stringify(normalized);
}

