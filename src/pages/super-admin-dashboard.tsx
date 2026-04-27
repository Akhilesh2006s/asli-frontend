import { Suspense, lazy, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SuperAdminSidebar, type SuperAdminView } from "@/components/dashboard/SuperAdminSidebar";
const AdminManagement = lazy(() => import("@/components/admin/AdminManagement"));
const CombinedSuperAdminAnalytics = lazy(() => import("./combined-super-admin-analytics"));
const BoardComparisonCharts = lazy(() => import("@/components/admin/board-comparison-charts"));
const ContentManagement = lazy(() => import("@/components/super-admin/content-management"));
const SubjectManagement = lazy(() => import("@/components/super-admin/subject-management"));
const SubjectContentManagement = lazy(() => import("@/components/super-admin/subject-content-management"));
const ExamManagement = lazy(() => import("@/components/super-admin/exam-management"));
const IQRankBoostActivities = lazy(() => import("@/components/super-admin/iq-rank-boost-activities"));
const SuperAdminCalendar = lazy(() => import("@/components/super-admin/super-admin-calendar"));
const AIChat = lazy(() => import("@/components/ai-chat"));
const AiToolGenerationsPanel = lazy(() => import("@/components/super-admin/ai-tool-generations/AiToolGenerationsPanel"));
const AIContentEngine = lazy(() => import("@/components/super-admin/ai-content-engine"));
const SubscriptionManagement = lazy(() => import("@/components/super-admin/subscription-management"));
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BellIcon, UsersIcon, TrendingUpIcon, BookIcon, UserPlusIcon, BookPlusIcon, SettingsIcon, DownloadIcon, HomeIcon, CrownIcon, BarChart3Icon, ArrowUpRightIcon, ArrowDownRightIcon, StarIcon, TargetIcon, BrainIcon, ZapIcon, AlertTriangleIcon, TrendingDownIcon, RefreshCw, Sparkles, MessageSquare, Clock, Plus, Monitor, Grid3x3, Shield, Search, Camera, PieChart, User, Download, Circle, Square, Bot, Users2, UploadIcon, BrainCircuitIcon, AlertTriangle } from "lucide-react";
import { LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { InteractiveBackground, FloatingParticles } from "@/components/background/InteractiveBackground";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "wouter";

const lazySectionFallback = (
  <div className="rounded-xl border border-orange-100 bg-white p-8 shadow-sm">
    <div className="flex flex-col items-center justify-center gap-3 text-slate-600">
      <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
      <p className="text-sm font-medium">Loading section...</p>
    </div>
  </div>
);

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const search = useSearch();
  const [currentView, setCurrentView] = useState<SuperAdminView>(() => {
    if (typeof window === "undefined") return "dashboard";
    const v = new URLSearchParams(window.location.search).get("view");
    return v === "admins" ? "admins" : "dashboard";
  });
  const [user] = useState({ 
    fullName: 'Super Admin', 
    role: 'super-admin',
    email: 'super.admin@aslilearn.com'
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    courses: 0,
    assessments: 0,
    exams: 0,
    examResults: 0,
    activeVideos: 0,
    activeAssessments: 0,
    avgExamsPerStudent: 0,
    contentEngagement: 0,
    passRate: 0,
    activeStudents: 0,
    activeStudentsPercentage: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [realtimeAnalytics, setRealtimeAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<any>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [vidyaSettingsOpen, setVidyaSettingsOpen] = useState(false);
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(false);
  const [vidyaExplainDepth, setVidyaExplainDepth] = useState<
    "concise" | "balanced" | "detailed"
  >("balanced");

  const VIDYA_PREFS_KEY = "superAdminVidyaPrefs";

  useEffect(() => {
    const view = new URLSearchParams(search).get("view");
    if (view === "admins") {
      setCurrentView("admins");
    }
  }, [search]);

  // Fetch real dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/super-admin/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        } else {
          console.error('Failed to fetch dashboard stats:', response.status);
          toast({
            title: "Error",
            description: "Failed to fetch dashboard statistics",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive"
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [toast]);

  // Defer heavy analytics request so first paint is faster.
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchRealtimeAnalytics();
    }, 1200);

    return () => {
      window.clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIDYA_PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { explainDepth?: typeof vidyaExplainDepth };
      if (p.explainDepth === "concise" || p.explainDepth === "balanced" || p.explainDepth === "detailed") {
        setVidyaExplainDepth(p.explainDepth);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveVidyaPreferences = () => {
    localStorage.setItem(
      VIDYA_PREFS_KEY,
      JSON.stringify({ explainDepth: vidyaExplainDepth, updatedAt: Date.now() })
    );
    toast({
      title: "Preferences saved",
      description: "Vidya AI display preferences are stored in this browser.",
    });
    setVidyaSettingsOpen(false);
  };

  const fetchRealtimeAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/analytics/realtime`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRealtimeAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchBoardDashboard = async (
    boardCode: string,
    showToast = true,
    switchView: boolean = true
  ) => {
    setIsLoadingBoard(true);
    setBoardError(null);
    try {
      const token = localStorage.getItem('authToken');
      console.log('📊 Fetching board dashboard for:', boardCode);
      const response = await fetch(`${API_BASE_URL}/api/super-admin/boards/${boardCode}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Board dashboard response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Board dashboard data received:', data);
        if (data.success) {
          console.log('Setting board data:', data.data);
          console.log('Schools found:', data.data.schoolParticipation?.length || 0);
          setBoardData(data.data);
          setSelectedBoard(boardCode);
          if (switchView) {
            setCurrentView('board');
          }
        } else {
          console.error('API returned success: false:', data.message);
          setBoardData(null);
          setSelectedBoard(boardCode);
          setBoardError(data.message || 'Failed to fetch board data');
          if (showToast) {
            toast({
              title: 'Error',
              description: data.message || 'Failed to fetch board data',
              variant: 'destructive'
            });
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('API error response:', errorData);
        setBoardData(null);
        setSelectedBoard(boardCode);
        setBoardError(errorData.message || `Failed to fetch board dashboard (${response.status})`);
        if (showToast) {
          toast({
            title: 'Error',
            description: errorData.message || `Failed to fetch board dashboard (${response.status})`,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching board dashboard:', error);
      setBoardData(null);
      setSelectedBoard(boardCode);
      setBoardError('Failed to fetch board dashboard. Please check your connection.');
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to fetch board dashboard. Please check your connection.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoadingBoard(false);
    }
  };

  const openBoardManagement = () => {
    const defaultBoard = 'ASLI_EXCLUSIVE_SCHOOLS';

    // If prefetch already has current board data, switch view instantly.
    if (boardData && selectedBoard === defaultBoard) {
      setCurrentView('board');
      return;
    }

    fetchBoardDashboard(defaultBoard);
  };

  // Chart data - will be populated from real analytics when available
  const [totalStudentsData, setTotalStudentsData] = useState<Array<{name: string, value: number}>>([]);
  const [passRateData, setPassRateData] = useState<Array<{name: string, value: number}>>([]);

  // Chart data will be populated from real analytics when available
  const [coursesPerBoardData, setCoursesPerBoardData] = useState<Array<{name: string, value: number, color: string}>>([]);
  const [studentsPerAdminData, setStudentsPerAdminData] = useState<Array<{[key: string]: string | number}>>([]);

  const renderDashboardContent = () => {
    if (selectedBoard && currentView === 'board') {
      return renderBoardDashboard();
    }

    return (
    <div className="min-h-screen relative z-10">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Super Admin</h1>
          <p className="text-gray-600">Manage boards, schools, exams and AI analytic tau at one place.</p>
        </div>

        {/* Board Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Board Management</h2>
          <div className="grid grid-cols-1 gap-4">
            {/* ASLI EXCLUSIVE SCHOOLS */}
            <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 cursor-pointer hover:from-orange-400 hover:to-orange-500 transition-colors shadow-lg" onClick={openBoardManagement}>
              <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold mb-1 text-white">Asli Exclusive Schools</h3>
                    <p className="text-white/90 text-sm">All Boards Content - Unified Platform</p>
                </div>
                  <Users2 className="h-16 w-16 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Management & AI Analytics Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Content Management - Light Blue (CBSE TS color) */}
          <Card 
            className="bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 cursor-pointer hover:from-sky-400 hover:to-sky-500 transition-all duration-300 shadow-lg"
            onClick={() => setCurrentView('content')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1 text-white">Content Management</h3>
                  <p className="text-white/90 text-sm">Manage videos, notes & materials</p>
                </div>
                <UploadIcon className="h-12 w-12 text-white" />
              </div>
            </CardContent>
          </Card>

          {/* Analytics (overview + exam / AI insights) */}
          <Card 
            className="bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 cursor-pointer hover:from-teal-500 hover:to-teal-600 transition-all duration-300 shadow-lg"
            onClick={() => setCurrentView('analytics')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Analytics</h3>
                  <p className="text-teal-100 text-sm">Schools, exams &amp; AI insights</p>
                </div>
                <BrainCircuitIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Students Widget */}
          <Card className="bg-white">
          <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
              <div>
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : (stats.totalStudents || 0).toLocaleString().replace(/\s/g, ' ')}
                  </p>
              </div>
                {totalStudentsData.length > 0 && (
                  <div className="w-16 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={totalStudentsData}>
                        <Area type="monotone" dataKey="value" stroke="#fb923c" fill="#fb923c" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 80% Pass rate Widget */}
          <Card className="bg-white">
          <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
              <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {isLoadingStats ? '...' : (stats.passRate || 0).toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-600">Pass rate data</p>
              </div>
                {passRateData.length > 0 && (
                  <div className="w-16 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={passRateData}>
                        <Area type="monotone" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vidya AI Card - Clickable */}
        <Card 
          className="relative cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-blue-300 hover:border-blue-400 overflow-hidden"
          onClick={() => setCurrentView('vidya-ai')}
        >
          <div className="absolute inset-0 bg-white/85"></div>
          <div className="absolute inset-0 bg-orange-300/15"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Vidya AI</h3>
                <p className="text-sm text-gray-600">24/7 AI Tutor Support</p>
                <p className="text-xs text-orange-500 mt-2 font-medium">Click to access Vidya AI →</p>
              </div>
              <div className="ml-4">
                <img 
                  src="/Vidya-ai.jpg" 
                  alt="Vidya AI" 
                  className="h-24 w-24 object-contain rounded-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Analytics Widget */}
        <Card 
          className="bg-white cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-300"
          onClick={() => setCurrentView('analytics')}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Student Analytics</CardTitle>
            <span className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors flex items-center gap-1">
              View Details <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Total Students</span>
                <span className="text-sm font-semibold text-gray-900">
                  {isLoadingStats ? '...' : (stats.totalStudents || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active Students</span>
                <span className="text-sm font-semibold text-orange-600">
                  {isLoadingStats ? '...' : (stats.activeStudents || 0).toLocaleString()} ({stats.activeStudentsPercentage || 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Avg Exams per Student</span>
                <span className="text-sm font-semibold text-teal-600">
                  {isLoadingStats ? '...' : (Number(stats.avgExamsPerStudent) || 0).toFixed(1)}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Student Engagement</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {isLoadingStats ? '...' : (stats.contentEngagement || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-sky-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${isLoadingStats ? 0 : (stats.contentEngagement || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


      {/* AI-Powered Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TargetIcon className="h-5 w-5 text-orange-400" />
          <h2 className="text-xl font-bold text-gray-900">AI-Powered Recommendations</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <TargetIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Recommendations</h3>
              <p className="text-gray-600">AI-powered insights and recommendations will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3Icon className="h-5 w-5 text-teal-400" />
            <h2 className="text-xl font-bold text-gray-900">Real-time Analytics</h2>
          </div>
          <Button onClick={fetchRealtimeAnalytics} disabled={isLoadingAnalytics} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoadingAnalytics ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3Icon className="h-12 w-12 animate-spin text-teal-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading real-time analytics...</p>
            </CardContent>
          </Card>
        ) : realtimeAnalytics ? (
          <div className="space-y-6">
            {/* Overall Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-600 font-medium">Total Students</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">{stats.totalStudents || realtimeAnalytics.overallMetrics?.totalStudents || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
                <CardContent className="p-4">
                  <p className="text-sm text-teal-600 font-medium">Total Exams</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent">{realtimeAnalytics.overallMetrics?.totalExams || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-600 font-medium">Exam Results</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">{realtimeAnalytics.overallMetrics?.totalExamResults || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
                <CardContent className="p-4">
                  <p className="text-sm text-violet-700 font-medium">Overall Average</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent">{realtimeAnalytics.overallMetrics?.overallAverage || 0}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Scorers by Exam */}
            {realtimeAnalytics.topScorersByExam && realtimeAnalytics.topScorersByExam.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Top Scorers by Exam</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {realtimeAnalytics.topScorersByExam.slice(0, 3).map((exam: any, examIdx: number) => {
                      const colorSchemes = [
                        { bg: 'from-orange-300 to-orange-400', border: 'border-orange-200' },
                        { bg: 'from-sky-300 to-sky-400', border: 'border-sky-200' },
                        { bg: 'from-teal-400 to-teal-500', border: 'border-teal-200' }
                      ];
                      const colorScheme = colorSchemes[examIdx % 3];
                      
                      return (
                        <div key={`${exam.examId || exam.examTitle || 'exam'}-${examIdx}`} className={`border-2 ${colorScheme.border} rounded-lg p-4 bg-gradient-to-br ${colorScheme.bg} text-white`}>
                          <h4 className="font-semibold text-white mb-3">{exam.examTitle}</h4>
                          <div className="space-y-2">
                            {exam.topScorers.slice(0, 5).map((scorer: any, idx: number) => (
                              <div key={`${scorer.studentId || scorer.studentEmail || scorer.studentName || 'scorer'}-${idx}`} className="flex items-center justify-between p-2 bg-white/90 backdrop-blur-sm rounded border border-white/50 shadow-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{scorer.studentName}</p>
                                  <p className="text-xs text-gray-600">{scorer.studentEmail}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-orange-600">{scorer.percentage?.toFixed(1)}%</p>
                                  <p className="text-xs text-gray-600">{scorer.marks}/{scorer.totalMarks} marks</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low-performing Admins */}
            {realtimeAnalytics.lowPerformingAdmins && realtimeAnalytics.lowPerformingAdmins.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center">
                    <AlertTriangleIcon className="h-5 w-5 mr-2" />
                    Low-performing Admins (Needs Attention)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realtimeAnalytics.lowPerformingAdmins.map((admin: any, idx: number) => (
                      <div key={`${admin.adminId || admin.adminEmail || admin.adminName || 'admin'}-${idx}`} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                        <div>
                          <p className="font-semibold text-gray-900">{admin.adminName}</p>
                          <p className="text-sm text-gray-600">{admin.adminEmail}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {admin.totalStudents} students • {admin.totalExams} exams
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{admin.averageScore}%</p>
                          <p className="text-xs text-gray-600">Average Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Performance Overview */}
            {realtimeAnalytics.adminAnalytics && realtimeAnalytics.adminAnalytics.length > 0 && (
              <Card className="relative border-0 overflow-hidden" style={{
                background: 'linear-gradient(135deg, #7dd3fc 0%, #7dd3fc 20%, #2dd4bf 60%, #14b8a6 100%)'
              }}>
                <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center text-gray-900">
                    <TrendingUpIcon className="w-5 h-5 mr-2" />
                    Admin Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-4">
                    {realtimeAnalytics.adminAnalytics.slice(0, 5).map((admin: any, idx: number) => (
                      <div key={`${admin.adminId || admin.adminEmail || admin.adminName || 'admin'}-${idx}`} className="p-4 bg-white/90 backdrop-blur-sm rounded-lg border border-white/50 shadow-md">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">{admin.adminName}</h3>
                            <p className="text-gray-600">{admin.adminEmail || `${admin.totalStudents} students`}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-lg">{admin.averageScore}%</p>
                            <p className="text-xs text-gray-600">Avg Score</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No analytics data available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI-Powered Insights - Real data will be displayed here when available */}
      {realtimeAnalytics && realtimeAnalytics.insights && realtimeAnalytics.insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BrainIcon className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realtimeAnalytics.insights.slice(0, 2).map((insight: any, index: number) => (
              <Card key={`${insight.id || insight.title || insight.description || 'insight'}-${index}`} className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-300 to-blue-400 rounded-lg">
                      <BrainIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                        {insight.title || insight.description || 'Insight'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {insight.generatedAt ? new Date(insight.generatedAt).toLocaleString() : 'Recently generated'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
    );
  };

  // Auto-load board data when entering Board Management
  useEffect(() => {
    if (currentView !== 'board') return;
    if (isLoadingBoard) return;
    if (boardData) return;
    if (boardError) return;

    const boardCode = selectedBoard || 'ASLI_EXCLUSIVE_SCHOOLS';
    console.log('🔄 Auto-loading board dashboard for:', boardCode);
    fetchBoardDashboard(boardCode, false); // Don't show toast on auto-load
    // Intentionally include dependencies so it runs on mount/view change and doesn't rely on manual refresh.
  }, [currentView, selectedBoard, isLoadingBoard, boardData, boardError]);

  const renderBoardDashboard = () => {
    if (boardError) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">{boardError}</p>
          <Button onClick={() => fetchBoardDashboard(selectedBoard || 'ASLI_EXCLUSIVE_SCHOOLS')} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    // Use cached data when available; otherwise fall back to safe defaults
    const stats = boardData?.stats || {};
    let boardName = boardData?.board?.name || selectedBoard || 'Board';
    // Format board name to title case
    if (boardName === 'ASLI EXCLUSIVE SCHOOLS' || boardName === 'ASLI_EXCLUSIVE_SCHOOLS') {
      boardName = 'Asli Exclusive Schools';
    }
    
    return (
      <div className="space-y-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={() => { setSelectedBoard(null); setCurrentView('dashboard'); }} className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white">
              ← Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{boardName}</h1>
              <p className="text-gray-600">Manage content, exams, subjects, and view analytics</p>
            </div>
          </div>
        </div>

        {/* Board Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <p className="text-sm text-orange-600 font-medium">Students</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
                {typeof stats.students === 'number' ? stats.students : 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <p className="text-sm text-teal-600 font-medium">Teachers</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent">
                {typeof stats.teachers === 'number' ? stats.teachers : 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <p className="text-sm text-orange-600 font-medium">Exams</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                {typeof stats.exams === 'number' ? stats.exams : 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <p className="text-sm text-violet-700 font-medium">Avg Score</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-orange-400 bg-clip-text text-transparent">
                {typeof stats.averageScore === 'number' || typeof stats.averageScore === 'string'
                  ? `${stats.averageScore}%`
                  : '0.00%'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Board Comparison Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Board Performance Comparison</h2>
          <Suspense fallback={lazySectionFallback}>
            <BoardComparisonCharts />
          </Suspense>
        </div>
      </div>
    );
  };

  const renderAdminsContent = () => (
    <Suspense fallback={lazySectionFallback}>
      <AdminManagement />
    </Suspense>
  );

  const renderAnalyticsContent = () => (
    <Suspense fallback={lazySectionFallback}>
      <CombinedSuperAdminAnalytics />
    </Suspense>
  );

  const renderBoardComparisonContent = () => (
    <Suspense fallback={lazySectionFallback}>
      <BoardComparisonCharts />
    </Suspense>
  );

  const renderSubscriptionsContent = () => (
    <Suspense fallback={lazySectionFallback}>
      <SubscriptionManagement />
    </Suspense>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Settings</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600 mb-4">Configure system settings and preferences</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSystemSettingsOpen(true)}
            >
              Open Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVidyaAIContent = () => {
    const quickActions = [
      {
        title: "View AI Usage Reports",
        description: "Review adoption and query patterns by school",
        icon: BarChart3Icon,
        prompt: "Show AI usage statistics across schools",
      },
      {
        title: "Monitor Active Sessions",
        description: "Track live AI conversations across organizations",
        icon: Monitor,
        prompt: "Monitor active AI sessions and highlight spikes",
      },
      {
        title: "Configure AI Models",
        description: "Tune model behavior and global response controls",
        icon: BrainCircuitIcon,
        prompt: "Configure model behavior and recommended guardrails",
      },
      {
        title: "Risk & Compliance Insights",
        description: "Audit policy exceptions and moderation signals",
        icon: Shield,
        prompt: "Detect anomalies in AI responses and compliance risks",
      },
    ];

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-400 to-orange-500 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <Badge className="bg-white text-orange-600 hover:bg-white">System Control</Badge>
          </div>
          <h2 className="text-3xl font-bold text-white">AI System Assistant</h2>
          <p className="text-white/90 mt-1">Manage and monitor AI across all schools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="cursor-pointer border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("vidya-chat-prefill", {
                      detail: {
                        role: "super_admin",
                        message: action.prompt,
                      },
                    })
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{action.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="w-full rounded-2xl bg-[#F5F7FA] border border-slate-200 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.8)] p-2">
            <Suspense fallback={lazySectionFallback}>
              <AIChat
                userId="super-admin"
                context={{}}
                promptVariant="super-admin"
                className="w-full h-[640px]"
              />
            </Suspense>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Grid3x3 className="w-4 h-4 text-orange-500" />
                AI Operations Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-slate-500">AI Status</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">Inference Service</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Online</Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-slate-500">Model Version</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">Primary Model</span>
                  <span className="text-sm text-slate-600">v3.2.1</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-slate-500">Active Requests</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">Current Queue</span>
                  <span className="text-sm font-semibold text-orange-600">124</span>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                onClick={() => setVidyaSettingsOpen(true)}
              >
                Open System Controls
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardContent();
      case 'board':
        return renderBoardDashboard();
      case 'admins':
        return renderAdminsContent();
      case 'subjects-and-content':
        return (
          <Suspense fallback={lazySectionFallback}>
            <SubjectContentManagement />
          </Suspense>
        );
      case 'content':
        return (
          <Suspense fallback={lazySectionFallback}>
            <ContentManagement />
          </Suspense>
        );
      case 'subjects':
        return (
          <Suspense fallback={lazySectionFallback}>
            <SubjectManagement />
          </Suspense>
        );
      case 'exams':
        return (
          <Suspense fallback={lazySectionFallback}>
            <ExamManagement />
          </Suspense>
        );
      case 'iq-rank-boost':
        return (
          <Suspense fallback={lazySectionFallback}>
            <IQRankBoostActivities />
          </Suspense>
        );
      case 'calendar':
        return (
          <Suspense fallback={lazySectionFallback}>
            <SuperAdminCalendar
              onNavigateToExams={(prefill) => {
                sessionStorage.setItem('examCalendarPrefill', JSON.stringify(prefill));
                setCurrentView('exams');
              }}
            />
          </Suspense>
        );
      case 'vidya-ai':
        return renderVidyaAIContent();
      case 'analytics':
        return renderAnalyticsContent();
      case 'board-comparison':
        return renderBoardComparisonContent();
      case 'ai-analytics':
        return renderAnalyticsContent();
      case 'ai-tool-generations':
        return (
          <Suspense fallback={lazySectionFallback}>
            <AiToolGenerationsPanel />
          </Suspense>
        );
      case 'ai-content-engine':
        return (
          <Suspense fallback={lazySectionFallback}>
            <AIContentEngine />
          </Suspense>
        );
      case 'subscriptions':
        return renderSubscriptionsContent();
      case 'settings':
        return renderSettingsContent();
      default:
        return renderDashboardContent();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminUser');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('authToken');
    window.location.href = '/auth/login';
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Fixed sidebar */}
      <SuperAdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onLogout={handleLogout}
      />

      {/* Scrollable main content area */}
      <div className={cn("flex flex-col", isMobile ? "ml-0 min-h-screen pt-14" : "ml-64 h-screen overflow-y-auto")}>
        <div
          className={cn(
            "flex-1 min-h-0",
            currentView === "ai-tool-generations"
              ? "p-0"
              : isMobile
                ? "p-3 sm:p-4"
                : "p-6",
          )}
        >
          {renderContent()}
        </div>
      </div>

      <Dialog open={vidyaSettingsOpen} onOpenChange={setVidyaSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vidya AI settings</DialogTitle>
            <DialogDescription>
              Model choice and API credentials are configured on the server (environment / deployment). Here you can set
              tutor display preferences for this browser and jump to related tools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="vidya-depth">Default explanation depth</Label>
              <Select
                value={vidyaExplainDepth}
                onValueChange={(v: "concise" | "balanced" | "detailed") => setVidyaExplainDepth(v)}
              >
                <SelectTrigger id="vidya-depth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise — short answers</SelectItem>
                  <SelectItem value="balanced">Balanced — recommended</SelectItem>
                  <SelectItem value="detailed">Detailed — step-by-step</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stored locally in your browser; future chat updates can read this preference.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setVidyaSettingsOpen(false);
                  setCurrentView("analytics");
                }}
              >
                Open AI Analytics
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setVidyaSettingsOpen(false);
                  setCurrentView("settings");
                }}
              >
                Open system settings
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setVidyaSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-orange-400 to-orange-300 hover:from-orange-500 hover:to-orange-400"
              onClick={saveVidyaPreferences}
            >
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={systemSettingsOpen} onOpenChange={setSystemSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>System settings</DialogTitle>
            <DialogDescription>
              Shortcuts to main modules. Secrets and database URLs are set on the server, not here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Quick links</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("vidya-ai");
                    setVidyaSettingsOpen(true);
                  }}
                >
                  Vidya AI preferences
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("calendar");
                  }}
                >
                  School Calendar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("exams");
                  }}
                >
                  Exam Management
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("admins");
                  }}
                >
                  School Management
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("subjects-and-content");
                  }}
                >
                  Subject &amp; Content
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("analytics");
                  }}
                >
                  Analytics
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSystemSettingsOpen(false);
                    setCurrentView("subscriptions");
                  }}
                >
                  Subscriptions
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To change AI provider keys, JWT secrets, or database URLs, update the backend <code className="rounded bg-muted px-1">.env</code> and
              redeploy.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSystemSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
