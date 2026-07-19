import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

import { AppShell } from "@/components/layout/AppShell";
import { studentNav } from "@/lib/app-nav";
import { getSchoolBranding } from "@/lib/school-branding";
import { API_BASE_URL } from "@/lib/api-config";
import {
  clearAuthData,
  getAuthToken,
  getUser as getStoredUser,
  getStudentDisplayName,
} from "@/lib/auth-utils";

/**
 * Student-portal chrome.
 *
 * Wraps `AppShell` with the student nav plus the user/branding/logout wiring so
 * individual pages don't each re-implement it. Replaces the old `<Navigation />`
 * top bar — drop this around a page's existing content and delete the
 * `<Navigation />` import.
 */
export function StudentShell({
  children,
  contentClassName = "w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
}: {
  children: ReactNode;
  /** Override when a page needs to manage its own padding (e.g. full-bleed players). */
  contentClassName?: string;
}) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(() => getStoredUser());

  // Storage is read once on mount; refresh if another tab logs in/out.
  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const branding = getSchoolBranding(user);

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
      nav={studentNav}
      orgName={branding?.schoolName || "AsliLearn AI"}
      orgSubtitle="Student Portal"
      orgLogoUrl={branding?.schoolLogo || undefined}
      user={{ name: getStudentDisplayName(user) || "Student", role: "Student" }}
      onLogout={handleLogout}
      showUpgrade
      onUpgrade={() => setLocation("/ai-tutor?tool=chat")}
    >
      <div className={contentClassName}>{children}</div>
    </AppShell>
  );
}

export default StudentShell;
