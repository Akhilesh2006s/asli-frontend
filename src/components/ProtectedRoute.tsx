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
