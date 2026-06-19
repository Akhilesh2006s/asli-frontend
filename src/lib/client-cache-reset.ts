/**
 * Clear stale browser caches when users switch accounts or after a new deploy.
 * Fixes: long-lived tabs with old JS chunks, stale API caches, persisted super-admin view state.
 */

import { invalidateAuthSessionCache } from '@/lib/auth-session';
import { invalidateDashboardBootstrapCache } from '@/lib/dashboard-bootstrap';
import { clearCurriculumResponseCache } from '@/lib/curriculum-response-cache';
import { queryClient } from '@/lib/queryClient';
import { CURRICULUM_CLASSES_STORAGE_KEY, SELECT_CLASS_LABEL_KEY } from '@/lib/super-admin-curriculum-classes';

const APP_BUILD_KEY = 'aslilearn_app_build_id';
const CHUNK_RELOAD_KEY = 'aslilearn_chunk_reload_once';

const SUPER_ADMIN_SESSION_KEYS = [
  'superAdminCurrentView',
  'superAdminRestoreView',
  'examCalendarPrefill',
] as const;

declare const __APP_BUILD_ID__: string | undefined;

function getAppBuildId(): string {
  try {
    return typeof __APP_BUILD_ID__ !== 'undefined' ? String(__APP_BUILD_ID__) : 'dev';
  } catch {
    return 'dev';
  }
}

export function clearSuperAdminSessionState() {
  if (typeof window === 'undefined') return;
  for (const key of SUPER_ADMIN_SESSION_KEYS) {
    sessionStorage.removeItem(key);
  }
  sessionStorage.removeItem(SELECT_CLASS_LABEL_KEY);
}

export function clearSuperAdminLocalPrefs() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('superAdminVidyaPrefs');
  localStorage.removeItem(CURRICULUM_CLASSES_STORAGE_KEY);
}

/** Drop in-memory API caches without signing the user out. */
export function clearInMemoryClientCaches() {
  invalidateAuthSessionCache();
  invalidateDashboardBootstrapCache();
  clearCurriculumResponseCache();
  try {
    queryClient.clear();
  } catch {
    /* ignore */
  }
}

/** Before a new login on a shared browser — avoid showing previous user's cached UI/API data. */
export function prepareClientForNewLogin() {
  clearInMemoryClientCaches();
  clearSuperAdminSessionState();
}

/** Full client cleanup on logout. */
export function clearClientCachesOnLogout() {
  clearInMemoryClientCaches();
  clearSuperAdminSessionState();
  clearSuperAdminLocalPrefs();
}

/**
 * After a production deploy, old JS chunks + stale caches can break lazy-loaded pages
 * for users who kept the tab open. Reload once when the build id changes.
 */
export function syncAppBuildAndRecoverStaleBundle(): boolean {
  if (typeof window === 'undefined') return false;
  const current = getAppBuildId();
  const stored = localStorage.getItem(APP_BUILD_KEY);
  if (stored && stored !== current) {
    localStorage.setItem(APP_BUILD_KEY, current);
    clearInMemoryClientCaches();
    clearSuperAdminSessionState();
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
      return true;
    }
  }
  if (!stored) {
    localStorage.setItem(APP_BUILD_KEY, current);
  }
  return false;
}

/** Auto-reload once when a lazy-loaded chunk fails (common after deploy). */
export function installStaleBundleRecovery() {
  if (typeof window === 'undefined') return;

  const isChunkError = (message: string) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(
      message,
    );

  const recover = (message: string) => {
    if (!isChunkError(message)) return;
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    clearInMemoryClientCaches();
    window.location.reload();
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    const message = typeof reason === 'string' ? reason : String(reason?.message || '');
    recover(message);
  });

  window.addEventListener('error', (event) => {
    recover(String(event.message || ''));
  });

  window.addEventListener('load', () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  });
}
