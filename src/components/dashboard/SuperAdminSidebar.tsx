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
  RadioIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SuperAdminView = 'dashboard' | 'admins' | 'analytics' | 'ai-analytics' | 'subscriptions' | 'settings' | 'board-comparison' | 'content' | 'board' | 'subjects' | 'exams' | 'iq-rank-boost' | 'live-sessions';

interface SuperAdminSidebarProps {
  currentView: SuperAdminView;
  onViewChange: (view: SuperAdminView) => void;
  user: any;
}

export function SuperAdminSidebar({ currentView, onViewChange, user }: SuperAdminSidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3Icon },
    { id: 'admins', label: 'Admin Management', icon: CrownIcon },
    { id: 'subjects', label: 'Subject Management', icon: BookIcon },
    { id: 'content', label: 'Content Management', icon: UploadIcon },
    { id: 'exams', label: 'Exam Management', icon: FileTextIcon },
    { id: 'iq-rank-boost', label: 'IQ/Rank Boost Activities', icon: TrophyIcon },
    { id: 'live-sessions', label: 'Live Sessions', icon: RadioIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
    { id: 'board-comparison', label: 'Board Comparison', icon: BarChartIcon },
    { id: 'ai-analytics', label: 'AI Analytics', icon: BrainCircuitIcon },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <GraduationCapIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Asli Prep</h2>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-blue-100 text-blue-900 border-blue-200" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => onViewChange(item.id as SuperAdminView)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <CrownIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.fullName || 'Super Admin'}</p>
            <p className="text-xs text-gray-500">Super Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}


