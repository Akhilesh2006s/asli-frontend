/**
 * Prefer the real previous page when it is same-origin; otherwise use fallback.
 * Avoids hardcoding /teacher/dashboard when the user came from Learning Paths, etc.
 */
export function goBackOrFallback(
  setLocation: (path: string, opts?: { replace?: boolean }) => void,
  fallbackPath: string,
  opts?: { replaceFallback?: boolean },
) {
  try {
    const ref = typeof document !== 'undefined' ? String(document.referrer || '') : '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin && ref.startsWith(origin) && window.history.length > 1) {
      window.history.back();
      return;
    }
  } catch {
    /* fall through */
  }
  setLocation(fallbackPath, opts?.replaceFallback ? { replace: true } : undefined);
}
