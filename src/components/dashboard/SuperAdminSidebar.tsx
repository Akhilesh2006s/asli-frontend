import {
  BookOpen,
  BarChart3 as BarChart3Icon,
  BarChartIcon,
  Calendar,
  CircleDot,
  CrownIcon,
  FileTextIcon,
  FolderTree,
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

export function SuperAdminSidebar({ currentView, onViewChange, user, onLogout }: SuperAdminSidebarProps) {
  const useDrawerNav = useSuperAdminDrawerNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3Icon },
    { id: 'board', label: 'Board Management', icon: Users2 },
    { id: 'admins', label: 'School Management', icon: Shield },
    { id: 'subjects-and-content', label: 'Subject & Content', icon: LayoutList },
    { id: 'edu-ott-live', label: 'Edu OTT Live', icon: Radio },
    { id: 'exams', label: 'Exam Management', icon: FileTextIcon },
    { id: 'iq-rank-boost', label: 'IQ/Rank Boost Activities', icon: TrophyIcon },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'vidya-ai', label: 'Vidya AI', icon: Sparkles },
    { id: 'ai-tool-generations', label: 'AI Tool Data', icon: FolderTree },
    { id: 'ai-tool-topics', label: 'AI Tool Topics', icon: CircleDot },
    { id: 'ai-generator', label: 'AI Generator', icon: Sparkles },
    { id: 'book-knowledge-base', label: 'Book Knowledge Base', icon: BookOpen },
    { id: 'book-based-generator', label: 'Book-Based Generator', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const mobileNavItems = menuItems.slice(0, 5);

  const renderNavButton = (item: (typeof menuItems)[0], compact = false) => {
    const Icon = item.icon;
    const isActive =
      currentView === item.id ||
      (item.id === 'analytics' && currentView === 'ai-analytics');

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
          "w-full flex items-center gap-2 lg:gap-3 rounded-lg transition-colors text-left",
          compact ? "justify-center px-2 py-2 lg:justify-start lg:px-4 lg:py-3 mx-1 lg:mx-2" : "items-start gap-3 px-4 py-3",
          "text-xs sm:text-sm font-medium",
          isActive
            ? "bg-white text-orange-600 shadow-md"
            : "text-white hover:bg-orange-600/50"
        )}
      >
        <Icon className={cn("flex-shrink-0", compact ? "w-4 h-4 lg:w-5 lg:h-5" : "mt-0.5 h-4 w-4 sm:h-5 sm:w-5")} />
        <span className={cn(
          "min-w-0 leading-snug break-words",
          compact ? "hidden lg:block flex-1 truncate" : "flex-1"
        )}>
          {item.label}
        </span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 lg:p-6">
        <div className={cn(
          "flex items-center mb-6 lg:mb-8",
          useDrawerNav ? "space-x-3" : "justify-center lg:justify-start lg:space-x-3"
        )}>
          <GraduationCapIcon className="h-5 w-5 lg:h-8 lg:w-8 text-white shrink-0" />
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-white">Aslilearn AI</h2>
            <p className="text-xs text-white/90">Super Admin</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => renderNavButton(item, !useDrawerNav))}
        </nav>
      </div>

      <div className="mt-auto p-3 sm:p-4 lg:p-6 border-t border-orange-300/50 space-y-3">
        <div className={cn(
          "flex items-center space-x-3",
          !useDrawerNav && "justify-center lg:justify-start"
        )}>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <CrownIcon className="h-4 w-4 text-white" />
          </div>
          <div className={cn(!useDrawerNav && "hidden lg:block")}>
            <p className="text-xs sm:text-sm font-medium text-white">{user?.fullName || 'Super Admin'}</p>
            <p className="text-xs text-white/90">Super Administrator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLogout();
            setMobileOpen(false);
          }}
          className={cn(
            "w-full flex items-center rounded-lg transition-colors text-white border border-white/35 hover:bg-red-600/45 hover:border-red-200/50",
            "px-3 py-2 lg:px-4 lg:py-3 text-xs sm:text-sm font-medium",
            !useDrawerNav && "justify-center lg:justify-start"
          )}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 lg:mr-3" />
          <span className={cn(!useDrawerNav && "hidden lg:inline")}>Logout</span>
        </button>
      </div>
    </div>
  );

  if (useDrawerNav) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-orange-400 to-orange-500 border-b border-orange-300/60 shadow-md pt-[env(safe-area-inset-top,0px)]">
          <div className="h-14 px-4 flex items-center justify-between min-h-[3.5rem]">
            <div className="flex items-center space-x-2 min-w-0">
              <GraduationCapIcon className="h-5 w-5 text-white shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white leading-none truncate">Aslilearn AI</h2>
                <p className="text-[10px] text-white/90">Super Admin</p>
              </div>
            </div>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-orange-600/40 shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(20rem,92vw)] sm:w-80 p-0 bg-gradient-to-b from-orange-400 to-orange-500 border-r border-orange-300 overflow-y-auto"
              >
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex justify-around py-2 pb-[env(safe-area-inset-bottom,0px)]">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id as SuperAdminView)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 min-w-0",
                  isActive ? "text-orange-600" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] truncate max-w-[4.5rem]">{item.label.split(' ')[0]}</span>
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
        "bg-gradient-to-b from-orange-400 to-orange-500 shadow-sm border-r border-orange-300",
        "h-screen fixed top-0 left-0 overflow-y-auto z-20"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

export default SuperAdminSidebar;
