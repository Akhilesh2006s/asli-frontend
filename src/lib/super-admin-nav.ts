import {
  isSuperAdminView,
  type SuperAdminView,
} from "@/lib/super-admin-views";

const RESTORE_VIEW_KEY = "superAdminRestoreView";
const PERSISTED_VIEW_KEY = "superAdminCurrentView";

function isSuperAdminDashboardPath(path: string): boolean {
  return (
    path === "/super-admin/dashboard" ||
    path.endsWith("/super-admin/dashboard") ||
    path === "/super_admin/dashboard" ||
    path.endsWith("/super_admin/dashboard")
  );
}

export function persistSuperAdminView(view: SuperAdminView) {
  if (typeof window === "undefined") return;
  if (!isSuperAdminView(view)) return;
  sessionStorage.setItem(PERSISTED_VIEW_KEY, view);
}

export function readPersistedSuperAdminView(): SuperAdminView | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PERSISTED_VIEW_KEY);
  if (!raw || !isSuperAdminView(raw)) return null;
  return raw;
}

/** One-time restore when returning from school detail (takes priority over persisted view). */
export function queueSuperAdminViewRestore(view: SuperAdminView) {
  if (typeof window === "undefined") return;
  if (!isSuperAdminView(view)) return;
  sessionStorage.setItem(RESTORE_VIEW_KEY, view);
}

export function consumeSuperAdminViewRestore(): SuperAdminView | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(RESTORE_VIEW_KEY);
  sessionStorage.removeItem(RESTORE_VIEW_KEY);
  if (!raw || !isSuperAdminView(raw)) return null;
  return raw;
}

/** Remove legacy ?view= from the address bar (was persisting School Management across browser restarts). */
export function clearSuperAdminDashboardQueryFromUrl() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!isSuperAdminDashboardPath(path)) return;
  if (!window.location.search) return;
  window.history.replaceState({}, "", path);
}
