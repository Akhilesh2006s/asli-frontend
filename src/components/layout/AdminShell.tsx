import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

import { AppShell } from "@/components/layout/AppShell";
import { adminNav } from "@/lib/app-nav";
import { getSchoolBranding } from "@/lib/school-branding";
import { API_BASE_URL } from "@/lib/api-config";
import {
  clearAuthData,
  getAuthToken,
  getUser as getStoredUser,
  setUser as persistUser,
} from "@/lib/auth-utils";

/** School-admin chrome — same AppShell pattern as TeacherShell / StudentShell. */
export function AdminShell({
  children,
  contentClassName = "w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(() => getStoredUser());

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const me = data?.user;
        if (!me || cancelled) return;

        setUser((prev: any) => {
          const next = {
            ...(prev || {}),
            ...me,
            schoolName: me.schoolName || me.assignedAdmin?.schoolName || prev?.schoolName || "",
            schoolLogo: me.schoolLogo || me.assignedAdmin?.schoolLogo || prev?.schoolLogo || "",
            assignedAdmin: me.assignedAdmin || prev?.assignedAdmin,
          };
          persistUser(next);
          return next;
        });
      } catch {
        /* keep cached branding */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const branding = getSchoolBranding(user);
  const name =
    user?.fullName || user?.name || user?.email?.split("@")[0] || "Admin";

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
        }).catch(() => {
          /* still clear local state */
        });
      }
    } finally {
      clearAuthData();
      setLocation("/signin");
    }
  };

  return (
    <AppShell
      nav={adminNav}
      orgName={branding?.schoolName || "AsliLearn AI"}
      orgSubtitle="Admin Portal"
      orgLogoUrl={branding?.schoolLogo || undefined}
      user={{ name, role: "Admin" }}
      onLogout={handleLogout}
      showUpgrade={false}
      onUpgrade={() => setLocation("/admin/dashboard?tab=vidya-ai")}
    >
      <div className={contentClassName}>{children}</div>
    </AppShell>
  );
}

export default AdminShell;
