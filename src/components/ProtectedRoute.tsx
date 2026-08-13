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

function cachedAccessOk(roles?: Role[]): boolean {
  if (!isAuthenticated() && !getAuthToken()) return false;
  const user = getUser();
  if (!user) return false;
  if (!roles || roles.length === 0) return true;
  const role = String(user.role || "").toLowerCase() as Role;
  return roles.includes(role);
}

/**
 * Client route guard: verifies identity via /api/auth/me (cookie or Bearer).
 * If a valid session is already cached, render children immediately and
 * re-check in the background — no full-screen "Opening workspace" on every click.
 */
export function ProtectedRoute({
  children,
  roles,
  loginPath = "/signin",
}: ProtectedRouteProps) {
  const [state, setState] = useState<"loading" | "ok" | "deny">(() =>
    cachedAccessOk(roles) ? "ok" : "loading"
  );

  useEffect(() => {
    let cancelled = false;

    const run = async (opts?: { showLoader?: boolean }) => {
      if (opts?.showLoader && !cancelled) setState("loading");
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
        if (!cancelled) {
          // Keep existing UI if we already showed a cached session.
          if (!cachedAccessOk(roles)) setState("deny");
        }
      }
    };

    // First paint: only block the screen when we have no cached session.
    void run({ showLoader: !cachedAccessOk(roles) });

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || cancelled) return;
      // bfcache restore can show a stale logged-in page after logout elsewhere.
      void run({ showLoader: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void run({ showLoader: false });
      }
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
        title="Loading"
        subtitle="Just a moment…"
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
