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
  BrainCircuitIcon,
  UploadIcon,
  FileTextIcon,
  TrophyIcon,
  Sparkles,
  CircleDot,
  Shield,
  Users2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SuperAdminView = 'dashboard' | 'admins' | 'analytics' | 'ai-analytics' | 'subscriptions' | 'settings' | 'board-comparison' | 'content' | 'board' | 'subjects' | 'exams' | 'iq-rank-boost' | 'vidya-ai' | 'courses' | 'add-admin' | 'calendar';

interface SuperAdminSidebarProps {
  currentView: SuperAdminView;
  onViewChange: (view: SuperAdminView) => void;
  user: any;
}

export function SuperAdminSidebar({ currentView, onViewChange, user }: SuperAdminSidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3Icon },
    { id: 'board', label: 'Board Management', icon: Users2 },
    { id: 'admins', label: 'School Management', icon: Shield },
    { id: 'subjects', label: 'Subject Management', icon: FileTextIcon },
    { id: 'content', label: 'Content Management', icon: UploadIcon },
    { id: 'exams', label: 'Exam Management', icon: FileTextIcon },
    { id: 'iq-rank-boost', label: 'IQ/Rank Boost Activities', icon: TrophyIcon },
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'vidya-ai', label: 'Vidya AI', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
    { id: 'ai-analytics', label: 'AI Analytics', icon: BrainCircuitIcon },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-orange-400 to-orange-500 shadow-sm border-r border-orange-300 min-h-screen flex flex-col">
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
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as SuperAdminView)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive 
                    ? "bg-white text-orange-600 shadow-md" 
                    : "text-white hover:bg-orange-600/50"
                }`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-orange-300/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <CrownIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.fullName || 'Super Admin'}</p>
            <p className="text-xs text-white/90">Super Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}


