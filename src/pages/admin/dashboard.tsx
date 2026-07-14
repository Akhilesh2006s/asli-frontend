// @ts-nocheck
import { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { API_BASE_URL } from '@/lib/api-config';
import SchoolBrandRow from '@/components/ui/school-brand-row';
import { AtRiskStudentsPanel } from '@/components/admin/AtRiskStudentsPanel';
import { InteractiveBackground, FloatingParticles } from "@/components/background/InteractiveBackground";
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  Shield,
  GraduationCap,
  UserPlus,
  FileSpreadsheet,
  Database,
  Activity,
  LogOut,
  FileText,
  Play,
  Target,
  Menu,
  Sparkles,
  MessageCircle,
  Calendar as CalendarIcon,
  CalendarDays
} from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import VidyaAIFloatingAssistant from '@/components/student/VidyaAIFloatingAssistant';
const UserManagement = lazy(() => import('@/components/admin/user-management'));
const ClassDashboard = lazy(() => import('@/components/admin/class-dashboard'));
const TeacherManagement = lazy(() => import('@/components/admin/teacher-management'));
const SubjectManagement = lazy(() => import('@/components/admin/subject-management'));
const ExamViewOnly = lazy(() => import('@/components/admin/exam-view-only'));
const AdminLearningPaths = lazy(() => import('@/components/admin/learning-paths'));
const AdminEduOTT = lazy(() => import('@/components/admin/admin-eduott'));
const AdminCalendar = lazy(() => import('@/components/admin/admin-calendar'));
const TimetableManagement = lazy(() => import('@/components/admin/timetable-management'));
const AIChat = lazy(() => import('@/components/ai-chat'));

const lazySectionFallback = (
  <div className="rounded-xl border border-sky-100 bg-white p-3 sm:p-4 lg:p-6 text-xs sm:text-sm text-slate-600 shadow-sm">
    Loading section...
  </div>
);

const VALID_ADMIN_TABS = new Set([
  'overview',
  'students',
  'classes',
  'teachers',
  'subjects',
  'exams',
  'learning-paths',
  'eduott',
  'calendar',
  'timetable',
  'vidya-ai',
]);

const AdminDashboard = () => {
  const [, setLocation] = useLocation();
  const search = useSearch() || '';
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();


  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('No auth token found');
          window.location.href = '/signin';
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Admin dashboard auth check - user data:', data);
          if (data.user && data.user.role === 'admin') {
            console.log('Admin user authenticated successfully');
            setUserData(data.user);
            setAdminId(data.user._id || data.user.id);
            setIsAuthenticated(true);
          } else {
            console.log('User is not admin, role:', data.user?.role);
            window.location.href = '/signin';
          }
        } else {
          console.log('Admin dashboard auth check failed with status:', response.status);
          const errorText = await response.text();
          console.log('Response text:', errorText);
          alert(`Authentication failed. Status: ${response.status}, Response: ${errorText}`);
          window.location.href = '/signin';
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/signin';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dashboard-no-scrollbar');
    document.body.classList.add('dashboard-no-scrollbar');
    return () => {
      document.documentElement.classList.remove('dashboard-no-scrollbar');
      document.body.classList.remove('dashboard-no-scrollbar');
    };
  }, []);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    totalAssessments: 0,
    activeUsers: 0,
    totalContent: 0
  });
  const [studentAnalytics, setStudentAnalytics] = useState({
    classDistribution: [],
    performanceMetrics: {
      averageScore: 0,
      totalExamsTaken: 0,
      topPerformers: []
    },
    subjectPerformance: [],
    recentActivity: []
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  useEffect(() => {
    const raw = search || '';
    const q = raw.startsWith('?') ? raw.slice(1) : raw;
    const tab = new URLSearchParams(q).get('tab');
    if (tab && VALID_ADMIN_TABS.has(tab)) {
      setActiveTab(tab);
    }
  }, [search]);

  const handleMobileTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Memoize sliced arrays to avoid recalculating on every render
  const topClassDistribution = useMemo(() => {
    return studentAnalytics.classDistribution?.slice(0, 5) || [];
  }, [studentAnalytics.classDistribution]);

  const topSubjectPerformance = useMemo(() => {
    return studentAnalytics.subjectPerformance?.slice(0, 4) || [];
  }, [studentAnalytics.subjectPerformance]);

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchStudentAnalytics = useCallback(async () => {
    // Don't fetch if already loaded
    if (analyticsLoaded) return;
    
    try {
      setIsLoadingAnalytics(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoadingAnalytics(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/students/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStudentAnalytics(data.data);
          setAnalyticsLoaded(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [analyticsLoaded]);

  const fetchAdminStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found for admin stats');
        setIsLoadingStats(false);
        return;
      }

      // Fetch admin dashboard stats from the dedicated endpoint
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!statsRes.ok) {
        console.log('Failed to get admin stats');
        setIsLoadingStats(false);
        return;
      }
      
      const statsData = await statsRes.json();
      
      if (statsData.success && statsData.data) {
        setStats({
          totalStudents: statsData.data.totalStudents || 0,
          totalTeachers: statsData.data.totalTeachers || 0,
          totalClasses: statsData.data.totalClasses || 0,
          totalVideos: statsData.data.totalVideos || 0,
          totalQuizzes: statsData.data.totalQuizzes || 0,
          totalAssessments: statsData.data.totalAssessments || 0,
          activeUsers: statsData.data.activeUsers || 0,
          totalContent: statsData.data.totalContent || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    // Fetch admin dashboard stats immediately (lightweight)
    fetchAdminStats();
    // Don't fetch analytics immediately - load only when needed (lazy loading)
  }, [fetchAdminStats]);

  // Lazy load analytics when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview' && !analyticsLoaded && !isLoadingAnalytics) {
      fetchStudentAnalytics();
    }
  }, [activeTab, analyticsLoaded, isLoadingAnalytics, fetchStudentAnalytics]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your admin dashboard</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sky-50 relative overflow-hidden md:flex md:h-screen">
      {/* Interactive Background */}
      <div className="fixed inset-0 z-0">
        {/* Interactive Background - Disabled for better performance */}
        {/* <InteractiveBackground />
        <FloatingParticles /> */}
      </div>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 backdrop-blur-xl md:hidden pt-[env(safe-area-inset-top,0px)]">
          <div className="flex h-14 min-h-[3.5rem] items-center justify-between px-4">
            <div className="flex min-w-0 items-center space-x-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <span className="text-sm font-bold text-white">AS</span>
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-white">ASLILEARN AI</h1>
                <p className="text-[11px] font-medium text-white/90">Admin Panel</p>
              </div>
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-white/10 bg-ink p-0">
                <div className="p-responsive">
                  <div className="flex items-center space-x-responsive mb-responsive">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-responsive-lg">AS</span>
                    </div>
                    <div>
                      <h1 className="text-responsive-lg font-bold text-white">ASLILEARN AI</h1>
                      <p className="text-responsive-xs text-white/90 font-medium">Admin Panel</p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => handleMobileTabChange('overview')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'overview' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <BarChart3 className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Dashboard</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('students')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'students' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Users className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Students</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('classes')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'classes' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <GraduationCap className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Classes</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('teachers')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'teachers' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Users className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Teachers</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('subjects')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'subjects' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <BookOpen className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Subjects</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('exams')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'exams' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <FileText className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Exams</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('learning-paths')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'learning-paths' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Target className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Learning Paths</span>
                    </button>
                    
                    <button
                      onClick={() => handleMobileTabChange('eduott')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'eduott' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Play className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">EduOTT</span>
                    </button>

                    <button
                      onClick={() => handleMobileTabChange('timetable')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'timetable'
                          ? 'bg-teal-green-400 text-ink shadow-glow'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <CalendarDays className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Timetable</span>
                    </button>

                    <button
                      onClick={() => handleMobileTabChange('calendar')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'calendar' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <CalendarIcon className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Calendar</span>
                    </button>

                    <button
                      onClick={() => handleMobileTabChange('vidya-ai')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'vidya-ai' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Sparkles className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Vidya AI</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          setMobileMenuOpen(false);
                          const token = localStorage.getItem('authToken');
                          if (token) {
                            try {
                              const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              // Continue even if response is not ok
                              if (!response.ok) {
                                console.warn('Logout API returned non-ok status:', response.status);
                              }
                            } catch (error) {
                              console.error('Logout API error:', error);
                              // Continue with logout even if API call fails
                            }
                          }
                          // Always clear local storage and redirect
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('user');
                          window.location.href = '/signin';
                        } catch (error) {
                          console.error('Logout failed:', error);
                          // Always clear and redirect even on error
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('user');
                          window.location.href = '/signin';
                        }
                      }}
                      className="w-full flex items-center space-x-responsive px-responsive py-responsive rounded-responsive text-left transition-all duration-200 backdrop-blur-sm text-responsive-sm text-gray-700 hover:bg-red-50 hover:text-red-900"
                    >
                      <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen w-[300px] bg-gradient-to-b from-ink via-ink-soft to-[#0a3d48] shadow-elevated border-r border-white/10 relative z-10">
        {/* Logo Section */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-orange-300/50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-lg sm:text-xl">AS</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">ASLILEARN AI</h1>
              <p className="text-xs text-white/90 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 hide-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'students' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Users className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Students</span>
          </button>
          
          <button
            onClick={() => setActiveTab('classes')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'classes' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <GraduationCap className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Classes</span>
          </button>
          
          <button
            onClick={() => setActiveTab('teachers')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'teachers' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Users className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Teachers</span>
          </button>
          
          <button
            onClick={() => setActiveTab('subjects')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'subjects' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BookOpen className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Subjects</span>
          </button>
          
          <button
            onClick={() => setActiveTab('exams')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'exams' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <FileText className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Exams</span>
          </button>
          
          <button
            onClick={() => setActiveTab('learning-paths')}
            className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === 'learning-paths' 
                ? 'bg-teal-green-400 text-ink shadow-glow' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Target className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="truncate">Learning Paths</span>
          </button>
          
                    <button
                      onClick={() => setActiveTab('eduott')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'eduott' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Play className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">EduOTT</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('timetable')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'timetable'
                          ? 'bg-teal-green-400 text-ink shadow-glow'
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <CalendarDays className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Timetable</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'calendar' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <CalendarIcon className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Calendar</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('vidya-ai')}
                      className={`w-full flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-colors whitespace-nowrap ${
                        activeTab === 'vidya-ai' 
                          ? 'bg-teal-green-400 text-ink shadow-glow' 
                          : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <Sparkles className="mr-3 h-6 w-6 flex-shrink-0" />
                      <span className="truncate">Vidya AI</span>
                    </button>
          
        </nav>
      </div>
      )}

        {/* Main Content Area */}
        <div className={`flex-1 w-full min-w-0 flex flex-col relative z-10 md:h-screen md:overflow-y-auto hide-scrollbar ${isMobile ? 'pt-[calc(3.5rem+env(safe-area-inset-top,0px))]' : ''}`}>
          {/* Top Header - Student Dashboard Theme */}
          <div className={`bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 shadow-xl border-b-0 rounded-b-3xl px-4 sm:px-6 lg:px-8 py-4 sm:py-4 lg:py-6 relative z-10 ${isMobile ? 'rounded-t-none shadow-none' : 'rounded-b-2xl'}`}>
            <div className="flex-responsive-col items-start justify-between space-y-responsive sm:space-y-0">
              <div className="w-full min-w-0 text-left">
                <p className="mb-2 hidden text-xs uppercase tracking-[0.3em] text-gray-900 sm:block">Admin Control Center</p>
                <h2 className="text-lg font-bold capitalize text-gray-900 sm:text-responsive-xl">{activeTab}</h2>
                <p className="mt-0.5 text-sm font-medium text-gray-900 sm:text-responsive-sm">Manage your learning platform with style</p>
                {userData && (
                  <div className="mt-3 space-y-1.5">
                    <SchoolBrandRow user={userData} variant="onPrimary" />
                    <p className="text-sm font-semibold text-gray-900 sm:text-base">
                      Welcome {userData.fullName || 'Admin'}
                    </p>
                  </div>
                )}
              </div>
              {!isMobile && (
                <div className="flex items-center space-x-responsive">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');
                        if (token) {
                          try {
                            const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            // Continue even if response is not ok
                            if (!response.ok) {
                              console.warn('Logout API returned non-ok status:', response.status);
                            }
                          } catch (error) {
                            console.error('Logout API error:', error);
                            // Continue with logout even if API call fails
                          }
                        }
                        // Always clear local storage and redirect
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        window.location.href = '/signin';
                      } catch (error) {
                        console.error('Logout failed:', error);
                        // Always clear and redirect even on error
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        window.location.href = '/signin';
                      }
                    }}
                    className="bg-white/90 text-gray-900 hover:bg-white rounded-full border-2 border-gray-300 backdrop-blur-sm font-semibold shadow-lg"
                  >
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-responsive" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className={`flex-1 w-full p-responsive ${isMobile ? 'pb-24' : ''} relative z-10`}>
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Colorful Stats Cards */}
            <div className="grid-responsive-4 gap-responsive">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Total Students</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : stats.totalStudents}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Active Classes</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : stats.totalClasses}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Activity className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Active Users</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : stats.activeUsers}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Teachers</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : (stats.totalTeachers || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

            <AtRiskStudentsPanel />

            {/* Detailed School Analysis Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 rounded-responsive p-responsive shadow-responsive border border-gray-200"
              >
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl shadow-lg">
                    <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-responsive-lg font-bold text-orange-600">Detailed School Analysis</h3>
                    <p className="text-gray-600 text-responsive-xs">Comprehensive insights about your students</p>
                  </div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center py-4 sm:py-6 lg:py-8">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
                    {/* Class Distribution */}
                    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-600" />
                        Class Distribution
                      </h4>
                      <div className="space-y-2">
                        {topClassDistribution.length > 0 ? (
                          topClassDistribution.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="text-gray-700">{item.className || item.class || 'Unknown'}</span>
                              <span className="font-semibold text-orange-600">{item.count || 0} students</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-500">No class data available</div>
                        )}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                        Performance Metrics
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Average Score</span>
                          <span className="text-base sm:text-lg font-bold text-green-600">
                            {studentAnalytics.performanceMetrics?.averageScore || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Total Exams Taken</span>
                          <span className="text-base sm:text-lg font-bold text-orange-600">
                            {studentAnalytics.performanceMetrics?.totalExamsTaken || 0}
                          </span>
                        </div>
                        {studentAnalytics.performanceMetrics?.topPerformers && studentAnalytics.performanceMetrics.topPerformers.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-1">Top Performer</p>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">
                              {studentAnalytics.performanceMetrics.topPerformers[0]?.studentName || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {studentAnalytics.performanceMetrics.topPerformers[0]?.averageScore || 0}% avg
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subject Performance */}
                    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-600" />
                        Subject Performance
                      </h4>
                      <div className="space-y-2">
                        {topSubjectPerformance.length > 0 ? (
                          topSubjectPerformance.map((subject: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="text-gray-700 capitalize">{subject.subject || subject.name || 'Unknown'}</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-orange-600">{subject.averageScore || 0}%</span>
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                                    style={{ width: `${Math.min(subject.averageScore || 0, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-500">No subject data available</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </motion.div>

            {/* Admin-Specific Data Section */}
            <div className="grid-responsive-2 gap-responsive">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={() => setActiveTab('students')}
                className="relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <h3 className="text-responsive-lg font-bold text-white">Your Students</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/90 text-responsive-sm font-medium">Total Students Assigned</span>
                      <span className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : stats.totalStudents}
                      </span>
                    </div>
                    <div className="text-white/80 text-responsive-xs">
                      These are the students specifically assigned to your admin account
                    </div>
                    <div className="text-white/90 text-xs font-medium mt-2 flex items-center gap-1">
                      Click to view details â†’
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => setActiveTab('teachers')}
                className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Your Teachers</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/90 text-base sm:text-lg font-medium">Total Teachers Assigned</span>
                      <span className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : (stats.totalTeachers || 0)}
                      </span>
                    </div>
                    <div className="text-white/80 text-responsive-xs">
                      These are the teachers specifically assigned to your admin account
                    </div>
                    <div className="text-white/90 text-xs font-medium mt-2 flex items-center gap-1">
                      Click to view details â†’
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Activity */}
            {/* Recent Activity removed per request */}
            </div>
          )}

          {activeTab === 'students' && (
            <Suspense fallback={lazySectionFallback}>
              <UserManagement />
            </Suspense>
          )}
          {activeTab === 'classes' && (
            <Suspense fallback={lazySectionFallback}>
              <ClassDashboard />
            </Suspense>
          )}
          {activeTab === 'teachers' && (
            <Suspense fallback={lazySectionFallback}>
              <TeacherManagement />
            </Suspense>
          )}
          {activeTab === 'subjects' && (
            <Suspense fallback={lazySectionFallback}>
              <SubjectManagement />
            </Suspense>
          )}
          {activeTab === 'exams' && (
            <Suspense fallback={lazySectionFallback}>
              <ExamViewOnly />
            </Suspense>
          )}
          {activeTab === 'learning-paths' && (
            <Suspense fallback={lazySectionFallback}>
              <AdminLearningPaths />
            </Suspense>
          )}
          {activeTab === 'eduott' && (
            <Suspense fallback={lazySectionFallback}>
              <AdminEduOTT />
            </Suspense>
          )}
          {activeTab === 'calendar' && (
            <Suspense fallback={lazySectionFallback}>
              <AdminCalendar />
            </Suspense>
          )}
          {activeTab === 'timetable' && (
            <Suspense fallback={lazySectionFallback}>
              <TimetableManagement />
            </Suspense>
          )}
          {activeTab === 'vidya-ai' && (
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-5"
              >
                <div className="rounded-2xl bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 p-3 sm:p-4 lg:p-6 shadow-lg border border-white/40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/40">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <Badge className="bg-white text-sky-700 hover:bg-white">School Operations</Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">School AI Assistant</h2>
                  <p className="text-white/90 mt-1">Manage students, teachers, and academic workflows</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "Enroll Students", description: "Onboard students into classes quickly", icon: UserPlus, tab: "students" },
                    { title: "Assign Teachers", description: "Map teachers to classes and subjects", icon: Users, tab: "teachers" },
                    { title: "Schedule Exams", description: "Plan test windows and exam timelines", icon: CalendarIcon, tab: "exams" },
                    { title: "View Reports", description: "Track attendance and performance trends", icon: BarChart3, tab: "overview" },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Card
                        key={action.title}
                        className="bg-white/80 border border-white/70 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setActiveTab(action.tab)}
                      >
                        <CardContent className="p-4">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-100 to-teal-100 flex items-center justify-center mb-3">
                            <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-sky-700" />
                          </div>
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900">{action.title}</h3>
                          <p className="text-xs text-slate-600 mt-1">{action.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-sky-100 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Total Students</p>
                    <p className="text-xl sm:text-2xl font-bold text-sky-700 mt-1">{isLoadingStats ? "..." : stats.totalStudents}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-teal-100 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Active Classes</p>
                    <p className="text-xl sm:text-2xl font-bold text-teal-700 mt-1">{isLoadingStats ? "..." : stats.totalClasses}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-teal-50 px-4 py-3 text-xs sm:text-sm text-slate-700">
                  AI assists with administrative tasks and reporting
                </div>

                <AtRiskStudentsPanel />

                <div className="w-full max-w-5xl mx-auto rounded-2xl bg-gradient-to-b from-sky-50 via-cyan-50 to-teal-50 p-4 border border-white/70 shadow-xl">
                  <div className="rounded-t-2xl border-b border-sky-100 bg-white/90 px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800">Chat with Vidya AI</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ask about your school&apos;s students, attendance, exams, and performance data.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-sky-200 text-sky-800 hover:bg-sky-50"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("vidya-chat-clear", { detail: { role: "admin" } })
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Chat
                    </Button>
                  </div>
                  <div className="bg-white/85 rounded-b-2xl border-x border-b border-sky-100 shadow-md" style={{ minHeight: '600px' }}>
                    {adminId ? (
                      <Suspense fallback={lazySectionFallback}>
                        <AIChat
                          userId={adminId}
                          className="flex-1 h-full"
                          promptVariant="admin"
                          context={{
                            studentName: userData?.schoolName || userData?.fullName || userData?.email?.split('@')[0] || "Admin",
                            currentSubject: "Administration",
                            currentTopic: undefined
                          }}
                        />
                      </Suspense>
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[600px]">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Loading chat...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {/* Analytics tab removed */}
        </div>
      </div>
      
      <VidyaAIFloatingAssistant
        role="admin"
        onClick={() => {
          setActiveTab('vidya-ai');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
};

export default AdminDashboard;
