/** Module-level curriculum API cache (shared per browser tab). */

const responseCache = new Map<string, unknown>();
const MAX_CACHE = 80;

export function getCurriculumResponseCache<T>(key: string): T | undefined {
  return responseCache.get(key) as T | undefined;
}

export function setCurriculumResponseCache(key: string, val: unknown) {
  const payload = val as {
    success?: boolean;
    data?: unknown[] | { subjects?: unknown[]; topics?: unknown[]; subTopics?: unknown[] };
  };
  const data = payload?.data;
  const hasRows = Array.isArray(data)
    ? data.length > 0
    : Boolean(
        (data as { subjects?: unknown[] })?.subjects?.length ||
          (data as { topics?: unknown[] })?.topics?.length ||
          (data as { subTopics?: unknown[] })?.subTopics?.length
      );
  if (payload?.success === false || !hasRows) return;
  if (responseCache.size >= MAX_CACHE) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, val);
}

export function hasCurriculumResponseCache(key: string) {
  return responseCache.has(key);
}

export function clearCurriculumResponseCache() {
  responseCache.clear();
}
