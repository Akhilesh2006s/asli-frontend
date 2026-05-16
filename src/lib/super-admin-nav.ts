import type { SuperAdminView } from "@/components/dashboard/SuperAdminSidebar";

const RESTORE_VIEW_KEY = "superAdminRestoreView";

/** Only restore School Management when returning from school detail — not board/sub-pages. */
const RESTORABLE_VIEWS: SuperAdminView[] = ["admins"];

export function queueSuperAdminViewRestore(view: SuperAdminView) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESTORE_VIEW_KEY, view);
}

export function consumeSuperAdminViewRestore(): SuperAdminView | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(RESTORE_VIEW_KEY);
  sessionStorage.removeItem(RESTORE_VIEW_KEY);
  if (!raw) return null;
  return RESTORABLE_VIEWS.includes(raw as SuperAdminView) ? (raw as SuperAdminView) : null;
}

/** Remove legacy ?view= from the address bar (was persisting School Management across browser restarts). */
export function clearSuperAdminDashboardQueryFromUrl() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/super-admin/dashboard" && !path.endsWith("/super-admin/dashboard")) return;
  if (!window.location.search) return;
  window.history.replaceState({}, "", path);
}
