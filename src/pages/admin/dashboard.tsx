// @ts-nocheck
import { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminShell from '@/components/layout/AdminShell';
import StatCard from '@/components/dashboard/StatCard';
import { API_BASE_URL } from '@/lib/api-config';
import { AtRiskStudentsPanel } from '@/components/admin/AtRiskStudentsPanel';
import {
  BookOpen,
  Users,
  BarChart3,
  Trash2,
  TrendingUp,
  Activity,
  GraduationCap,
  UserPlus,
  FileText,
  Sparkles,
  MessageCircle,
  Calendar as CalendarIcon,
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

  const selectTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setLocation(`/admin/dashboard?tab=${tab}`);
  }, [setLocation]);

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
      <AdminShell contentClassName="teacher-playful-dashboard">
        <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl items-center justify-center px-4 py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-blue-600 text-white">
              <Activity className="h-5 w-5 animate-spin" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900">Loading workspace</h2>
            <p className="mt-1 text-sm text-slate-600">Preparing your admin dashboard…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminShell contentClassName="teacher-playful-dashboard">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-4 pb-8 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {(() => {
          const pageMeta: Record<string, { title: string; subtitle: string }> = {
            overview: {
              title: 'Overview',
              subtitle: 'School pulse — students, teachers, classes, and risk signals.',
            },
            students: {
              title: 'Students',
              subtitle: 'Enroll, manage, and review your school roster.',
            },
            classes: {
              title: 'Classes',
              subtitle: 'Sections, capacity, and class dashboards.',
            },
            teachers: {
              title: 'Teachers',
              subtitle: 'Assign teachers to classes and subjects.',
            },
            subjects: {
              title: 'Subjects',
              subtitle: 'Curriculum subjects and content mapping.',
            },
            exams: {
              title: 'Exams',
              subtitle: 'View scheduled exams and results for your school.',
            },
            'learning-paths': {
              title: 'Learning Paths',
              subtitle: 'Curriculum paths available to your students.',
            },
            eduott: {
              title: 'EduOTT',
              subtitle: 'Videos and live sessions for your school.',
            },
            timetable: {
              title: 'Timetable',
              subtitle: 'Weekly schedule and period planning.',
            },
            calendar: {
              title: 'Calendar',
              subtitle: 'School events and important dates.',
            },
            'vidya-ai': {
              title: 'Vidya AI',
              subtitle: 'School operations assistant for admin workflows.',
            },
          };
          const meta = pageMeta[activeTab] || pageMeta.overview;
          return (
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-blue-600">
                  Admin Portal
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {meta.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  {meta.subtitle}
                </p>
                {userData ? (
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Welcome, {userData.fullName || 'Admin'}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })()}

        <div className="space-y-6">
{activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Soft pastel stats — same language as teacher/student */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Students"
                value={isLoadingStats ? '…' : String(stats.totalStudents)}
                icon={Users}
                tone="amber"
                motif="wave"
              />
              <StatCard
                label="Active Classes"
                value={isLoadingStats ? '…' : String(stats.totalClasses)}
                icon={GraduationCap}
                tone="blue"
                motif="bars"
              />
              <StatCard
                label="Active Users"
                value={isLoadingStats ? '…' : String(stats.activeUsers)}
                icon={Activity}
                tone="teal"
                motif="ring"
              />
              <StatCard
                label="Teachers"
                value={isLoadingStats ? '…' : String(stats.totalTeachers || 0)}
                icon={Users}
                tone="violet"
                motif="wave"
              />
            </div>

            <AtRiskStudentsPanel />

            {/* Detailed School Analysis Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-blue-500 to-indigo-blue-600 p-3 shadow-sm">
                    <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">Detailed School Analysis</h3>
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
                <div className="rounded-2xl border border-indigo-blue-100 bg-gradient-to-br from-indigo-blue-50 via-white to-sky-50 p-5 shadow-sm sm:p-6">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-blue-600 text-white shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <Badge className="bg-indigo-blue-100 text-indigo-blue-800 hover:bg-indigo-blue-100">
                      School Operations
                    </Badge>
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">School AI Assistant</h2>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">
                    Manage students, teachers, and academic workflows with Vidya.
                  </p>
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
                        onClick={() => selectTab(action.tab)}
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
        </div>
      </div>

      <VidyaAIFloatingAssistant
        role="admin"
        onClick={() => {
          selectTab('vidya-ai');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </AdminShell>
  );
};

export default AdminDashboard;
