import { useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import {
  FloatingParticles,
  InteractiveBackground,
} from "@/components/background/InteractiveBackground";
import { studentNav } from "@/lib/app-nav";
import { getSchoolBranding } from "@/lib/school-branding";
import { isIndividualAccount } from "@/lib/individual-signup";
import { showTrialUpgrade } from "@/lib/individual-subscription";
import { TrialUpgradeBanner } from "@/components/b2c/TrialUpgradeBanner";
import { API_BASE_URL } from "@/lib/api-config";
import {
  clearAuthData,
  getAuthToken,
  getUser as getStoredUser,
  getStudentDisplayName,
  setUser as persistUser,
} from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

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
  contentClassName = "app-shell-content",
}: {
  children: ReactNode;
  /** Override when a page needs to manage its own padding (e.g. full-bleed players). */
  contentClassName?: string;
}) {
  const [user, setUser] = useState<any>(() => getStoredUser());

  // Storage is read once on mount; refresh if another tab logs in/out.
  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Refresh school name/logo from /api/auth/me — login cache is often missing schoolLogo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers,
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
            schoolName:
              me.schoolName || me.assignedAdmin?.schoolName || prev?.schoolName || "",
            schoolLogo:
              me.schoolLogo || me.assignedAdmin?.schoolLogo || prev?.schoolLogo || "",
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

  // B2C / individual students have no school, so hide school-only features
  // (Offline Results + Timetable) from the sidebar.
  const nav = isIndividualAccount(user)
    ? studentNav
        .filter((item) => item.id !== "results" && item.id !== "timetable")
        .map((item) => (item.id === "exams" ? { ...item, label: "Practice Exams" } : item))
    : studentNav;

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers,
        credentials: "include",
      }).catch(() => {
        /* still clear local state if the API call fails */
      });
    } finally {
      clearAuthData();
      // Hard replace, not client-side navigation: a pushed entry leaves the
      // dashboard sitting in history for the Back button to reopen.
      window.location.replace("/signin");
    }
  };

  return (
    <AppShell
      nav={nav}
      orgName={branding?.schoolName || "AsliLearn AI"}
      orgSubtitle="Student Portal"
      orgLogoUrl={branding?.schoolLogo || undefined}
      homeHref="/dashboard"
      user={{ name: getStudentDisplayName(user) || "Student", role: "Student" }}
      onLogout={handleLogout}
    >
      <div className="student-school-surface relative isolate min-h-full">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <InteractiveBackground />
          <FloatingParticles />
        </div>
        <div className={cn("relative z-10", contentClassName)}>
          {showTrialUpgrade(user) ? (
            <div className="px-4 pt-4 sm:px-6">
              <TrialUpgradeBanner
                daysLeft={user?.trialDaysLeft}
                trialEndsAt={user?.trialEndsAt}
              />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </AppShell>
  );
}

export default StudentShell;
