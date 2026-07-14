import {
  BookOpen,
  BarChart3 as BarChart3Icon,
  BarChartIcon,
  Calendar,
  CircleDot,
  CrownIcon,
  FileTextIcon,
  FolderTree,
  Copy,
  GraduationCapIcon,
  LayoutList,
  LogOut,
  Menu,
  SettingsIcon,
  Shield,
  Sparkles,
  TrophyIcon,
  Users2,
  CreditCardIcon,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSuperAdminDrawerNav } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { SuperAdminView } from "@/lib/super-admin-views";

export type { SuperAdminView };

interface SuperAdminSidebarProps {
  currentView: SuperAdminView;
  onViewChange: (view: SuperAdminView) => void;
  user: any;
  onLogout: () => void;
}

const NAV_GROUPS: { label: string; items: { id: SuperAdminView | string; label: string; icon: typeof Sparkles }[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: BarChart3Icon },
      { id: "analytics", label: "Analytics", icon: BarChartIcon },
    ],
  },
  {
    label: "Institution",
    items: [
      { id: "board", label: "Board Management", icon: Users2 },
      { id: "admins", label: "School Management", icon: Shield },
      { id: "subjects-and-content", label: "Subject & Content", icon: LayoutList },
      { id: "calendar", label: "School Calendar", icon: Calendar },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCardIcon },
    ],
  },
  {
    label: "Learning",
    items: [
      { id: "edu-ott-live", label: "Edu OTT Live", icon: Radio },
      { id: "exams", label: "Exam Management", icon: FileTextIcon },
      { id: "iq-rank-boost", label: "IQ / Rank Boost", icon: TrophyIcon },
      { id: "vidya-ai", label: "Vidya AI", icon: Sparkles },
    ],
  },
  {
    label: "AI Studio",
    items: [
      { id: "ai-generator", label: "AI Generator", icon: Sparkles },
      { id: "book-based-generator", label: "Book-Based Generator", icon: BookOpen },
      { id: "book-knowledge-base", label: "Book Knowledge Base", icon: BookOpen },
      { id: "ai-tool-topics", label: "AI Tool Topics", icon: CircleDot },
      { id: "ai-tool-generations", label: "AI Tool Data", icon: FolderTree },
      { id: "ai-tool-duplicates", label: "Duplicates", icon: Copy },
    ],
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: SettingsIcon }],
  },
];

export function SuperAdminSidebar({ currentView, onViewChange, user, onLogout }: SuperAdminSidebarProps) {
  const useDrawerNav = useSuperAdminDrawerNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const mobileNavItems = allItems.slice(0, 5);

  const renderNavButton = (item: (typeof allItems)[0], compact = false) => {
    const Icon = item.icon;
    const isActive =
      currentView === item.id ||
      (item.id === "analytics" && currentView === "ai-analytics");

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onViewChange(item.id as SuperAdminView);
          setMobileOpen(false);
        }}
        title={compact ? item.label : undefined}
        className={cn(
          "group w-full flex items-center rounded-xl transition-all duration-200 text-left",
          compact
            ? "justify-center px-2 py-3 lg:justify-start lg:gap-3 lg:px-4 lg:py-3.5 mx-1.5 lg:mx-2"
            : "gap-3.5 px-4 py-3.5",
          "text-base font-medium",
          isActive
            ? "bg-teal-green-400 text-ink shadow-glow scale-[1.01]"
            : "text-white/85 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "flex-shrink-0 transition-transform group-hover:scale-105",
            compact ? "h-6 w-6" : "h-6 w-6"
          )}
        />
        <span
          className={cn(
            "min-w-0 leading-snug break-words",
            compact ? "hidden lg:block flex-1" : "flex-1"
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="p-5 lg:p-6">
        <div
          className={cn(
            "mb-8 flex items-center",
            useDrawerNav ? "gap-3" : "justify-center lg:justify-start lg:gap-3"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-green-400/20 ring-1 ring-teal-green-300/40">
            <GraduationCapIcon className="h-7 w-7 text-teal-green-200" />
          </div>
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <h2 className="font-display text-xl font-bold text-white tracking-tight">AsliLearn AI</h2>
            <p className="text-base text-teal-green-200/90">Super Admin</p>
          </div>
        </div>

        <nav className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className={cn(
                  "mb-2 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/40",
                  !useDrawerNav && "hidden lg:block"
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => renderNavButton(item, !useDrawerNav))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto space-y-4 border-t border-white/10 p-5 lg:p-6">
        <div
          className={cn(
            "flex items-center gap-3",
            !useDrawerNav && "justify-center lg:justify-start"
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <CrownIcon className="h-5 w-5 text-teal-green-200" />
          </div>
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <p className="text-base font-semibold text-white">{user?.fullName || "Super Admin"}</p>
            <p className="text-[0.9375rem] text-white/55">Administrator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLogout();
            setMobileOpen(false);
          }}
          className={cn(
            "flex w-full items-center rounded-xl border border-white/20 text-base font-medium text-white transition hover:border-red-300/40 hover:bg-red-500/20",
            "gap-3 px-4 py-3.5",
            !useDrawerNav && "justify-center lg:justify-start"
          )}
        >
          <LogOut className="h-6 w-6 shrink-0" />
          <span className={cn(!useDrawerNav && "hidden lg:inline")}>Logout</span>
        </button>
      </div>
    </div>
  );

  if (useDrawerNav) {
    return (
      <>
        <div className="fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-ink pt-[env(safe-area-inset-top,0px)] shadow-elevated">
          <div className="flex h-16 min-h-[4rem] items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <GraduationCapIcon className="h-7 w-7 shrink-0 text-teal-green-300" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold leading-none text-white">AsliLearn AI</h2>
                <p className="text-[0.9375rem] text-white/60">Super Admin</p>
              </div>
            </div>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-white hover:bg-white/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(22rem,92vw)] overflow-y-auto border-r border-white/10 bg-ink p-0 sm:w-80"
              >
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-ink/10 bg-white/95 py-2.5 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md sm:hidden">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id as SuperAdminView)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 px-2 py-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="max-w-[4.75rem] truncate text-[0.8125rem] font-medium">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "super-admin-sidebar fixed left-0 top-0 z-20 hidden h-screen flex-col overflow-y-auto transition-all duration-300 sm:flex",
        "sm:w-[72px] sm:min-w-[72px] lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px]",
        "border-r border-white/10 bg-gradient-to-b from-ink via-ink-soft to-[#0a3d48] shadow-elevated"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
