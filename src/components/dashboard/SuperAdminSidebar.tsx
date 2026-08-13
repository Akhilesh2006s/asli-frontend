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
  Layers,
  LogOut,
  Menu,
  SettingsIcon,
  Shield,
  Sparkles,
  TrophyIcon,
  Users2,
  CreditCardIcon,
  Radio,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSuperAdminDrawerNav } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import type { SuperAdminView } from "@/lib/super-admin-views";

export type { SuperAdminView };

interface SuperAdminSidebarProps {
  currentView: SuperAdminView;
  onViewChange: (view: SuperAdminView) => void;
  user: any;
  onLogout: () => void;
}

const ANALYTICS_VIEWS = new Set(["analytics", "ai-analytics", "audit-logs", "impact-reports"]);

type SidebarMenuItem = {
  id: SuperAdminView;
  label: string;
  icon: typeof BarChart3Icon;
};

type SidebarNavSection = {
  title: string;
  items: SidebarMenuItem[];
};

/** Grouped nav — matches mobile Super Admin drawer sections. */
const NAV_SECTIONS: SidebarNavSection[] = [
  {
    title: "Platform",
    items: [
      { id: "dashboard", label: "Dashboard", icon: BarChart3Icon },
      { id: "board", label: "Board Management", icon: Users2 },
      { id: "admins", label: "School Management", icon: Shield },
      { id: "products", label: "Products", icon: Layers },
      { id: "trial-members", label: "Trial Members", icon: Timer },
    ],
  },
  {
    title: "Content & Exams",
    items: [
      { id: "subjects-and-content", label: "Subject & Content", icon: LayoutList },
      { id: "edu-ott-live", label: "Edu OTT Live", icon: Radio },
      { id: "exams", label: "Exam Management", icon: FileTextIcon },
      { id: "iq-rank-boost", label: "Quiz", icon: TrophyIcon },
      { id: "calendar", label: "School Calendar", icon: Calendar },
    ],
  },
  {
    title: "AI Engine",
    items: [
      { id: "vidya-ai", label: "Vidya AI", icon: Sparkles },
      { id: "ai-tool-generations", label: "AI Tool Data", icon: FolderTree },
      { id: "ai-tool-duplicates", label: "Duplicates", icon: Copy },
      { id: "ai-tool-topics", label: "AI Tool Topics", icon: CircleDot },
      { id: "ai-generator", label: "AI Generator", icon: Zap },
      { id: "book-knowledge-base", label: "Book Knowledge Base", icon: BookOpen },
      { id: "book-based-generator", label: "Book-Based Generator", icon: BookOpen },
    ],
  },
  {
    title: "Insights & Billing",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChartIcon },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCardIcon },
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function SuperAdminSidebar({ currentView, onViewChange, user, onLogout }: SuperAdminSidebarProps) {
  const useDrawerNav = useSuperAdminDrawerNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems = NAV_SECTIONS.flatMap((section) => section.items);

  const mobileNavItems = menuItems.slice(0, 5);

  const renderNavButton = (item: SidebarMenuItem, compact = false) => {
    const Icon = item.icon;
    const isActive =
      currentView === item.id ||
      (item.id === "analytics" && ANALYTICS_VIEWS.has(currentView));

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
          "w-full flex items-center gap-2 lg:gap-3 rounded-xl transition-all duration-200 text-left",
          compact
            ? "justify-center px-2 py-2 lg:justify-start lg:px-4 lg:py-3 mx-1 lg:mx-2"
            : "items-start gap-3 px-4 py-3",
          "text-xs sm:text-sm font-medium",
          isActive
            ? "bg-gradient-to-r from-sky-500 to-teal-400 text-white shadow-md shadow-sky-200/70"
            : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm",
        )}
      >
        <Icon
          className={cn(
            "flex-shrink-0",
            compact ? "w-4 h-4 lg:w-5 lg:h-5" : "mt-0.5 h-4 w-4 sm:h-5 sm:w-5",
          )}
        />
        <span
          className={cn(
            "min-w-0 leading-snug break-words",
            compact ? "hidden lg:block flex-1 truncate" : "flex-1",
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/90 via-orange-50/45 to-teal-50/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_0%_0%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(ellipse_70%_45%_at_100%_20%,rgba(251,146,60,0.18),transparent_50%)]" />
        <motion.div
          className="absolute -right-8 top-20 h-32 w-32 rounded-full bg-sky-300/30 blur-3xl"
          animate={{ y: [0, 12, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -left-10 bottom-24 h-36 w-36 rounded-full bg-orange-300/25 blur-3xl"
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-3 pt-3 pb-1 lg:px-4 lg:pt-4">
        <button
          type="button"
          onClick={() => {
            onViewChange("dashboard");
            setMobileOpen(false);
          }}
          className={cn(
            "flex w-full items-center mb-1 rounded-xl text-left transition-all hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60",
            useDrawerNav ? "space-x-3 px-1 py-1" : "justify-center lg:justify-start lg:space-x-3 px-1 py-1",
          )}
          aria-label="Go to Super Admin home"
          title="Home"
        >
          <motion.div
            className="flex h-8 w-8 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 shadow-md shadow-sky-200/60"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <GraduationCapIcon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
          </motion.div>
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">Aslilearn AI</h2>
            <p className="text-xs font-medium text-sky-600">Super Admin</p>
          </div>
        </button>
      </div>

      <nav className="super-admin-sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-2">
        {NAV_SECTIONS.map((section, sIdx) => (
          <motion.div
            key={section.title}
            className="pt-0.5 first:pt-0"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * sIdx, duration: 0.3 }}
          >
            <p
              className={cn(
                "px-4 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-sky-600/70",
                !useDrawerNav && "hidden lg:block",
              )}
            >
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => renderNavButton(item, !useDrawerNav))}
            </div>
          </motion.div>
        ))}
      </nav>

      <div className="shrink-0 mt-auto space-y-3 border-t border-sky-100/90 bg-white/70 p-3 sm:p-4 lg:p-6 backdrop-blur-sm">
        <div
          className={cn(
            "flex items-center space-x-3",
            !useDrawerNav && "justify-center lg:justify-start",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-sm">
            <CrownIcon className="h-4 w-4 text-slate-900" />
          </div>
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <p className="text-xs sm:text-sm font-medium text-slate-900">
              {user?.fullName || "Super Admin"}
            </p>
            <p className="text-xs text-slate-500">Super Administrator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLogout();
            setMobileOpen(false);
          }}
          className={cn(
            "w-full flex items-center rounded-xl transition-colors text-slate-700 border border-slate-200 bg-white/90 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700",
            "px-3 py-2 lg:px-4 lg:py-3 text-xs sm:text-sm font-medium",
            !useDrawerNav && "justify-center lg:justify-start",
          )}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 lg:mr-3" />
          <span className={cn(!useDrawerNav && "hidden lg:inline")}>Logout</span>
        </button>
        <a
          href="mailto:hello@aslilearn.ai?subject=AsliLearn%20support%20request"
          className={cn(
            "w-full flex items-center rounded-xl transition-colors text-slate-700 border border-sky-100 bg-white/90 hover:bg-sky-50 hover:border-sky-200 hover:text-slate-900",
            "px-3 py-2 lg:px-4 lg:py-2.5 text-xs sm:text-sm font-medium",
            !useDrawerNav && "justify-center lg:justify-start",
          )}
        >
          <span className={cn(!useDrawerNav && "hidden lg:inline")}>Contact Support</span>
          <span className={cn(useDrawerNav ? "hidden" : "lg:hidden")}>?</span>
        </a>
      </div>
      </div>
    </div>
  );

  if (useDrawerNav) {
    return (
      <>
        <div className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
          <div className="h-14 px-4 flex items-center justify-between min-h-[3.5rem] gap-2">
            <button
              type="button"
              onClick={() => {
                onViewChange("dashboard");
                setMobileOpen(false);
              }}
              className="flex items-center space-x-2 min-w-0 rounded-md px-1 py-1 text-left hover:bg-sky-50"
              aria-label="Go to Super Admin home"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-teal-400">
                <GraduationCapIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none truncate">
                  Aslilearn AI
                </h2>
                <p className="text-micro text-sky-600">Super Admin</p>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-slate-700 hover:bg-sky-50"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[min(20rem,92vw)] overflow-hidden border-r border-slate-200 bg-gradient-to-b from-white via-sky-50/50 to-slate-50 p-0 sm:w-80"
                >
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex justify-around py-2 pb-[env(safe-area-inset-bottom,0px)]">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === "analytics" && ANALYTICS_VIEWS.has(currentView));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id as SuperAdminView)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 min-w-0",
                  isActive ? "text-teal-600" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-micro truncate max-w-[4.5rem]">
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
        "super-admin-sidebar hidden sm:flex flex-col transition-all duration-300",
        "sm:w-[60px] lg:w-64 sm:min-w-[60px] lg:min-w-[16rem] lg:max-w-[16rem]",
        "border-r border-sky-100/90 bg-transparent shadow-[4px_0_24px_-12px_rgba(14,165,233,0.15)]",
        "h-screen fixed top-0 left-0 overflow-hidden z-20",
      )}
    >
      {sidebarContent}
    </aside>
  );
}

export default SuperAdminSidebar;
