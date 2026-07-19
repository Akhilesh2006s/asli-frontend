/**
 * Authentication Utilities
 * Centralized functions for managing authentication state
 *
 * Canonical token key: `authToken`. Legacy `superAdminToken` / `token` are
 * migrated into authToken on read and cleared on logout (P2.28).
 */

import { clearClientCachesOnLogout } from './client-cache-reset';

const AUTH_TOKEN_KEY = 'authToken';
const LEGACY_TOKEN_KEYS = ['superAdminToken', 'token'] as const;

/**
 * Clears all authentication-related data from localStorage
 * This should be called on logout to ensure complete cleanup
 */
export const clearAuthData = () => {
  clearClientCachesOnLogout();
  localStorage.removeItem(AUTH_TOKEN_KEY);
  for (const k of LEGACY_TOKEN_KEYS) localStorage.removeItem(k);

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
 * Gets the authentication token from localStorage (migrates legacy keys).
 */
export const getAuthToken = (): string | null => {
  const primary = localStorage.getItem(AUTH_TOKEN_KEY);
  if (primary) return primary;
  for (const k of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(k);
    if (legacy) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      localStorage.removeItem(k);
      return legacy;
    }
  }
  return null;
};

/**
 * Read `userId` / `id` from the JWT payload (no signature verify).
 * Used for React Query keys when `/api/auth/me` has not populated `user._id` yet.
 */
export const getUserIdFromAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = getAuthToken();
  if (!token) return null;
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
 * Sets the authentication token in localStorage (canonical key only).
 * Backend also sets an httpOnly cookie for XSS-resistant session use.
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  for (const k of LEGACY_TOKEN_KEYS) localStorage.removeItem(k);
};

/**
 * Checks if user is authenticated (has a token)
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

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
 * Sets user data in localStorage
 */
export const setUser = (user: any): void => {
  localStorage.setItem('user', JSON.stringify(user));
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
