import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

import { AppShell } from "@/components/layout/AppShell";
import { teacherNav } from "@/lib/app-nav";
import { getSchoolBranding } from "@/lib/school-branding";
import { API_BASE_URL } from "@/lib/api-config";
import {
  clearAuthData,
  getAuthToken,
  getUser as getStoredUser,
  setUser as persistUser,
} from "@/lib/auth-utils";

/** Teacher-portal chrome. Mirrors StudentShell but with the teacher nav. */
export function TeacherShell({
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

  // Refresh school name/logo from /api/auth/me — login cache is often missing schoolLogo.
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
        /* keep cached branding if refresh fails */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const branding = getSchoolBranding(user);
  const name =
    user?.fullName || user?.name || user?.teacherName || user?.email?.split("@")[0] || "Teacher";

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }).catch(() => {
          /* still clear local state if the API call fails */
        });
      }
    } finally {
      clearAuthData();
      setLocation("/signin");
    }
  };

  return (
    <AppShell
      nav={teacherNav}
      orgName={branding?.schoolName || "AsliLearn AI"}
      orgSubtitle="Teacher Portal"
      orgLogoUrl={branding?.schoolLogo || undefined}
      user={{ name, role: "Teacher" }}
      onLogout={handleLogout}
      showUpgrade={false}
      onUpgrade={() => setLocation("/teacher/dashboard?tab=vidya-ai")}
    >
      <div className={contentClassName}>{children}</div>
    </AppShell>
  );
}

export default TeacherShell;
