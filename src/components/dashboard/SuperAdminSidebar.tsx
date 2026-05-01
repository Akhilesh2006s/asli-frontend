import {
  BarChart3Icon,
  UsersIcon,
  BookIcon,
  BarChartIcon,
  CreditCardIcon,
  SettingsIcon,
  CrownIcon,
  UserPlusIcon,
  GraduationCapIcon,
  UploadIcon,
  FileTextIcon,
  TrophyIcon,
  Sparkles,
  LayoutList,
  CircleDot,
  Shield,
  Users2,
  Calendar,
  FolderTree,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSuperAdminDrawerNav } from "@/hooks/use-mobile";
import { useState } from "react";

export type SuperAdminView =
  | 'dashboard'
  | 'admins'
  | 'analytics'
  | 'ai-analytics'
  | 'subscriptions'
  | 'settings'
  | 'board-comparison'
  | 'content'
  | 'board'
  | 'subjects'
  | 'subjects-and-content'
  | 'exams'
  | 'iq-rank-boost'
  | 'vidya-ai'
  | 'ai-tool-generations'
  | 'courses'
  | 'add-admin'
  | 'calendar'
  | 'ai-content-engine'
  | 'ai-generator';

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
 //   { id: 'subjects', label: 'Subject Management', icon: FileTextIcon },
 //   { id: 'content', label: 'Content Management', icon: UploadIcon },
    { id: 'exams', label: 'Exam Management', icon: FileTextIcon },
    { id: 'iq-rank-boost', label: 'IQ/Rank Boost Activities', icon: TrophyIcon },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'vidya-ai', label: 'Vidya AI', icon: Sparkles },
    { id: 'ai-tool-generations', label: 'AI Tool Data', icon: FolderTree },
    { id: 'ai-generator', label: 'AI Generator', icon: Sparkles },
    { id: 'ai-content-engine', label: 'AI PDF', icon: UploadIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <GraduationCapIcon className="h-8 w-8 text-white" />
          <div>
            <h2 className="text-lg font-bold text-white">Aslilearn AI</h2>
            <p className="text-xs text-white/90">Super Admin</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'analytics' && currentView === 'ai-analytics');

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as SuperAdminView);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? "bg-white text-orange-600 shadow-md"
                    : "text-white hover:bg-orange-600/50"
                }`}
              >
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="min-w-0 flex-1 leading-snug break-words">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-orange-300/50 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <CrownIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.fullName || 'Super Admin'}</p>
            <p className="text-xs text-white/90">Super Administrator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLogout();
            setMobileOpen(false);
          }}
          className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-white border border-white/35 hover:bg-red-600/45 hover:border-red-200/50"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
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
              <GraduationCapIcon className="h-6 w-6 text-white shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white leading-none truncate">Aslilearn AI</h2>
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
      </>
    );
  }

  return (
    <div className="super-admin-sidebar w-64 min-w-[16rem] max-w-[16rem] bg-gradient-to-b from-orange-400 to-orange-500 shadow-sm border-r border-orange-300 h-screen fixed top-0 left-0 overflow-y-auto flex flex-col z-20">
      {sidebarContent}
    </div>
  );
}


