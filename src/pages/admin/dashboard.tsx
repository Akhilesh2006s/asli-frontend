// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { API_BASE_URL } from '@/lib/api-config';
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
  Calendar as CalendarIcon
} from 'lucide-react';
import { useLocation } from 'wouter';
import UserManagement from '@/components/admin/user-management';
import ClassManagement from '@/components/admin/class-management';
import ClassDashboard from '@/components/admin/class-dashboard';
import TeacherManagement from '@/components/admin/teacher-management';
import SubjectManagement from '@/components/admin/subject-management';
import ExamViewOnly from '@/components/admin/exam-view-only';
import AdminLearningPaths from '@/components/admin/learning-paths';
import AdminEduOTT from '@/components/admin/admin-eduott';
import AdminCalendar from '@/components/admin/admin-calendar';
import AIChat from '@/components/ai-chat';

const AdminDashboard = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
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
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your admin dashboard</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Vidya AI Corner Button Component
  const VidyaAICornerButton = () => {
    const messages = [
      "Need help managing your school?",
      "Ask me about student management",
      "Need help with class assignments?",
      "Ask me about teacher management?"
    ];
    const [currentMessage, setCurrentMessage] = useState(0);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentMessage((prev) => (prev + 1) % messages.length);
      }, 3000);
      return () => clearInterval(interval);
    }, [messages.length]);
    
    return (
      <div className="fixed bottom-6 left-4 z-50">
        {/* Message Popup */}
        <div className="relative mb-2 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg p-2 border border-orange-200 relative">
            <p className="text-xs font-medium text-gray-800 whitespace-nowrap">
              {messages[currentMessage]}
            </p>
            {/* Speech bubble tail */}
            <div className="absolute bottom-0 left-6 transform translate-y-full">
              <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-orange-200"></div>
              <div className="absolute top-0 left-0 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-white" style={{ marginTop: '-1px' }}></div>
            </div>
          </div>
        </div>
        
        {/* Vidya AI Image - Small Button Style */}
        <button
          onClick={() => {
            setActiveTab('vidya-ai');
            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl border-2 border-orange-300 hover:border-orange-400 bg-white p-1 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          <img 
            src="/Vidya-ai.jpg" 
            alt="Vidya AI - Click to chat" 
            className="w-full h-full rounded-full object-cover"
          />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-sky-50 flex relative overflow-hidden">
      {/* Interactive Background */}
      <div className="fixed inset-0 z-0">
        {/* Interactive Background - Disabled for better performance */}
        {/* <InteractiveBackground />
        <FloatingParticles /> */}
      </div>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-white/20 relative">
          <div className="flex items-center justify-between p-responsive">
            <div className="flex items-center space-x-responsive">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-responsive-sm">AS</span>
              </div>
              <div>
                <h1 className="text-responsive-base font-bold text-white">ASLILEARN AI</h1>
                <p className="text-responsive-xs text-white/90 font-medium">Admin Panel</p>
              </div>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-gradient-to-b from-orange-400 to-orange-500">
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
                      onClick={() => setActiveTab('overview')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'overview' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <BarChart3 className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Dashboard</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('students')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'students' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Students</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('classes')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'classes' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <GraduationCap className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Classes</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('teachers')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'teachers' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Teachers</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('subjects')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'subjects' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <BookOpen className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Subjects</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('exams')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'exams' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <FileText className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Exams</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('learning-paths')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'learning-paths' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Target className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Learning Paths</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('eduott')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'eduott' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Play className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">EduOTT</span>
                    </button>
                    
                    <button
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
                      className="w-full flex items-center space-x-responsive px-responsive py-responsive rounded-responsive text-left transition-all duration-200 backdrop-blur-sm text-responsive-sm text-gray-700 hover:bg-red-50 hover:text-red-900"
                    >
                      <LogOut className="w-4 h-4" />
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
        <div className="w-64 bg-gradient-to-b from-orange-400 to-orange-500 shadow-2xl border-r border-orange-300 relative z-10">
        {/* Logo Section */}
        <div className="p-6 border-b border-orange-300/50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-xl">AS</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ASLILEARN AI</h1>
              <p className="text-xs text-white/90 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <BarChart3 className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'students' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <Users className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Students</span>
          </button>
          
          <button
            onClick={() => setActiveTab('classes')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'classes' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <GraduationCap className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Classes</span>
          </button>
          
          <button
            onClick={() => setActiveTab('teachers')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'teachers' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <Users className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Teachers</span>
          </button>
          
          <button
            onClick={() => setActiveTab('subjects')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'subjects' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <BookOpen className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Subjects</span>
          </button>
          
          <button
            onClick={() => setActiveTab('exams')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'exams' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <FileText className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Exams</span>
          </button>
          
          <button
            onClick={() => setActiveTab('learning-paths')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'learning-paths' 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-white hover:bg-orange-600/50'
            }`}
          >
            <Target className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">Learning Paths</span>
          </button>
          
                    <button
                      onClick={() => setActiveTab('eduott')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'eduott' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Play className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">EduOTT</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'calendar' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Calendar</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('vidya-ai')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === 'vidya-ai' 
                          ? 'bg-white text-orange-600 shadow-md' 
                          : 'text-white hover:bg-orange-600/50'
                      }`}
                    >
                      <Sparkles className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">Vidya AI</span>
                    </button>
          
        </nav>
      </div>
      )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative z-10">
          {/* Top Header - Student Dashboard Theme */}
          <div className="bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 shadow-xl border-b-0 rounded-b-3xl px-responsive py-6 relative z-10">
            <div className="flex-responsive-col items-center sm:items-start justify-between space-y-responsive sm:space-y-0">
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-900 mb-2">Admin Control Center</p>
                <h2 className="text-responsive-xl font-bold capitalize text-gray-900">{activeTab}</h2>
                <p className="text-gray-900 text-responsive-sm font-medium">Manage your learning platform with style</p>
                {userData && (
                  <div className="mt-2">
                    <p className="text-gray-800 text-sm font-medium">
                      {userData.email} ::: {userData.schoolName || userData.fullName || 'School'}
                    </p>
                    <p className="text-gray-900 text-base font-semibold mt-1">
                      Welcome {userData.schoolName || userData.fullName || 'Admin'}
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
                    <LogOut className="w-4 h-4 mr-responsive" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className={`flex-1 p-responsive overflow-auto ${isMobile ? 'pt-20' : ''} relative z-10`}>
          {activeTab === 'overview' && (
            <div className="space-y-8">
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
                      <Users className="w-8 h-8 text-white" />
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
                      <GraduationCap className="w-8 h-8 text-white" />
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
                      <Activity className="w-8 h-8 text-white" />
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
                      <Users className="w-8 h-8 text-white" />
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="group relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Videos</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : (stats.totalVideos || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-responsive-xs font-medium">Assessments</p>
                      <p className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : (stats.totalAssessments || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

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
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-responsive-lg font-bold text-orange-600">Detailed School Analysis</h3>
                    <p className="text-gray-600 text-responsive-xs">Comprehensive insights about your students</p>
                  </div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Class Distribution */}
                    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <GraduationCap className="w-5 h-5 mr-2 text-orange-600" />
                        Class Distribution
                      </h4>
                      <div className="space-y-2">
                        {topClassDistribution.length > 0 ? (
                          topClassDistribution.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">{item.className || item.class || 'Unknown'}</span>
                              <span className="font-semibold text-orange-600">{item.count || 0} students</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No class data available</div>
                        )}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                        Performance Metrics
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Average Score</span>
                          <span className="text-lg font-bold text-green-600">
                            {studentAnalytics.performanceMetrics?.averageScore || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Exams Taken</span>
                          <span className="text-lg font-bold text-orange-600">
                            {studentAnalytics.performanceMetrics?.totalExamsTaken || 0}
                          </span>
                        </div>
                        {studentAnalytics.performanceMetrics?.topPerformers && studentAnalytics.performanceMetrics.topPerformers.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500 mb-1">Top Performer</p>
                            <p className="text-sm font-semibold text-gray-900">
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
                        <BookOpen className="w-5 h-5 mr-2 text-orange-600" />
                        Subject Performance
                      </h4>
                      <div className="space-y-2">
                        {topSubjectPerformance.length > 0 ? (
                          topSubjectPerformance.map((subject: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
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
                          <div className="text-sm text-gray-500">No subject data available</div>
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
                      <Users className="w-8 h-8 text-white" />
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
                      Click to view details →
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => setActiveTab('teachers')}
                className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 shadow-xl cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Your Teachers</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/90 text-lg font-medium">Total Teachers Assigned</span>
                      <span className="text-responsive-xl font-bold text-white">
                        {isLoadingStats ? '...' : (stats.totalTeachers || 0)}
                      </span>
                    </div>
                    <div className="text-white/80 text-responsive-xs">
                      These are the teachers specifically assigned to your admin account
                    </div>
                    <div className="text-white/90 text-xs font-medium mt-2 flex items-center gap-1">
                      Click to view details →
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Activity */}
            {/* Recent Activity removed per request */}
            </div>
          )}

          {activeTab === 'students' && <UserManagement />}
          {activeTab === 'classes' && <ClassDashboard />}
          {activeTab === 'teachers' && <TeacherManagement />}
          {activeTab === 'subjects' && <SubjectManagement />}
          {activeTab === 'exams' && <ExamViewOnly />}
          {activeTab === 'learning-paths' && <AdminLearningPaths />}
          {activeTab === 'eduott' && <AdminEduOTT />}
          {activeTab === 'calendar' && <AdminCalendar />}
          {activeTab === 'vidya-ai' && (
            <div className="space-y-6">
              {/* Vidya AI */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img 
                      src="/Vidya-ai.jpg" 
                      alt="Vidya AI" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">Vidya AI</h3>
                </div>

                {/* Chat Content */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Chat Assistant</h2>
                    <p className="text-gray-600">Get instant help with administrative questions, student management, and educational guidance</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-md border border-gray-200" style={{ minHeight: '600px' }}>
                    {adminId ? (
                      <AIChat
                        userId={adminId}
                        className="flex-1 h-full"
                        context={{
                          studentName: userData?.schoolName || userData?.fullName || userData?.email?.split('@')[0] || "Admin",
                          currentSubject: "Administration",
                          currentTopic: undefined
                        }}
                      />
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
      
      {/* Vidya AI Corner Button */}
      <VidyaAICornerButton />
    </div>
  );
};

export default AdminDashboard;
