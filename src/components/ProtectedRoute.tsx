import { useEffect, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { API_BASE_URL } from "@/lib/api-config";
import {
  getAuthToken,
  getUser,
  clearAuthData,
  isAuthenticated,
  setUser,
  setAuthToken,
} from "@/lib/auth-utils";
import { BrandLoadingState } from "@/components/BrandLoadingState";

type Role = "student" | "teacher" | "admin" | "super-admin";

type ProtectedRouteProps = {
  children: ReactNode;
  /** Allowed roles. Omit to allow any authenticated user. */
  roles?: Role[];
  /** Where to send unauthenticated users */
  loginPath?: string;
};

/**
 * Client route guard: verifies identity via /api/auth/me (cookie or Bearer).
 */
export function ProtectedRoute({
  children,
  roles,
  loginPath = "/signin",
}: ProtectedRouteProps) {
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    let cancelled = false;

    /**
     * Re-check identity, not just on mount.
     *
     * Browsers restore pages from the back/forward cache without re-running
     * effects, so pressing Forward after logging out brought back a fully
     * rendered dashboard that was never re-authorised. Revalidating on bfcache
     * restore — and when the tab regains focus, which catches a logout in
     * another tab — closes that.
     */
    const run = async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers,
          credentials: "include",
        });
        if (!res.ok) {
          clearAuthData();
          if (!cancelled) setState("deny");
          return;
        }
        const data = await res.json();
        const user = data?.user || getUser();
        if (user) setUser(user);
        if (data?.token) setAuthToken(data.token);
        const role = String(user?.role || "").toLowerCase() as Role;

        if (roles && roles.length > 0 && !roles.includes(role)) {
          if (!cancelled) setState("deny");
          return;
        }
        if (!cancelled) setState("ok");
      } catch {
        if (!cancelled) setState("deny");
      }
    };

    run();

    // `persisted` means this page came back from the bfcache with its old DOM
    // and state intact — the only moment the mount check is skipped. The stale
    // dashboard is already on screen, so hide it while identity is re-checked.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || cancelled) return;
      setState("loading");
      void run();
    };
    // Re-check quietly on tab focus (catches a logout in another tab) without
    // flashing the loading screen every time someone switches tabs.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) void run();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roles]);

  if (state === "loading") {
    return (
      <BrandLoadingState
        title="Opening Your Workspace"
        subtitle="Checking your access and preparing your dashboard."
      />
    );
  }

  if (state === "deny") {
    if (!isAuthenticated() && !getAuthToken()) return <Redirect to={loginPath} replace />;
    const user = getUser();
    const role = String(user?.role || "").toLowerCase();
    if (role === "super-admin") return <Redirect to="/super-admin/dashboard" replace />;
    if (role === "admin") return <Redirect to="/admin/dashboard" replace />;
    if (role === "teacher") return <Redirect to="/teacher/dashboard" replace />;
    if (role === "student") return <Redirect to="/dashboard" replace />;
    clearAuthData();
    return <Redirect to={loginPath} replace />;
  }

  return <>{children}</>;
}

/** Convenience wrappers */
export function StudentRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["student"]}>{children}</ProtectedRoute>;
}
export function TeacherRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["teacher"]}>{children}</ProtectedRoute>;
}
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["admin", "super-admin"]}>{children}</ProtectedRoute>;
}
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["super-admin"]}>{children}</ProtectedRoute>;
}
