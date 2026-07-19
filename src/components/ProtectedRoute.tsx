import { useEffect, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { API_BASE_URL } from "@/lib/api-config";
import { getAuthToken, getUser, clearAuthData } from "@/lib/auth-utils";

type Role = "student" | "teacher" | "admin" | "super-admin";

type ProtectedRouteProps = {
  children: ReactNode;
  /** Allowed roles. Omit to allow any authenticated user. */
  roles?: Role[];
  /** Where to send unauthenticated users */
  loginPath?: string;
};

/**
 * Client route guard: requires a token and optionally a role.
 * Verifies identity via /api/auth/me before rendering protected UI (except when
 * cached user already matches and we only need a soft check for students).
 */
export function ProtectedRoute({
  children,
  roles,
  loginPath = "/signin",
}: ProtectedRouteProps) {
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) setState("deny");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          clearAuthData();
          if (!cancelled) setState("deny");
          return;
        }
        const data = await res.json();
        const user = data?.user || getUser();
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
    return () => {
      cancelled = true;
    };
  }, [roles]);

  if (state === "loading") {
    return (
      <div className="asli-app-bg flex min-h-screen items-center justify-center p-6" role="status">
        <p className="text-slate-600">Checking access…</p>
      </div>
    );
  }

  if (state === "deny") {
    const token = getAuthToken();
    if (!token) return <Redirect to={loginPath} />;
    // Authenticated but wrong role — send to a safe home
    const user = getUser();
    const role = String(user?.role || "").toLowerCase();
    if (role === "super-admin") return <Redirect to="/super-admin/dashboard" />;
    if (role === "admin") return <Redirect to="/admin/dashboard" />;
    if (role === "teacher") return <Redirect to="/teacher/dashboard" />;
    if (role === "student") return <Redirect to="/dashboard" />;
    clearAuthData();
    return <Redirect to={loginPath} />;
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
