import { useEffect, useState, type ReactNode } from "react";
import { CreditCard } from "lucide-react";
import { useLocation } from "wouter";

import { AppShell } from "@/components/layout/AppShell";
import { teacherNav, type NavItem } from "@/lib/app-nav";
import {
  TEACHER_FEATURE_TO_NAV,
  TEACHER_PORTAL_FEATURE_IDS,
  filterNavByFeatures,
} from "@/lib/school-role-access";
import { getSchoolBranding } from "@/lib/school-branding";
import { API_BASE_URL } from "@/lib/api-config";
import { showTrialUpgrade } from "@/lib/individual-subscription";
import { TrialUpgradeBanner } from "@/components/b2c/TrialUpgradeBanner";
import {
  clearAuthData,
  getAuthToken,
  getTeacherDisplayName,
  getUser as getStoredUser,
  setUser as persistUser,
} from "@/lib/auth-utils";

/** Teacher-portal chrome. Mirrors StudentShell but with the teacher nav. */
export function TeacherShell({
  children,
  contentClassName = "app-shell-content",
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
  const name = getTeacherDisplayName(user);
  const baseNav: NavItem[] = user?.isIndividualAccount
    ? [...teacherNav, { id: "subscription", label: "Subscription", icon: CreditCard, href: "/auth/subscribe" }]
    : teacherNav;
  const nav = user?.isIndividualAccount
    ? baseNav
    : filterNavByFeatures(
        baseNav,
        user?.portalFeatures,
        TEACHER_PORTAL_FEATURE_IDS,
        TEACHER_FEATURE_TO_NAV
      );

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
      window.location.replace("/signin");
    }
  };

  return (
    <AppShell
      nav={nav}
      orgName={branding?.schoolName || "AsliLearn AI"}
      orgSubtitle="Teacher Portal"
      orgLogoUrl={branding?.schoolLogo || undefined}
      homeHref="/teacher/dashboard?tab=overview"
      user={{ name, role: "Teacher" }}
      onLogout={handleLogout}
      showUpgrade={false}
      onUpgrade={() => setLocation("/teacher/dashboard?tab=vidya-ai")}
    >
      <div className={contentClassName}>
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
    </AppShell>
  );
}

export default TeacherShell;
