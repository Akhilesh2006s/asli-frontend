import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MonitorPlay,
  Settings,
  Sparkles,
  User,
  Users2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Shown as a small pill on the right of the row (e.g. an unread count). */
  badge?: number;
}

/**
 * Teacher portal navigation.
 *
 * The first five ids intentionally mirror the existing `?tab=` values used by
 * `pages/teacher/dashboard.tsx` so the shell can drive that page without it
 * being rewritten first.
 */
export const teacherNav: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/teacher/dashboard?tab=overview" },
  { id: "classes", label: "My Classes", icon: GraduationCap, href: "/teacher/dashboard?tab=classes" },
  { id: "students", label: "Students", icon: Users2, href: "/teacher/dashboard?tab=students" },
  { id: "edu-ott", label: "EduOTT", icon: MonitorPlay, href: "/edu-ott" },
  { id: "learning-paths", label: "Learning Paths", icon: BookOpen, href: "/learning-paths" },
  { id: "vidya-ai", label: "Vidya AI", icon: Sparkles, href: "/teacher/dashboard?tab=vidya-ai" },
  // NOTE: /teacher/timetable is currently a redirect back to the dashboard,
  // so Calendar points at a tab until a real calendar page exists.
  { id: "calendar", label: "Calendar", icon: CalendarDays, href: "/teacher/dashboard?tab=calendar" },
  { id: "settings", label: "Settings", icon: Settings, href: "/teacher/dashboard?tab=settings" },
];

/**
 * Student portal navigation.
 *
 * Paths mirror the ones already wired in `components/navigation.tsx` so the
 * shell is a drop-in replacement for the old top nav.
 */
export const studentNav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "learning-paths", label: "Learning Paths", icon: BookOpen, href: "/learning-paths" },
  { id: "edu-ott", label: "EduOTT", icon: MonitorPlay, href: "/edu-ott" },
  { id: "exams", label: "Exams", icon: FileText, href: "/student-exams" },
  // Flashcards / Practice / Mock Tests intentionally live inside Vidya AI
  // rather than the sidebar — the AI tools are the core of the platform and
  // belong in one place.
  { id: "ai-tutor", label: "Vidya AI", icon: Sparkles, href: "/ai-tutor" },
  { id: "profile", label: "Profile", icon: User, href: "/profile" },
];

/** Maps legacy / internal dashboard tab values onto sidebar nav ids. */
const TEACHER_TAB_ALIASES: Record<string, string> = {
  overview: "overview",
  "ai-classes": "overview",
  classes: "classes",
  students: "students",
  "edu-ott": "edu-ott",
  eduott: "edu-ott",
  "learning-paths": "learning-paths",
  "vidya-ai": "vidya-ai",
  calendar: "calendar",
  timetable: "calendar",
  settings: "settings",
};

/** Resolves the active nav id from a wouter location + search string. */
export function resolveActiveNavId(pathname: string, search: string, items: NavItem[]): string {
  const tab = new URLSearchParams(search).get("tab");
  if (tab) {
    const normalized = TEACHER_TAB_ALIASES[tab] || tab;
    const byTab = items.find((i) => i.id === normalized);
    if (byTab) return byTab.id;
  }
  // Longest matching base wins, so /student/tools/mock-test-builder beats a
  // shorter sibling rather than whichever happens to be listed first.
  const byPath = items
    .filter((i) => !i.href.includes("?"))
    .map((i) => ({ id: i.id, base: i.href.split("?")[0] }))
    .filter(({ base }) => base !== "/" && pathname.startsWith(base))
    .sort((a, b) => b.base.length - a.base.length)[0];

  if (byPath) return byPath.id;
  return items[0]?.id ?? "";
}
