/**
 * Cached / deduplicated auth session fetch — avoids duplicate /api/auth/me on every page.
 */

import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken, getUser, setUser } from '@/lib/auth-utils';

const AUTH_CACHE_MS = 90_000;

let cachedUser: unknown = null;
let cachedAt = 0;
let inflight: Promise<unknown> | null = null;

export function peekCachedAuthUser(): unknown {
  if (cachedUser && Date.now() - cachedAt < AUTH_CACHE_MS) return cachedUser;
  return getUser();
}

export function invalidateAuthSessionCache(): void {
  cachedUser = null;
  cachedAt = 0;
  inflight = null;
}

/**
 * Fetch current user once; reuse cache and coalesce parallel calls.
 */
export async function fetchAuthUser(options: { force?: boolean } = {}): Promise<unknown | null> {
  const token = getAuthToken();
  if (!token) {
    invalidateAuthSessionCache();
    return null;
  }

  if (!options.force && cachedUser && Date.now() - cachedAt < AUTH_CACHE_MS) {
    return cachedUser;
  }

  if (!options.force && inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 401) invalidateAuthSessionCache();
        return peekCachedAuthUser() || null;
      }
      const data = await res.json();
      const user = data?.user ?? null;
      if (user && typeof user === 'object') {
        cachedUser = user;
        cachedAt = Date.now();
        setUser(user as Record<string, unknown>);
      }
      return user;
    } catch {
      return peekCachedAuthUser() || null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
