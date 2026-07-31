/**
 * Authentication Utilities — cookie-first web sessions.
 * Access + refresh JWTs are NOT stored in localStorage (XSS).
 * Backend httpOnly cookies (aslilearn_token / aslilearn_refresh) are authoritative.
 * Mobile continues to use SecureStore + Bearer independently.
 */

import { clearClientCachesOnLogout } from './client-cache-reset';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const LEGACY_TOKEN_KEYS = ['superAdminToken', 'token'] as const;
const SESSION_FLAG_KEY = 'aslilearn_session';

/** In-memory access token for same-tab iframe ?token= fallback only (not persisted). */
let memoryAccessToken: string | null = null;

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Strip any legacy JWTs from durable storage. */
function scrubPersistedTokens(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    for (const k of LEGACY_TOKEN_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/**
 * Clears all authentication-related client state (logout).
 */
export const clearAuthData = () => {
  clearClientCachesOnLogout();
  memoryAccessToken = null;
  scrubPersistedTokens();
  safeSessionRemove(SESSION_FLAG_KEY);

  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('superAdminUser');

  try {
    sessionStorage.removeItem('aslilearn_nav_initials');
  } catch {
    /* ignore */
  }

  localStorage.removeItem('teacherClassAssignments');
};

/**
 * Returns in-memory access token only (never localStorage).
 * Prefer credentials: 'include' so httpOnly cookies authenticate the API.
 */
export const getAuthToken = (): string | null => {
  scrubPersistedTokens();
  return memoryAccessToken;
};

/**
 * JSON API headers for cookie-first auth.
 * Omit Authorization when there is no memory JWT — httpOnly cookies still authenticate
 * when fetch uses credentials: 'include' (see auth-fetch-interceptor).
 */
export function authJsonHeaders(extra?: Record<string, string>): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

/**
 * Authorization-only headers (e.g. FormData uploads — do not set Content-Type).
 */
export function authBearerHeaders(extra?: Record<string, string>): HeadersInit {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

/**
 * Read `userId` / `id` from the in-memory JWT payload (no signature verify).
 */
export const getUserIdFromAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = getAuthToken();
  if (!token) {
    const user = getUser();
    const id = user?._id || user?.id;
    return id != null && String(id).trim() !== '' ? String(id) : null;
  }
  try {
    const body = token.split('.')[1];
    if (!body) return null;
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(json) as { userId?: string; id?: string; sub?: string };
    const id = payload.userId ?? payload.id ?? payload.sub;
    return id != null && String(id).trim() !== '' ? String(id) : null;
  } catch {
    return null;
  }
};

/**
 * Establish web session after login. Tokens go to httpOnly cookies (server);
 * we only keep a non-secret session flag + optional memory access for iframes.
 */
export const setAuthToken = (token: string, _refreshToken?: string | null): void => {
  scrubPersistedTokens();
  memoryAccessToken = token || null;
  safeSessionSet(SESSION_FLAG_KEY, '1');
};

export const getRefreshToken = (): string | null => {
  // Refresh lives in httpOnly cookie only for web.
  return null;
};

/**
 * Exchange refresh cookie for a new access token.
 */
export const refreshAccessToken = async (apiBaseUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      clearAuthData();
      return null;
    }
    const data = await res.json();
    const next = data.accessToken || data.token;
    if (next) setAuthToken(next, null);
    else safeSessionSet(SESSION_FLAG_KEY, '1');
    return next || null;
  } catch {
    return null;
  }
};

/**
 * Checks if user appears authenticated (session flag, cached user, or memory token).
 * Cookie presence cannot be read from JS — ProtectedRoute verifies via /api/auth/me.
 */
export const isAuthenticated = (): boolean => {
  return (
    safeSessionGet(SESSION_FLAG_KEY) === '1' ||
    !!memoryAccessToken ||
    !!getUser()
  );
};

/** Alias for cookie-first session checks (memory JWT may be null). */
export const hasAuthSession = (): boolean => isAuthenticated();

/**
 * Gets user data from localStorage
 */
export const getUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Sets user data from localStorage
 */
export const setUser = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
  safeSessionSet(SESSION_FLAG_KEY, '1');
};

type StudentUserLike = { fullName?: string; name?: string; email?: string } | null | undefined;

/** First name from profile — for short greetings (e.g. "Welcome back, Rahul!"). */
export function getStudentWelcomeName(user: StudentUserLike): string {
  const full = String(user?.fullName || user?.name || '').trim();
  if (full) {
    const first = full.split(/\s+/).filter(Boolean)[0];
    return first || full;
  }
  const fromEmail = String(user?.email || '').split('@')[0]?.trim();
  return fromEmail || 'Student';
}

/** Full name when set — for headings (e.g. "Learning Paths for Rahul Kumar"). */
export function getStudentDisplayName(user: StudentUserLike): string {
  const full = String(user?.fullName || user?.name || '').trim();
  if (full) return full;
  const fromEmail = String(user?.email || '').split('@')[0]?.trim();
  return fromEmail || 'Student';
}
