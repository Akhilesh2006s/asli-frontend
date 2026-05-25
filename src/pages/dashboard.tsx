import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Navigation from "@/components/navigation";
import {
  filterContentsBySchoolProgram,
  resolveIsAsliPrepExclusive,
} from "@/lib/school-program";
import {
  buildTodaysTasksContentList,
  getContentSubjectId,
  getVideoDisplayTitle,
  isVideoContentType,
  nextChapterCompletedDates,
  type ChapterCompletedDates,
} from "@/lib/video-chapter-schedule";
import { StudentTeacherDiaryFeed } from "@/components/student/StudentTeacherDiaryFeed";
import StudentTimetableView from "@/components/student/StudentTimetableView";
import { 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  Play, 
  FileText, 
  Zap,
  Calendar,
  Download,
  Users,
  Star,
  Clock,
  Award,
  Target,
  BookOpen,
  ArrowRight,
  Video,
  BookOpen as BookIcon,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Gamepad2,
  Calculator,
  Atom,
  FlaskConical,
  Microscope,
  FileText as FileTextIcon,
  Video as VideoIcon,
  Image as ImageIcon,
  File,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  Headphones,
  GraduationCap,
  Sparkles,
  BookMarked,
  Brain,
  Calendar as CalendarIcon,
  HelpCircle,
  FileText as FileTextIcon2,
  Key,
  ClipboardList as ClipboardListIcon,
  CheckCircle2 as CheckCircle2Icon,
  Layout,
  Target as TargetIcon,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  ArrowRightCircle,
  BookCheck,
  Globe,
  Flame,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import YouTubePlayer from '@/components/youtube-player';
import DriveViewer from '@/components/drive-viewer';
import VideoModal from '@/components/video-modal';
import { API_BASE_URL, apiFetch, getStudentPdfPreviewIframeSrc } from '@/lib/api-config';
import { buildExamCalendarEntries } from '@/lib/exam-calendar-entries';
import { buildTimetableCalendarEntries } from '@/lib/timetable-calendar-entries';
import { useTimetableEntries } from '@/hooks/useTimetable';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, parseISO } from 'date-fns';
import { getUser as getStoredUser } from '@/lib/auth-utils';
import { fetchAuthUser, peekCachedAuthUser } from '@/lib/auth-session';
import { fetchDashboardBootstrap } from '@/lib/dashboard-bootstrap';
import {
  getTodayStudyTime,
  getWeeklyStudyTime,
  updateStudyTime,
  startSession,
  endSession,
  getWeeklyStudyData,
  getLocalIsoDateKey,
} from '@/utils/studyTimeTracker';
import '@/utils/debugStudyTime'; // Load debug helper
import {
  readDashboardStatsCache,
  writeDashboardStatsCache,
} from '@/utils/dashboard-stats-cache';
import { InteractiveBackground, FloatingParticles } from "@/components/background/InteractiveBackground";
import AdaptiveRecommendations from "@/components/dashboard/AdaptiveRecommendations";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";
const initialStoredUser = getStoredUser();
const initialDashboardStatsCache = readDashboardStatsCache();

const MAX_STUDY_MINUTES_PER_DAY = 12 * 60;
const MAX_STUDY_MINUTES_PER_WEEK = MAX_STUDY_MINUTES_PER_DAY * 7;

function capStudyMinutes(minutes: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(minutes)));
}

/** Backend week total already includes today â€” replace today's slice with live capped today. */
function mergeDisplayedStudyTime(
  baseline: {
    useBackend: boolean;
    backendToday: number;
    backendWeek: number;
    localTodayAtLoad: number;
  },
  localTimes: { today: number; thisWeek: number },
) {
  if (!baseline.useBackend) {
    return {
      today: capStudyMinutes(localTimes.today, MAX_STUDY_MINUTES_PER_DAY),
      thisWeek: capStudyMinutes(localTimes.thisWeek, MAX_STUDY_MINUTES_PER_WEEK),
    };
  }
  const deltaToday = Math.max(0, localTimes.today - baseline.localTodayAtLoad);
  const mergedToday = capStudyMinutes(
    Math.max(baseline.backendToday + deltaToday, localTimes.today),
    MAX_STUDY_MINUTES_PER_DAY,
  );
  const weekWithoutToday = Math.max(0, baseline.backendWeek - baseline.backendToday);
  const thisWeek = capStudyMinutes(
    Math.max(weekWithoutToday + mergedToday, localTimes.thisWeek),
    MAX_STUDY_MINUTES_PER_WEEK,
  );
  return { today: mergedToday, thisWeek };
}

function collectCompletedContentIds(): Set<string> {
  const completedContentIds = new Set<string>();
  try {
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith('completed_content_')) return;
      const completed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(completed)) {
        completed.forEach((id: string) => completedContentIds.add(String(id)));
      }
    });
    collectScheduleCompletedIdsOnly().forEach((id) => completedContentIds.add(id));
  } catch {
    // ignore
  }
  return completedContentIds;
}

/** Today's Tasks checkbox only — do not use subject library completion for non-video. */
function collectScheduleCompletedIdsOnly(): Set<string> {
  const ids = new Set<string>();
  try {
    const storedSchedule = localStorage.getItem('completed_schedule_items');
    if (!storedSchedule) return ids;
    const data = JSON.parse(storedSchedule);
    const today = new Date().toDateString();
    if (data.date === today && Array.isArray(data.completedIds)) {
      data.completedIds.forEach((id: string) => ids.add(String(id)));
    }
  } catch {
    // ignore
  }
  return ids;
}

function buildScheduleCompletionStats(allContent: any[], allQuizzes: any[]) {
  const completedContentIds = collectCompletedContentIds();
  const trackableContent = allContent.filter(
    (content: any) => String(content.type || '').toLowerCase() !== 'homework',
  );
  const completedContent = trackableContent.filter((content: any) =>
    completedContentIds.has(String(content._id || content.id)),
  ).length;
  const completedQuizzes = allQuizzes.filter(
    (quiz: any) => quiz.hasAttempted || quiz.completedAt,
  ).length;
  const totalContent = trackableContent.length;
  const totalQuizzes = allQuizzes.length;
  const total = totalContent + totalQuizzes;
  const completed = completedContent + completedQuizzes;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    totalContent,
    completedContent,
    totalQuizzes,
    completedQuizzes,
    total,
    completed,
    completionPercent,
  };
}

function getSubjectProgressIconMeta(name: string): {
  Icon: LucideIcon;
  iconClass: string;
  bgClass: string;
} {
  const subjectName = (name || '').toLowerCase();
  if (subjectName.includes('math') || subjectName.includes('mathematics')) {
    return { Icon: Calculator, iconClass: 'text-orange-600', bgClass: 'bg-orange-50' };
  }
  if (subjectName.includes('physics')) {
    return { Icon: Atom, iconClass: 'text-blue-600', bgClass: 'bg-blue-50' };
  }
  if (subjectName.includes('chem')) {
    return { Icon: FlaskConical, iconClass: 'text-teal-600', bgClass: 'bg-teal-50' };
  }
  if (subjectName.includes('bio') || subjectName.includes('science')) {
    return { Icon: Microscope, iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50' };
  }
  if (subjectName.includes('english')) {
    return { Icon: BookIcon, iconClass: 'text-indigo-600', bgClass: 'bg-indigo-50' };
  }
  if (subjectName.includes('hindi') || subjectName.includes('language')) {
    return { Icon: BookOpen, iconClass: 'text-violet-600', bgClass: 'bg-violet-50' };
  }
  if (subjectName.includes('social') || subjectName.includes('history') || subjectName.includes('geo')) {
    return { Icon: Globe, iconClass: 'text-amber-700', bgClass: 'bg-amber-50' };
  }
  if (subjectName.includes('computer') || subjectName.includes('cs')) {
    return { Icon: Monitor, iconClass: 'text-sky-600', bgClass: 'bg-sky-50' };
  }
  return { Icon: BookOpen, iconClass: 'text-slate-600', bgClass: 'bg-slate-50' };
}

function SubjectProgressIcon({ name }: { name: string }) {
  const { Icon, iconClass, bgClass } = getSubjectProgressIconMeta(name);
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bgClass}`}>
      <Icon className={`h-4 w-4 ${iconClass}`} strokeWidth={2} aria-hidden />
    </div>
  );
}

function buildSessionTimeBaselineFromCache() {
  if (!initialDashboardStatsCache) {
    return {
      useBackend: false,
      backendToday: 0,
      backendWeek: 0,
      localTodayAtLoad: 0,
      localWeekAtLoad: 0,
    };
  }
  const local = updateStudyTime();
  return {
    useBackend: true,
    backendToday: initialDashboardStatsCache.backendToday,
    backendWeek: initialDashboardStatsCache.backendWeek,
    localTodayAtLoad: local.today,
    localWeekAtLoad: local.thisWeek,
  };
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(() => initialStoredUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(() => !initialStoredUser);
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [isLoadingRemarks, setIsLoadingRemarks] = useState(false);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isHomeworkSubmitOpen, setIsHomeworkSubmitOpen] = useState(false);
  const [selectedHomeworkForSubmit, setSelectedHomeworkForSubmit] = useState<any | null>(null);
  const [homeworkSubmissionLink, setHomeworkSubmissionLink] = useState('');
  const [homeworkSubmissionFile, setHomeworkSubmissionFile] = useState<File | null>(null);
  const [homeworkSubmissionDescription, setHomeworkSubmissionDescription] = useState('');
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);
  const [homeworkSubmitError, setHomeworkSubmitError] = useState<string>('');
  const [riskAnalysisReports, setRiskAnalysisReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [studyStreak, setStudyStreak] = useState<{ count: number; message?: string } | null>(null);
  const bootstrapAppliedRef = useRef(false);

  // Preview videos fallback (bootstrap supplies these in the same request)
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (bootstrapAppliedRef.current) return;
      try {
        const videosRes = await fetch(`${API_BASE_URL}/api/student/videos`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          setVideos((videosData.data || videosData).slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
        setVideos([]);
      } finally {
        setIsLoadingContent(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  // Fetch real dashboard data
  const [stats, setStats] = useState({ questionsAnswered: 0, accuracyRate: 0, rank: 0 });
  const [exams, setExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [learningPathContent, setLearningPathContent] = useState<any[]>([]);
  const [isLoadingLearningPathContent, setIsLoadingLearningPathContent] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Save overall progress to database
  const saveOverallProgressToDB = async (progress: number) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/student/overall-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overallProgress: progress
        })
      });

      if (response.ok) {
        console.log('âœ… Overall progress saved to database:', progress);
      } else {
        console.error('Failed to save overall progress to database');
      }
    } catch (error) {
      console.error('Error saving overall progress:', error);
    }
  };
  
  // Load overall progress from database
  const loadOverallProgressFromDB = async () => {
    try {
      const authUser = await fetchAuthUser();
      const u = authUser as { overallProgress?: number } | null;
      if (u && u.overallProgress !== undefined && u.overallProgress !== null) {
        setOverallProgress(u.overallProgress);
      }
    } catch (error) {
      console.error('Error loading overall progress:', error);
    }
  };
  const [allContent, setAllContent] = useState<any[]>([]);

  // Single bootstrap: auth + subjects + content counts + quizzes (replaces 15+ separate calls)
  useEffect(() => {
    let cancelled = false;

    const applyBootstrap = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      const cached = peekCachedAuthUser();
      if (cached && !cancelled) {
        setUser(cached);
        setIsLoadingUser(false);
      }

      try {
        const [authUser, bootstrap] = await Promise.all([
          fetchAuthUser(),
          fetchDashboardBootstrap(),
        ]);
        if (cancelled) return;

        if (authUser) setUser(authUser);
        setIsLoadingUser(false);

        if (!bootstrap) return;

        bootstrapAppliedRef.current = true;

        if (bootstrap.user) {
          setUser(bootstrap.user);
          const op = (bootstrap.user as { overallProgress?: number }).overallProgress;
          if (op !== undefined && op !== null) setOverallProgress(Number(op));
        }

        setSubjects(bootstrap.subjects || []);

        const preview = Array.isArray(bootstrap.previewVideos) ? bootstrap.previewVideos : [];
        if (preview.length) {
          setVideos(preview.slice(0, 3));
        }
        setIsLoadingContent(false);

        const filtered = filterContentsBySchoolProgram(
          bootstrap.contents || [],
          resolveIsAsliPrepExclusive(bootstrap.user),
        );
        setAllContent(filtered);

        if (bootstrap.studyStreak) setStudyStreak(bootstrap.studyStreak);
      } catch (error) {
        console.error('Dashboard bootstrap failed:', error);
        if (!cancelled) setIsLoadingUser(false);
      }
    };

    applyBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const adaptiveVideosList = useMemo(
    () => subjects.flatMap((s: any) => s.videos || []),
    [subjects]
  );
  const assignedHomework = useMemo(() => {
    return allContent
      .filter((content: any) => String(content.type || '').toLowerCase() === 'homework')
      .sort((a: any, b: any) => {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : 0;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : 0;
        return aTime - bTime;
      });
  }, [allContent]);
  const homeworkSubmissionByHomeworkId = useMemo(() => {
    const map = new Map<string, any>();
    homeworkSubmissions.forEach((submission: any) => {
      const homeworkId =
        typeof submission.homeworkId === 'object'
          ? submission.homeworkId?._id
          : submission.homeworkId;
      if (homeworkId) {
        map.set(String(homeworkId), submission);
      }
    });
    return map;
  }, [homeworkSubmissions]);
  const [studyTimeToday, setStudyTimeToday] = useState<number>(() => {
    const cached = initialDashboardStatsCache?.studyTimeToday ?? 0;
    return Math.max(cached, getTodayStudyTime());
  });
  const [studyTimeThisWeek, setStudyTimeThisWeek] = useState<number>(() => {
    const cached = initialDashboardStatsCache?.studyTimeThisWeek ?? 0;
    return Math.max(cached, getWeeklyStudyTime());
  });
  const [weeklyStudyData, setWeeklyStudyData] = useState<{ [key: string]: number }>({}); // Daily study time in minutes
  const sessionTimeBaselineRef = useRef(buildSessionTimeBaselineFromCache());
  const dashboardStatsCacheRef = useRef(initialDashboardStatsCache);
  const [incompleteContent, setIncompleteContent] = useState<any[]>([]);
  const [scheduleAllContent, setScheduleAllContent] = useState<any[]>([]);
  const [videoChapterProgressBySubject, setVideoChapterProgressBySubject] = useState<
    Record<string, ChapterCompletedDates>
  >({});
  const [incompleteQuizzes, setIncompleteQuizzes] = useState<any[]>([]);
  const [scheduleCompletionStats, setScheduleCompletionStats] = useState({
    total: 0,
    completed: 0,
    completionPercent: 0,
    totalContent: 0,
    completedContent: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
  });
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set());

  const dashboardTodoStats = useMemo(() => {
    const liveTotal = incompleteContent.length + incompleteQuizzes.length;
    const liveCompleted =
      incompleteContent.filter((c: any) => completedScheduleIds.has(c._id)).length +
      incompleteQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
    if (liveTotal > 0) {
      return { totalTodos: liveTotal, completedTodos: liveCompleted };
    }
    const cached = dashboardStatsCacheRef.current;
    return {
      totalTodos: cached?.totalTodos ?? 0,
      completedTodos: cached?.completedTodos ?? 0,
    };
  }, [incompleteContent, incompleteQuizzes, completedScheduleIds]);

  useEffect(() => {
    const liveTotal = incompleteContent.length + incompleteQuizzes.length;
    if (liveTotal === 0) return;
    const completedTodos =
      incompleteContent.filter((c: any) => completedScheduleIds.has(c._id)).length +
      incompleteQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
    const patch = { totalTodos: liveTotal, completedTodos };
    writeDashboardStatsCache(patch);
    dashboardStatsCacheRef.current = {
      ...(dashboardStatsCacheRef.current || {
        studyTimeToday: 0,
        studyTimeThisWeek: 0,
        backendToday: 0,
        backendWeek: 0,
      }),
      ...patch,
    };
  }, [incompleteContent, incompleteQuizzes, completedScheduleIds]);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarJumpDate, setCalendarJumpDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const calendarMonthStart = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
  const calendarMonthEnd = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');
  const { data: monthTimetableEntries = [], isLoading: timetableLoading } = useTimetableEntries({
    startDate: calendarMonthStart,
    endDate: calendarMonthEnd,
  });

  const schoolDisplayName = useMemo(
    () => String(user?.assignedAdmin?.schoolName || user?.schoolName || '').trim(),
    [user?.assignedAdmin?.schoolName, user?.schoolName],
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoadingDashboard(false);
          return;
        }

        // Fetch exam results to calculate stats
        const [examsRes, resultsRes, rankingsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exams`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/student/exam-results`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/student/rankings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        let examsData = [];
        if (examsRes.ok) {
          const examsJson = await examsRes.json();
          examsData = examsJson.data || [];
          setExams(examsData);
        }

        let resultsData = [];
        if (resultsRes.ok) {
          const resultsJson = await resultsRes.json();
          resultsData = resultsJson.data || [];
          setExamResults(resultsData);
        }

        let rankingsData = [];
        if (rankingsRes.ok) {
          const rankingsJson = await rankingsRes.json();
          rankingsData = rankingsJson.data || [];
        }

        // Calculate real stats from exam results
        const totalQuestions = resultsData.reduce((sum: number, r: any) => sum + (r.totalQuestions || 0), 0);
        const correctAnswers = resultsData.reduce((sum: number, r: any) => sum + (r.correctAnswers || 0), 0);
        const totalMarks = resultsData.reduce((sum: number, r: any) => sum + (r.totalMarks || 0), 0);
        const obtainedMarks = resultsData.reduce((sum: number, r: any) => sum + (r.obtainedMarks || 0), 0);
        const avgAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const avgScore = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        
        // Get average rank
        const avgRank = rankingsData.length > 0 
          ? Math.round(rankingsData.reduce((sum: number, r: any) => sum + (r.rank || 0), 0) / rankingsData.length)
          : 0;

        // Fetch actual subject names from API FIRST to map exam subject keys to real names
        let subjectNameMap = new Map<string, string>(); // Maps subject keys (maths, physics, etc.) to actual names
        let subjectsList: any[] = [];
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (subjectsResponse.ok) {
              const subjectsData = await subjectsResponse.json();
              subjectsList = subjectsData.subjects || subjectsData.data || [];
              
              // Create a map from subject keys to actual names
              // Map common exam subject keys to actual subject names
              subjectsList.forEach((subject: any) => {
                const subjectName = subject.name || '';
                const subjectNameLower = subjectName.toLowerCase();
                
                // Map common variations
                if (subjectNameLower.includes('math') || subjectNameLower.includes('mathematics')) {
                  subjectNameMap.set('maths', subjectName);
                  subjectNameMap.set('mathematics', subjectName);
                }
                if (subjectNameLower.includes('physics')) {
                  subjectNameMap.set('physics', subjectName);
                }
                if (subjectNameLower.includes('chemistry')) {
                  subjectNameMap.set('chemistry', subjectName);
                }
                
                // Also map by exact name match (case-insensitive)
                subjectNameMap.set(subjectNameLower, subjectName);
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch subjects for name mapping:', error);
        }

        // Calculate subject-wise progress from exam results
        const subjectMap = new Map<string, { total: number; correct: number; exams: number }>();
        
        resultsData.forEach((result: any) => {
          if (result.subjectWiseScore && typeof result.subjectWiseScore === 'object') {
            Object.entries(result.subjectWiseScore).forEach(([subject, score]: [string, any]) => {
              if (!subjectMap.has(subject)) {
                subjectMap.set(subject, { total: 0, correct: 0, exams: 0 });
              }
              const subj = subjectMap.get(subject)!;
              subj.total += score.total || 0;
              subj.correct += score.correct || 0;
              subj.exams += 1;
            });
          }
        });

        // Convert subject map to progress array with actual subject names
        const progressArray = Array.from(subjectMap.entries()).map(([key, data]) => {
          const progress = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
          // Get actual subject name from map, or capitalize the key as fallback
          const actualName = subjectNameMap.get(key.toLowerCase()) || 
                           subjectNameMap.get(key) || 
                           key.charAt(0).toUpperCase() + key.slice(1);
          const colors = [
            'bg-orange-100 text-orange-600',
            'bg-sky-100 text-sky-600',
            'bg-teal-100 text-teal-600',
            'bg-orange-100 text-orange-600',
            'bg-sky-100 text-sky-600'
          ];
          return {
            id: key.toLowerCase(),
            name: actualName,
            progress: progress,
            trend: progress >= 70 ? 'up' as const : progress >= 50 ? 'neutral' as const : 'down' as const,
            currentTopic: `${actualName} - Recent Exams`,
            color: colors[Math.min(subjectMap.size - 1, Math.floor(Math.random() * colors.length))]
          };
        });

        // Fetch subject progress from learning paths (localStorage)
        // Get all subjects assigned to the student
        let learningPathProgress: Map<string, number> = new Map();
        try {
          const token = localStorage.getItem('authToken');
          if (token && subjectsList.length > 0) {
            // Get progress for each subject from localStorage and content count
            for (const subject of subjectsList) {
              const subjectId = subject._id || subject.id;
              try {
                const stored = localStorage.getItem(`completed_content_${subjectId}`);
                if (stored) {
                  const completedIds = JSON.parse(stored);
                  
                  // Use contentCount from bootstrap/subjects API (avoids N per-subject fetches)
                  try {
                    const totalContent =
                      Number(subject.contentCount) > 0
                        ? Number(subject.contentCount)
                        : 0;

                    if (totalContent > 0) {
                      const progress = Math.round((completedIds.length / totalContent) * 100);
                      learningPathProgress.set(subjectId, progress);
                    } else if (completedIds.length > 0) {
                      learningPathProgress.set(subjectId, 0);
                    }
                  } catch (contentError) {
                    console.error('Error fetching content for subject:', subjectId, contentError);
                    // Fallback: use completed count as rough estimate
                    if (completedIds.length > 0) {
                      const progress = Math.min(100, (completedIds.length * 10));
                      learningPathProgress.set(subjectId, progress);
                    }
                  }
                }
              } catch (e) {
                console.error('Error reading progress for subject:', subjectId, e);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch learning path progress:', error);
        }

        // Merge exam progress with learning path progress
        // If a subject has both, take the average or use the higher value
        const mergedProgress = new Map<string, { progress: number; name: string; color: string; currentTopic: string }>();
        
        // Add exam-based progress
        progressArray.forEach(subj => {
          mergedProgress.set(subj.id, {
            progress: subj.progress,
            name: subj.name,
            color: subj.color,
            currentTopic: subj.currentTopic
          });
        });

        // Merge with learning path progress
        learningPathProgress.forEach((progress, subjectId) => {
          // Find the subject name from the subjects list
          const subject = subjectsList.find(s => (s._id || s.id) === subjectId);
          const subjectName = subject?.name || 'Subject';
          
          // Try to match by subject ID or find existing entry
          let existing = null;
          // Check if this subject matches any exam-based subject by name
          Array.from(mergedProgress.entries()).forEach(([key, value]) => {
            if (value.name === subjectName) {
              existing = value;
              // Update the existing entry with averaged progress
              mergedProgress.set(key, {
                ...value,
                progress: Math.round((value.progress + progress) / 2)
              });
            }
          });
          
          // If we found a match, skip adding new entry
          if (existing) {
            return;
          }
          
          // If no match found, add as new entry
          if (!existing) {
            const colors = [
              'bg-orange-100 text-orange-600',
              'bg-green-100 text-green-600',
              'bg-orange-100 text-orange-600',
              'bg-orange-100 text-orange-600',
              'bg-orange-100 text-orange-600'
            ];
            // Use subject ID as key, but display actual name
            mergedProgress.set(subjectId, {
              progress: progress,
              name: subjectName,
              color: colors[Math.floor(Math.random() * colors.length)],
              currentTopic: `${subjectName} - Learning Path`
            });
          }
        });

        // Convert to array (include id from map key for React keys)
        const finalProgressArray = Array.from(mergedProgress.entries()).map(([id, value]) => ({ ...value, id }));

        // Calculate overall progress as average of all subject progress
        const calculatedOverallProgress = finalProgressArray.length > 0
          ? Math.round(finalProgressArray.reduce((sum, s) => sum + s.progress, 0) / finalProgressArray.length)
          : 0;

        // If no subject progress from exams, set default empty
        if (finalProgressArray.length === 0) {
          setSubjectProgress([]);
          // Try to load saved overall progress from database
          loadOverallProgressFromDB();
        } else {
          setSubjectProgress(finalProgressArray);
          setOverallProgress(calculatedOverallProgress);
          
          // Save overall progress to database
          saveOverallProgressToDB(calculatedOverallProgress);
        }

        // Set calculated stats
        setStats({
          questionsAnswered: totalQuestions,
          accuracyRate: Math.round(avgAccuracy),
          rank: avgRank || 0
        });

        // Fetch learning path content for all subjects
        setIsLoadingLearningPathContent(true);
        try {
          const allContent: any[] = [];
          
          // Fetch content for each subject
          for (const subject of subjectsList) {
            const subjectId = subject._id || subject.id;
            try {
              const contentResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                const contents = contentData.data || contentData || [];
                
                // Add subject info to each content item
                contents.forEach((content: any) => {
                  allContent.push({
                    ...content,
                    subjectName: subject.name,
                    subjectId: subjectId
                  });
                });
              }
            } catch (contentError) {
              console.error('Error fetching content for subject:', subjectId, contentError);
            }
          }
          
          // Sort by upload date (newest first)
          allContent.sort((a, b) => {
            const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
            const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
            return dateB - dateA;
          });
          
          setLearningPathContent(allContent);
        } catch (error) {
          console.error('Failed to fetch learning path content:', error);
          setLearningPathContent([]);
        } finally {
          setIsLoadingLearningPathContent(false);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch library content for homework/todos (fallback if bootstrap missed)
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (bootstrapAppliedRef.current) return;
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const fetchedContent = data.data || data || [];

        const homeworkResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Homework`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        let homeworkContent: any[] = [];
        if (homeworkResponse.ok) {
          const homeworkData = await homeworkResponse.json();
          homeworkContent = homeworkData.data || homeworkData || [];
        }

        const contentMap = new Map();
        fetchedContent.forEach((content: any) => {
          contentMap.set(content._id || content.id, content);
        });
        homeworkContent.forEach((content: any) => {
          if (!contentMap.has(content._id || content.id)) {
            contentMap.set(content._id || content.id, content);
          }
        });

        setAllContent(
          filterContentsBySchoolProgram(
            Array.from(contentMap.values()),
            resolveIsAsliPrepExclusive(user),
          ),
        );
      } catch (error) {
        console.error('Failed to fetch library content:', error);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [user?.isAsliPrepExclusive, user?.assignedAdmin?.isAsliPrepExclusive]);

  // Track study time using timestamp module (ignores background time)
  useEffect(() => {
    let cancelled = false;
    let trackingStarted = false;
    let displayInterval: ReturnType<typeof setInterval> | undefined;
    let saveSessionInterval: ReturnType<typeof setInterval> | undefined;

    const getDisplayedStudyTime = () => {
      const times = updateStudyTime();
      return mergeDisplayedStudyTime(sessionTimeBaselineRef.current, times);
    };

    const persistStudyTimeCache = () => {
      const { today, thisWeek } = getDisplayedStudyTime();
      const baseline = sessionTimeBaselineRef.current;
      writeDashboardStatsCache({
        studyTimeToday: today,
        studyTimeThisWeek: thisWeek,
        backendToday: baseline.useBackend ? baseline.backendToday : today,
        backendWeek: baseline.useBackend ? baseline.backendWeek : thisWeek,
      });
      dashboardStatsCacheRef.current = {
        ...(dashboardStatsCacheRef.current || {
          totalTodos: 0,
          completedTodos: 0,
          backendToday: 0,
          backendWeek: 0,
        }),
        studyTimeToday: today,
        studyTimeThisWeek: thisWeek,
        backendToday: baseline.useBackend ? baseline.backendToday : today,
        backendWeek: baseline.useBackend ? baseline.backendWeek : thisWeek,
      };
    };

    const applyStudyTimeFromTracker = () => {
      if (cancelled) return;
      const { today, thisWeek } = getDisplayedStudyTime();
      setStudyTimeToday(today);
      setStudyTimeThisWeek(thisWeek);
      if (!sessionTimeBaselineRef.current.useBackend) {
        setWeeklyStudyData(getWeeklyStudyData());
      }
    };

    const startTracking = () => {
      if (trackingStarted || cancelled) return;
      trackingStarted = true;
      startSession();
      applyStudyTimeFromTracker();
      persistStudyTimeCache();

      saveSessionInterval = setInterval(async () => {
        try {
          const { today } = getDisplayedStudyTime();
          const dateKey = getLocalIsoDateKey();
          const token = localStorage.getItem('authToken');
          if (token && today > 0) {
            await fetch(`${API_BASE_URL}/api/student/session-time`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                date: dateKey,
                totalMinutes: today,
              }),
            }).catch((err) => console.error('Failed to save session time:', err));
          }
        } catch (error) {
          console.error('Error saving session time:', error);
        }
      }, 5 * 60 * 1000);

      displayInterval = setInterval(() => {
        try {
          applyStudyTimeFromTracker();
        } catch (error) {
          console.error('Error updating study time:', error);
        }
      }, 1000);
    };

    const refreshSessionTime = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/student/session-time`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const localAtLoad = updateStudyTime();
              const localTodayKey = getLocalIsoDateKey();
              const weekly = data.data.weeklyData || {};
              const todayFromWeekly = Number(weekly[localTodayKey]) || 0;
              const backendToday = Math.max(
                Number(data.data.today) || 0,
                todayFromWeekly,
              );
              sessionTimeBaselineRef.current = {
                useBackend: true,
                backendToday,
                backendWeek: data.data.thisWeek || 0,
                localTodayAtLoad: localAtLoad.today,
                localWeekAtLoad: localAtLoad.thisWeek,
              };

              if (data.data.weeklyData) {
                const convertedWeeklyData: { [key: string]: number } = {};
                Object.keys(data.data.weeklyData).forEach((dateKey) => {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  const date = new Date(y, m - 1, d);
                  convertedWeeklyData[date.toDateString()] = data.data.weeklyData[dateKey];
                });
                if (!cancelled) setWeeklyStudyData(convertedWeeklyData);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch session time from backend:', error);
      }

      if (!sessionTimeBaselineRef.current.useBackend) {
        sessionTimeBaselineRef.current = {
          useBackend: false,
          backendToday: 0,
          backendWeek: 0,
          localTodayAtLoad: 0,
          localWeekAtLoad: 0,
        };
      }

      if (!cancelled) {
        startTracking();
        applyStudyTimeFromTracker();
        persistStudyTimeCache();
      }
    };

    if (sessionTimeBaselineRef.current.useBackend) {
      startTracking();
    }
    void refreshSessionTime();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endSession();
      } else {
        startSession();
      }
      applyStudyTimeFromTracker();
    };

    const handleFocus = () => {
      if (!document.hidden) {
        startSession();
        applyStudyTimeFromTracker();
      }
    };

    const handleBlur = () => {
      endSession();
      applyStudyTimeFromTracker();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (displayInterval) clearInterval(displayInterval);
      if (saveSessionInterval) clearInterval(saveSessionInterval);
      endSession(); // End session when component unmounts
      
      // Save final session time before unmounting
      const finalTimes = trackingStarted ? getDisplayedStudyTime() : updateStudyTime();
      const dateKey = getLocalIsoDateKey();
      const token = localStorage.getItem('authToken');
      if (token && finalTimes.today > 0) {
        fetch(`${API_BASE_URL}/api/student/session-time`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: dateKey,
            totalMinutes: finalTimes.today,
          }),
        }).catch(err => console.error('Failed to save final session time:', err));
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  // Fetch incomplete content and quizzes for To-Dos
  useEffect(() => {
    const fetchScheduleItems = async () => {
      try {
        setIsLoadingSchedule(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsLoadingSchedule(false);
          return;
        }

        // Fetch all content
        const contentResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        // Fetch all quizzes
        const quizzesResponse = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        let allContent: any[] = [];
        let allQuizzes: any[] = [];

        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          const rawContent = contentData.data || contentData || [];
          
          // Process content to ensure fileUrl is properly formatted
          allContent = rawContent.map((content: any) => {
            // Ensure fileUrl is a full URL if it's a relative path
            if (content.fileUrl) {
              let fileUrl = content.fileUrl;
              // If it's not already a full URL (http/https), construct it
              if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
                if (fileUrl.startsWith('/')) {
                  fileUrl = `${API_BASE_URL}${fileUrl}`;
                } else {
                  fileUrl = `${API_BASE_URL}/${fileUrl}`;
                }
              }
              return { ...content, fileUrl };
            }
            return content;
          });
        }

        if (quizzesResponse.ok) {
          const quizzesData = await quizzesResponse.json();
          allQuizzes = quizzesData.data || quizzesData || [];
        }

        let chapterProgressBySubject: Record<string, ChapterCompletedDates> = {};
        try {
          const progressRes = await fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (progressRes.ok) {
            const progressJson = await progressRes.json();
            if (progressJson.success && progressJson.data) {
              chapterProgressBySubject = progressJson.data;
            }
          }
        } catch {
          // use local progress only
        }

        setVideoChapterProgressBySubject(chapterProgressBySubject);

        const programFiltered = filterContentsBySchoolProgram(
          allContent,
          resolveIsAsliPrepExclusive(user)
        );
        setScheduleAllContent(programFiltered);

        const completedContentIds = collectCompletedContentIds();
        const completionStats = buildScheduleCompletionStats(programFiltered, allQuizzes);
        setScheduleCompletionStats(completionStats);

        // Non-video: Today's Tasks completion only. Video: chapter progress uses full completion set.
        const slicedContent = buildTodaysTasksContentList(
          programFiltered,
          completedContentIds,
          chapterProgressBySubject,
          {
            nonVideoCompletedIds: collectScheduleCompletedIdsOnly(),
            includeHomework: true,
          }
        );

        // Filter incomplete quizzes (not attempted or not completed)
        const incompleteQuiz = allQuizzes.filter((quiz: any) => {
          return !quiz.hasAttempted || !quiz.completedAt;
        });

        incompleteQuiz.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        const slicedQuizzes = incompleteQuiz.slice(0, 10);
        setIncompleteContent(slicedContent);
        setIncompleteQuizzes(slicedQuizzes);

        const completedTodos =
          slicedContent.filter((c: any) => completedScheduleIds.has(c._id)).length +
          slicedQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
        const totalTodos = slicedContent.length + slicedQuizzes.length;
        const todoPatch = { totalTodos, completedTodos };
        writeDashboardStatsCache(todoPatch);
        dashboardStatsCacheRef.current = {
          ...(dashboardStatsCacheRef.current || {
            studyTimeToday: 0,
            studyTimeThisWeek: 0,
            backendToday: 0,
            backendWeek: 0,
          }),
          ...todoPatch,
        };
      } catch (error) {
        console.error('Failed to fetch schedule items:', error);
        setIncompleteContent([]);
        setIncompleteQuizzes([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchScheduleItems();
  }, [user?.isAsliPrepExclusive, user?.assignedAdmin?.isAsliPrepExclusive, user?._id]);

  // When library content loads, refresh Today's Tasks so non-video types appear
  useEffect(() => {
    if (!user) return;
    const raw = allContent.length > 0 ? allContent : scheduleAllContent;
    if (!raw.length) return;

    const programFiltered = filterContentsBySchoolProgram(
      raw,
      resolveIsAsliPrepExclusive(user)
    );
    setScheduleAllContent(programFiltered);

    const videoCompletedIds = collectCompletedContentIds();
    setIncompleteContent(
      buildTodaysTasksContentList(programFiltered, videoCompletedIds, videoChapterProgressBySubject, {
        nonVideoCompletedIds: collectScheduleCompletedIdsOnly(),
        includeHomework: true,
      })
    );
  }, [allContent, user, videoChapterProgressBySubject, completedScheduleIds]);

  // Load completed schedule items from localStorage (only for today)
  useEffect(() => {
    const loadCompletedSchedule = () => {
      const TODAY_KEY = new Date().toDateString();
      const stored = localStorage.getItem('completed_schedule_items');
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          // Check if data structure includes dates (new format) or is just an array (old format)
          if (data.date && data.completedIds) {
            // New format with dates
            if (data.date === TODAY_KEY) {
              // Same day, use the completed IDs
              setCompletedScheduleIds(new Set(data.completedIds));
            } else {
              // Different day, clear the data
              localStorage.setItem('completed_schedule_items', JSON.stringify({
                date: TODAY_KEY,
                completedIds: []
              }));
              setCompletedScheduleIds(new Set());
            }
          } else if (Array.isArray(data)) {
            // Old format (just array), migrate to new format
            localStorage.setItem('completed_schedule_items', JSON.stringify({
              date: TODAY_KEY,
              completedIds: []
            }));
            setCompletedScheduleIds(new Set());
          } else {
            setCompletedScheduleIds(new Set());
          }
        } catch (e) {
          setCompletedScheduleIds(new Set());
        }
      } else {
        // Initialize with today's date
        localStorage.setItem('completed_schedule_items', JSON.stringify({
          date: TODAY_KEY,
          completedIds: []
        }));
        setCompletedScheduleIds(new Set());
      }
    };
    
    loadCompletedSchedule();
    
    // Check for date changes periodically (every minute)
    const dateCheckInterval = setInterval(() => {
      const TODAY_KEY = new Date().toDateString();
      const stored = localStorage.getItem('completed_schedule_items');
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.date && data.date !== TODAY_KEY) {
            // Date changed, clear completed items
            localStorage.setItem('completed_schedule_items', JSON.stringify({
              date: TODAY_KEY,
              completedIds: []
            }));
            setCompletedScheduleIds(new Set());
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(dateCheckInterval);
  }, []);

  const persistVideoChapterProgress = async (
    subjectId: string,
    dates: ChapterCompletedDates
  ) => {
    const token = localStorage.getItem('authToken');
    if (!token || !subjectId) return;
    try {
      await fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subjectId, chapterCompletedAt: dates }),
      });
    } catch (err) {
      console.error('Failed to save video chapter progress:', err);
    }
  };

  const rebuildIncompleteSchedule = (
    allContent: any[],
    videoCompletedIds: Set<string>,
    chapterProgress: Record<string, ChapterCompletedDates>
  ) =>
    buildTodaysTasksContentList(allContent, videoCompletedIds, chapterProgress, {
      nonVideoCompletedIds: collectScheduleCompletedIdsOnly(),
      includeHomework: true,
    });

  // Handle completion toggle (mark done / undo)
  const handleToggleScheduleComplete = (item: any, isQuiz: boolean = false) => {
    const TODAY_KEY = new Date().toDateString();
    const itemId = String(item._id || item.id);
    const newCompleted = new Set(completedScheduleIds);
    const isCurrentlyCompleted = newCompleted.has(itemId);

    if (isCurrentlyCompleted) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }

    setCompletedScheduleIds(newCompleted);

    // Save to localStorage with today's date
    localStorage.setItem(
      'completed_schedule_items',
      JSON.stringify({
        date: TODAY_KEY,
        completedIds: Array.from(newCompleted),
      })
    );

    const subjectId = !isQuiz ? getContentSubjectId(item) : '';

    // If it's content, keep subject progress storage in sync as well.
    if (!isQuiz && subjectId) {
      const subjectKey = `completed_content_${subjectId}`;
      const stored = localStorage.getItem(subjectKey);
      let completed = stored ? JSON.parse(stored) : [];

      if (isCurrentlyCompleted) {
        completed = completed.filter((id: string) => String(id) !== itemId);
        localStorage.setItem(subjectKey, JSON.stringify(completed));
      } else if (!completed.includes(itemId)) {
        completed.push(itemId);
        localStorage.setItem(subjectKey, JSON.stringify(completed));
      }
    }

    if (!isQuiz && isVideoContentType(item.type)) {
      const token = localStorage.getItem('authToken');
      if (token) {
        fetch(`${API_BASE_URL}/api/student/content-progress`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentId: itemId,
            completed: !isCurrentlyCompleted,
            progress: !isCurrentlyCompleted ? 100 : 0,
          }),
        }).catch((err) => console.error('content-progress save failed:', err));
      }
    }

    const mergedCompleted = new Set(collectCompletedContentIds());
    newCompleted.forEach((id) => mergedCompleted.add(id));

    let chapterProgressForRebuild = videoChapterProgressBySubject;
    if (!isQuiz && item.type === 'Video' && subjectId && scheduleAllContent.length > 0 && !isCurrentlyCompleted) {
      const currentDates = videoChapterProgressBySubject[subjectId] || {};
      const updatedDates = nextChapterCompletedDates(
        subjectId,
        scheduleAllContent,
        mergedCompleted,
        currentDates
      );
      if (updatedDates) {
        chapterProgressForRebuild = {
          ...videoChapterProgressBySubject,
          [subjectId]: updatedDates,
        };
        setVideoChapterProgressBySubject(chapterProgressForRebuild);
        void persistVideoChapterProgress(subjectId, updatedDates);
      }
    }

    if (scheduleAllContent.length > 0) {
      const mergedCompletedForList = new Set(collectCompletedContentIds());
      newCompleted.forEach((id) => mergedCompletedForList.add(id));
      setIncompleteContent(
        rebuildIncompleteSchedule(
          scheduleAllContent,
          mergedCompletedForList,
          chapterProgressForRebuild
        )
      );
    }

    // Close preview
    setIsPreviewOpen(false);
    setSelectedScheduleItem(null);
  };

  // Handle opening preview
  const handleOpenPreview = (item: any, isQuiz: boolean = false) => {
    setSelectedScheduleItem({ ...item, isQuiz });
    setIsPreviewOpen(true);
  };

  const handleOpenHomeworkSubmit = (homework: any) => {
    const homeworkId = String(homework?._id || homework?.id || '');
    const existingSubmission = homeworkSubmissionByHomeworkId.get(homeworkId);
    setSelectedHomeworkForSubmit(homework);
    setHomeworkSubmissionLink(existingSubmission?.submissionLink || '');
    setHomeworkSubmissionFile(null);
    setHomeworkSubmissionDescription(existingSubmission?.description || '');
    setHomeworkSubmitError('');
    setIsHomeworkSubmitOpen(true);
  };

  const handleSubmitHomeworkFromDashboard = async () => {
    if (!selectedHomeworkForSubmit) return;
    if (!homeworkSubmissionFile) {
      setHomeworkSubmitError('Please upload a submission file.');
      return;
    }

    try {
      setIsSubmittingHomework(true);
      setHomeworkSubmitError('');
      const token = localStorage.getItem('authToken');
      if (!token) {
        setHomeworkSubmitError('Please login again and retry.');
        return;
      }

      const formData = new FormData();
      formData.append('file', homeworkSubmissionFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData?.url) {
        setHomeworkSubmitError(uploadData?.message || 'Failed to upload file.');
        return;
      }
      const submissionLinkToSave = uploadData.url;

      const response = await fetch(`${API_BASE_URL}/api/student/homework-submission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeworkId: selectedHomeworkForSubmit._id || selectedHomeworkForSubmit.id,
          submissionLink: submissionLinkToSave,
          description: homeworkSubmissionDescription.trim()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        setHomeworkSubmitError(data?.message || 'Failed to submit homework.');
        return;
      }

      const savedSubmission = data.data;
      setHomeworkSubmissionLink(savedSubmission?.submissionLink || submissionLinkToSave);
      setHomeworkSubmissionFile(null);
      setHomeworkSubmissions((prev) => {
        const savedHomeworkId =
          typeof savedSubmission?.homeworkId === 'object'
            ? savedSubmission.homeworkId?._id
            : savedSubmission?.homeworkId;
        const savedHomeworkIdStr = String(savedHomeworkId || '');
        const next = prev.filter((submission: any) => {
          const currentId =
            typeof submission.homeworkId === 'object'
              ? submission.homeworkId?._id
              : submission.homeworkId;
          return String(currentId || '') !== savedHomeworkIdStr;
        });
        return [savedSubmission, ...next];
      });

      setIsHomeworkSubmitOpen(false);
      setSelectedHomeworkForSubmit(null);
    } catch (error) {
      console.error('Homework submit failed:', error);
      setHomeworkSubmitError('An unexpected error occurred while submitting.');
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  // Helper function for content type label (used in modal)
  const getContentTypeLabel = (type: string) => {
    if (type === 'Video') return 'Watch';
    if (type === 'TextBook' || type === 'Workbook') return 'Read';
    if (type === 'Material') return 'Review';
    return 'Complete';
  };

  // Helper function for priority color (used in modal)
  const getPriorityColor = (difficulty?: string) => {
    if (difficulty === 'Hard' || difficulty === 'Expert') return 'bg-red-100 text-red-700';
    if (difficulty === 'Medium') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Helper function for subject name (used in modal)
  const getSubjectName = (contentItem: any): string => {
    if (typeof contentItem.subjectId === 'object' && contentItem.subjectId?.name) {
      return contentItem.subjectId.name;
    }
    if (typeof contentItem.subject === 'string') {
      return contentItem.subject;
    }
    if (typeof contentItem.subject === 'object' && contentItem.subject?.name) {
      return contentItem.subject.name;
    }
    return 'Unknown Subject';
  };

  const extractDirectFileUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname.includes('docs.google.com') && parsed.pathname.includes('/gview')) {
        const target = parsed.searchParams.get('url');
        if (target) return target;
      }
    } catch {
      return rawUrl;
    }
    return rawUrl;
  };

  // Fetch student remarks
  useEffect(() => {
    const fetchRemarks = async () => {
      try {
        setIsLoadingRemarks(true);
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/remarks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRemarks(data.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch remarks:', error);
      } finally {
        setIsLoadingRemarks(false);
      }
    };

    fetchRemarks();

    // Fetch homework submissions
    const fetchHomeworkSubmissions = async () => {
      try {
        setIsLoadingSubmissions(true);
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/homework-submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setHomeworkSubmissions(data.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch homework submissions:', error);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    fetchHomeworkSubmissions();

    // Fetch risk analysis reports
    const fetchRiskAnalysisReports = async () => {
      try {
        setIsLoadingReports(true);
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/risk-analysis-reports`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRiskAnalysisReports(data.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch risk analysis reports:', error);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchRiskAnalysisReports();
  }, []);

  const handleWatchVideo = (video: any) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Dashboard data is now handled by other queries (userData, contentData)
  // Removed problematic mock query that was causing 404 errors

  // Memoize sliced arrays to avoid recalculating on every render
  // IMPORTANT: All hooks must be called before any early returns
  const availableTests = useMemo(() => {
    return exams.slice(0, 2); // Show first 2 exams as available tests
  }, [exams]);

  const topIncompleteContent = useMemo(() => {
    return incompleteContent.slice(0, 10);
  }, [incompleteContent]);

  const topIncompleteQuizzes = useMemo(() => {
    return incompleteQuizzes.slice(0, 10);
  }, [incompleteQuizzes]);

  const [selectedTopicSubject, setSelectedTopicSubject] = useState<string>('');

  const topicWiseProgress = useMemo(() => {
    if (!learningPathContent.length) return [];

    const groupedBySubject = new Map<string, any[]>();
    learningPathContent.forEach((item: any) => {
      const subjectId = String(item.subjectId || item.subject?._id || item.subject?.id || item.subjectName || 'general');
      if (!groupedBySubject.has(subjectId)) groupedBySubject.set(subjectId, []);
      groupedBySubject.get(subjectId)!.push(item);
    });

    const progressMap = new Map(
      subjectProgress.map((s: any) => [String(s.id || s.name), s])
    );

    return Array.from(groupedBySubject.entries()).map(([subjectId, items]) => {
      const subjectName = items[0]?.subjectName || items[0]?.subject?.name || 'Subject';
      const completedKey = `completed_content_${subjectId}`;
      let completedIds: string[] = [];
      try {
        completedIds = JSON.parse(localStorage.getItem(completedKey) || '[]');
      } catch {
        completedIds = [];
      }
      const completedSet = new Set(completedIds.map(String));

      const chapters = new Map<string, any[]>();
      items.forEach((item: any) => {
        const chapterName =
          item.chapterName ||
          item.chapter ||
          item.unitName ||
          item.unit ||
          item.module ||
          'General';
        if (!chapters.has(chapterName)) chapters.set(chapterName, []);
        chapters.get(chapterName)!.push(item);
      });

      const chapterList = Array.from(chapters.entries()).map(([chapterName, chapterItems], index) => {
        const topics = chapterItems.map((topic: any) => {
          const topicId = String(topic._id || topic.id || `${subjectId}-${chapterName}-${topic.title || topic.topicName || index}`);
          const topicTitle = topic.topicName || topic.topic || topic.title || 'Untitled Topic';
          const isCompleted = completedSet.has(topicId);
          const topicProgress = isCompleted ? 100 : Math.max(0, Math.min(95, Number(topic.progress || topic.completionPercentage || 0)));
          const status = isCompleted ? 'completed' : topicProgress > 0 ? 'in_progress' : 'pending';
          return { id: topicId, title: topicTitle, progress: topicProgress, status, raw: topic };
        });

        const completedTopics = topics.filter(t => t.status === 'completed').length;
        const chapterProgress = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;
        return {
          id: `${subjectId}-${chapterName}`,
          chapterName,
          order: index + 1,
          topics,
          completedTopics,
          totalTopics: topics.length,
          progress: chapterProgress
        };
      });

      const totalTopics = chapterList.reduce((sum, c) => sum + c.totalTopics, 0);
      const totalCompleted = chapterList.reduce((sum, c) => sum + c.completedTopics, 0);
      const overallProgress = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;
      const mapped = progressMap.get(subjectId) || progressMap.get(subjectName);

      return {
        subjectId,
        subjectName,
        subjectProgress: mapped?.progress ?? overallProgress,
        chapters: chapterList
      };
    });
  }, [learningPathContent, subjectProgress]);

  useEffect(() => {
    if (!topicWiseProgress.length) return;
    const exists = topicWiseProgress.some((s: any) => s.subjectId === selectedTopicSubject);
    if (!selectedTopicSubject || !exists) {
      setSelectedTopicSubject(topicWiseProgress[0].subjectId);
    }
  }, [topicWiseProgress, selectedTopicSubject]);

  const getTaskTimeLabel = (item: any, isQuiz: boolean) => {
    const candidate =
      item?.startTime ||
      item?.scheduledTime ||
      item?.startDate ||
      item?.deadline ||
      item?.dueDate ||
      item?.scheduledDate;
    if (candidate) {
      const dt = new Date(candidate);
      if (!Number.isNaN(dt.getTime())) {
        const itemDay = formatDateKey(dt);
        const todayDay = formatDateKey(new Date());
        if (itemDay !== todayDay) {
          return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    }
    if (isQuiz && item?.duration) return `${item.duration} min`;
    return 'Anytime';
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleJumpToDate = () => {
    if (!calendarJumpDate) return;
    const [yearStr, monthStr, dayStr] = calendarJumpDate.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return;

    const targetDate = new Date(year, month - 1, day);
    setSelectedCalendarDate(targetDate);
    setCalendarMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
  };

  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const calendarEntries = useMemo(() => {
    const contentEntries = incompleteContent
      .map((content: any) => {
        const date =
          parseDate(content.deadline) ||
          parseDate(content.dueDate) ||
          parseDate(content.scheduledDate) ||
          parseDate(content.publishDate);
        if (!date) return null;
        return {
          id: content._id || content.id,
          type: 'content' as const,
          title: content.title || 'Study Content',
          subject: getSubjectName(content),
          date,
          source: content,
        };
      })
      .filter(Boolean) as any[];

    const quizEntries = incompleteQuizzes
      .map((quiz: any) => {
        const date =
          parseDate(quiz.startDate) ||
          parseDate(quiz.scheduledDate) ||
          parseDate(quiz.deadline);
        if (!date) return null;
        return {
          id: quiz._id || quiz.id,
          type: 'quiz' as const,
          title: quiz.title || 'Quiz',
          subject:
            typeof quiz.subject === 'string'
              ? quiz.subject
              : quiz.subject?.name || 'General',
          date,
          source: quiz,
        };
      })
      .filter(Boolean) as any[];

    const examEntries = buildExamCalendarEntries(exams);
    const timetableCalendarEntries = buildTimetableCalendarEntries(monthTimetableEntries);

    return [...contentEntries, ...quizEntries, ...examEntries, ...timetableCalendarEntries];
  }, [incompleteContent, incompleteQuizzes, exams, getSubjectName, monthTimetableEntries]);

  const entriesByDate = useMemo(() => {
    return calendarEntries.reduce((acc: Record<string, any[]>, entry: any) => {
      const key = formatDateKey(entry.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
  }, [calendarEntries]);

  const selectedDateEntries = useMemo(() => {
    const key = formatDateKey(selectedCalendarDate);
    const entries = (entriesByDate[key] || []).filter((e: { type?: string }) => e.type !== 'timetable');
    return [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedCalendarDate, entriesByDate]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7; // Monday-first
    const cells: (Date | null)[] = [];

    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    return cells;
  }, [calendarMonth]);

  useEffect(() => {
    setCalendarJumpDate(formatDateKey(selectedCalendarDate));
  }, [selectedCalendarDate]);

  if (isLoadingUser) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-sky-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing your dashboard</p>
          </div>
        </div>
      </>
    );
  }

  const recommendedVideos = [];

  return (
    <>
      <Navigation />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-responsive pb-responsive bg-sky-50 min-h-screen relative">
        {/* Interactive Background */}
        <div className="fixed inset-0 z-0 bg-sky-50">
          {/* Interactive Background - Disabled for better performance */}
          {/* <InteractiveBackground />
          <FloatingParticles /> */}
        </div>
        
        {/* Welcome Section */}
        <div className="mt-6 sm:mt-8 mb-6 relative z-10">
        {studyStreak && studyStreak.count > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
            <Flame className="h-5 w-5 shrink-0 text-orange-500" aria-hidden />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-orange-700">{studyStreak.count}-day study streak!</p>
              <p className="text-xs text-orange-600">{studyStreak.message || 'Keep it up!'}</p>
            </div>
          </div>
        )}
        <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-teal-400 rounded-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex flex-row items-center justify-between gap-3 sm:gap-4">
              {/* Left side - Text content */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl lg:text-3xl font-bold mb-1 sm:mb-2 leading-tight">
                  Welcome back, {user?.email?.split('@')[0] || user?.fullName?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-white/90 mb-2 sm:mb-4 text-[11px] sm:text-sm leading-snug line-clamp-3 sm:line-clamp-none">
                  Ready to continue your {user?.educationStream || 'JEE'} preparation journey? Your Vidya AI has personalized recommendations waiting.
                </p>
                
                <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
                  <Button 
                    className="bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold text-[11px] sm:text-sm py-1.5 sm:py-2 px-2.5 sm:px-4 h-auto whitespace-nowrap"
                    onClick={() => setLocation('/learning-paths')}
                  >
                    Continue Learning
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 text-[11px] sm:text-sm py-1.5 sm:py-2 px-2.5 sm:px-4 h-auto whitespace-nowrap"
                    onClick={() => setLocation('/ai-tutor')}
                  >
                    Ask Vidya AI
                  </Button>
                </div>
              </div>
              
              {/* Right side - Vidya image (same row as desktop) */}
              <div className="flex-shrink-0">
                <div className="w-[4.5rem] h-[3.25rem] sm:w-40 sm:h-28 lg:w-44 lg:h-32 relative">
                  <div className="absolute inset-0 bg-white/15 rounded-xl sm:rounded-2xl backdrop-blur-sm p-1 sm:p-1.5 border border-white/30 shadow-lg">
                    <img 
                      src="/Vidya-ai.jpg" 
                      alt="Vidya AI" 
                      draggable={false}
                      className="w-full h-full object-cover object-center rounded-lg sm:rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="mb-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Progress */}
            <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-lg hover:shadow-md transition-all duration-200 h-full">
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full relative">
                <div className="absolute top-3 sm:p-4 lg:p-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/90 mb-4 pr-12">Today's Progress</p>
                {(() => {
                  const { totalTodos, completedTodos } = dashboardTodoStats;
                  const percentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
                  return (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">{completedTodos}/{totalTodos}</p>
                      <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
                        <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <p className="text-xs text-white/80 mt-auto">Tasks completed {percentage}%</p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Study Time */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-lg hover:shadow-md transition-all duration-200 h-full">
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full relative">
                <div className="absolute top-3 sm:p-4 lg:p-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/90 mb-4 pr-12">Study Time</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight transition-all duration-300">
                  {studyTimeToday >= 60 
                    ? `${(studyTimeToday / 60).toFixed(1)} hrs` 
                    : studyTimeToday < 1 && studyTimeToday > 0
                    ? '<1m'
                    : `${Math.round(studyTimeToday)}m`}
                </p>
                <p className="text-xs text-white/80 mt-auto">Logged in today</p>
              </CardContent>
            </Card>

            {/* This Week */}
            <Card className="bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-lg hover:shadow-md transition-all duration-200 h-full">
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full relative">
                <div className="absolute top-3 sm:p-4 lg:p-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/90 mb-4 pr-12">This Week</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight transition-all duration-300">
                  {studyTimeThisWeek >= 60 
                    ? `${(studyTimeThisWeek / 60).toFixed(1)} hrs` 
                    : studyTimeThisWeek < 1 && studyTimeThisWeek > 0
                    ? '<1m'
                    : `${Math.round(studyTimeThisWeek)}m`}
                </p>
                <p className="text-xs text-white/80 mt-auto">Study time this week</p>
              </CardContent>
            </Card>

            {/* Efficiency */}
            <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-lg hover:shadow-md transition-all duration-200 h-full">
              <CardContent className="p-3 sm:p-4 lg:p-6 flex flex-col h-full relative">
                <div className="absolute top-3 sm:p-4 lg:p-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/90 mb-4 pr-12">Efficiency</p>
                {(() => {
                  const { totalTodos, completedTodos } = dashboardTodoStats;
                  const efficiency =
                    totalTodos > 0
                      ? Math.round((completedTodos / totalTodos) * 100)
                      : scheduleCompletionStats.total > 0
                        ? scheduleCompletionStats.completionPercent
                        : overallProgress > 0
                          ? Math.round(overallProgress)
                          : 0;
                  const completedLabel =
                    totalTodos > 0
                      ? `${completedTodos}/${totalTodos} tasks done`
                      : scheduleCompletionStats.total > 0
                        ? `${scheduleCompletionStats.completed}/${scheduleCompletionStats.total} items done`
                        : 'Content & quizzes';
                  return (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{efficiency}%</p>
                      <p className="text-xs text-white/80 mt-auto">{completedLabel}</p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Student Calendar + Timetable */}
        <div className="mb-6 relative z-10 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-white rounded-xl shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">Study Calendar</CardTitle>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Content and quizzes by due date; exams on start and end dates only
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(
                            prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                          )
                        }
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 min-w-[120px] text-center">
                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(
                            prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                          )
                        }
                      >
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={calendarJumpDate}
                        onChange={(e) => setCalendarJumpDate(e.target.value)}
                        className="h-9 rounded-md border border-gray-200 px-2 text-xs sm:text-sm text-gray-700 bg-white"
                      />
                      <Button size="sm" className="whitespace-nowrap" onClick={handleJumpToDate}>
                        Go
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <p key={day} className="text-xs font-semibold text-gray-500 text-center">{day}</p>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-12" />;
                    const dayKey = formatDateKey(day);
                    const isSelected = formatDateKey(selectedCalendarDate) === dayKey;
                    const itemCount = (entriesByDate[dayKey] || []).length;
                    const isToday = formatDateKey(new Date()) === dayKey;
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => setSelectedCalendarDate(day)}
                        className={`h-12 rounded-lg border text-xs sm:text-sm transition-colors relative ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : isToday
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {day.getDate()}
                        {itemCount > 0 && (
                          <span
                            className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                              isSelected ? 'bg-white text-indigo-700' : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {itemCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Study & exams</CardTitle>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedCalendarDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                  {' Â· '}Class timetable is in the table below
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {timetableLoading ? (
                  <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ) : selectedDateEntries.length === 0 ? (
                  <div className="text-center py-3 sm:py-4 lg:py-6">
                    <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-medium text-gray-600">No study tasks or exams</p>
                    <p className="text-xs text-gray-500 mt-1">Class sessions for this day are in the timetable table below.</p>
                  </div>
                ) : (
                  selectedDateEntries.map((entry: any) => {
                    const badgeClass =
                      entry.type === 'exam'
                        ? 'bg-red-100 text-red-700'
                        : entry.type === 'quiz'
                        ? 'bg-orange-100 text-orange-700'
                        : entry.type === 'timetable'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-blue-100 text-blue-700';
                    const badgeLabel =
                      entry.type === 'timetable'
                        ? (entry.sessionType || 'CLASS').toUpperCase()
                        : entry.type.toUpperCase();
                    const timeLabel =
                      entry.type === 'timetable'
                        ? `${entry.startTime || ''}${entry.endTime ? `â€“${entry.endTime}` : ''}`
                        : entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isClickable = entry.type !== 'timetable';
                    return (
                      <div
                        key={`${entry.type}-${entry.id}`}
                        className={`p-3 rounded-lg border border-gray-200 transition-colors ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : 'bg-sky-50/40'}`}
                        onClick={() => {
                          if (entry.type === 'timetable') return;
                          if (entry.type === 'exam') {
                            const examId = String(entry.id || entry.source?._id || '');
                            if (examId) {
                              setLocation(`/student-exams?examId=${encodeURIComponent(examId)}`);
                            } else {
                              setLocation('/student-exams');
                            }
                          } else {
                            handleOpenPreview(entry.source, entry.type === 'quiz');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-1">{entry.title}</p>
                          <Badge className={`${badgeClass} text-[10px]`}>{badgeLabel}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{entry.subject}</p>
                        {entry.type === 'timetable' && entry.teacher && (
                          <p className="text-xs text-gray-600 mt-1">{entry.teacher}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {timeLabel}
                          {entry.type === 'timetable' && entry.room ? ` Â· ${entry.room}` : ''}
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <StudentTimetableView
            entries={monthTimetableEntries}
            isLoading={timetableLoading}
            schoolName={schoolDisplayName}
          />

          {/* Today's Tasks */}
          <Card className="bg-white rounded-xl shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-semibold tracking-wide text-gray-700">TODAY'S TASKS</CardTitle>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSchedule ? (
                <div className="text-center py-4 sm:py-6 lg:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-xs sm:text-sm">Loading schedule...</p>
                </div>
              ) : incompleteContent.length === 0 && incompleteQuizzes.length === 0 ? (
                <div className="text-center py-4 sm:py-6 lg:py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">No pending content or quizzes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Incomplete Quizzes */}
                  {incompleteQuizzes.map((quiz: any) => {
                    const getPriorityColor = (difficulty: string) => {
                      if (difficulty === 'Hard' || difficulty === 'Expert') return 'bg-red-100 text-red-700';
                      if (difficulty === 'Medium') return 'bg-orange-100 text-orange-700';
                      return 'bg-blue-100 text-blue-700';
                    };

                    const getPriorityLabel = (difficulty: string) => {
                      if (difficulty === 'Hard' || difficulty === 'Expert') return 'high';
                      if (difficulty === 'Medium') return 'medium';
                      return 'low';
                    };

                    const isCompleted = completedScheduleIds.has(quiz._id);
                    
                    const timeLabel = getTaskTimeLabel(quiz, true);
                    return (
                      <div 
                        key={`quiz-${quiz._id}`}
                        className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isCompleted ? 'bg-emerald-50' : ''
                        }`}
                        onClick={() => handleOpenPreview(quiz, true)}
                      >
                        <button
                          type="button"
                          aria-label={isCompleted ? "Undo completed task" : "Mark task as completed"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleScheduleComplete(quiz, true);
                          }}
                          className="flex-shrink-0"
                        >
                          {isCompleted ? (
                            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 border-2 border-gray-300 rounded-full"></div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-gray-900 truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                              Complete {quiz.title || 'Quiz'}
                            </h4>
                            <Badge className={`${getPriorityColor(quiz.difficulty || 'Easy')} text-[10px]`}>
                              {getPriorityLabel(quiz.difficulty || 'Easy')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="truncate">
                              {typeof quiz.subject === 'string' 
                                ? quiz.subject 
                                : (typeof quiz.subject === 'object' && quiz.subject?.name 
                                  ? quiz.subject.name 
                                  : 'Unknown Subject')}
                            </span>
                            <span className="flex items-center space-x-1 whitespace-nowrap">
                              <Clock className="w-3 h-3" />
                              <span>{quiz.duration || 30} min</span>
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs bg-white">
                          {timeLabel}
                        </Badge>
                      </div>
                    );
                  })}

                  {/* Incomplete Content */}
                  {incompleteContent.map((content: any) => {
                    const getPriorityColorForContent = () => {
                      // Homework is always high priority
                      if (content.type === 'Homework') {
                        return 'bg-red-100 text-red-700';
                      }
                      // You can add logic here based on content properties
                      return 'bg-blue-100 text-blue-700';
                    };

                    const getPriorityLabel = () => {
                      if (content.type === 'Homework') {
                        return 'high';
                      }
                      return 'medium';
                    };
                    
                    const subjectName = getSubjectName(content);

                    const isCompleted = completedScheduleIds.has(content._id);
                    const isHomework = content.type === 'Homework';
                    const isVideo = isVideoContentType(content.type);
                    const deadline = content.deadline ? new Date(content.deadline) : null;
                    const isOverdue = deadline && deadline < new Date() && !isCompleted;
                    
                    const timeLabel = getTaskTimeLabel(content, false);
                    return (
                      <div 
                        key={`content-${content._id}`}
                        className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isCompleted ? 'bg-emerald-50' : ''
                        } ${isOverdue ? 'bg-red-50' : ''}`}
                        onClick={() => handleOpenPreview(content, false)}
                      >
                        <button
                          type="button"
                          aria-label={
                            isVideo && !isCompleted
                              ? 'Watch video'
                              : isCompleted
                                ? 'Undo completed task'
                                : 'Mark task as completed'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isVideo && !isCompleted) {
                              handleOpenPreview(content, false);
                              return;
                            }
                            handleToggleScheduleComplete(content, false);
                          }}
                          className="flex-shrink-0"
                        >
                          {isCompleted ? (
                            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            </div>
                          ) : isVideo ? (
                            <div className="w-7 h-7 border-2 border-sky-400 rounded-full flex items-center justify-center bg-sky-50">
                              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-600 ml-0.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 border-2 border-gray-300 rounded-full"></div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-gray-900 truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                              {isVideo
                                ? getVideoDisplayTitle(content)
                                : `${getContentTypeLabel(content.type || 'Material')} ${content.title || 'Content'}`}
                            </h4>
                            <Badge className={`${getPriorityColorForContent()} text-[10px]`}>{getPriorityLabel()}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="truncate">{subjectName}</span>
                            {content.type && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{content.type}</span>
                            )}
                            {isHomework && deadline && (
                              <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                                isOverdue ? 'bg-red-100 text-red-700' : 'text-red-600'
                              }`}>
                                Due: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs bg-white whitespace-nowrap">
                          {isCompleted ? 'Done' : timeLabel}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              </CardContent>
            </Card>
        </div>

        {/* Teacher daily diary (class updates from teachers) */}
        <div className="mb-responsive relative z-10">
          <StudentTeacherDiaryFeed />
        </div>

        {/* Teacher Remarks Section */}
        {remarks.length > 0 && (
          <div className="mb-responsive relative z-10">
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-teal-500 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent">
                    Teacher Remarks
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {remarks.slice(0, 5).map((remark: any) => (
                    <div
                      key={remark._id}
                      className={`p-4 rounded-lg border-l-4 ${
                        remark.isPositive
                          ? 'bg-green-50 border-green-500'
                          : 'bg-orange-50 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {remark.isPositive ? (
                            <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                          )}
                          <span className="font-semibold text-gray-900">
                            {remark.teacherId?.fullName || 'Teacher'}
                          </span>
                          {remark.subject && (
                            <Badge variant="outline" className="text-xs">
                              {remark.subject.name}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(remark.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-xs sm:text-sm">{remark.remark}</p>
                    </div>
                  ))}
                  {remarks.length > 5 && (
                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                      Showing 5 of {remarks.length} remarks
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Risk Analysis Reports Section */}
        {riskAnalysisReports.length > 0 && (
          <div className="mb-responsive relative z-10">
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-orange-600 via-orange-400 to-red-500 bg-clip-text text-transparent">
                    AI Risk Analysis Reports
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskAnalysisReports.map((report: any) => (
                    <div
                      key={report._id}
                      className={`p-4 rounded-lg border-l-4 ${
                        report.isRead
                          ? 'bg-gray-50 border-gray-300'
                          : 'bg-orange-50 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                            <h5 className="font-semibold text-gray-900">
                              Performance Risk Analysis Report
                            </h5>
                            {!report.isRead && (
                              <Badge className="bg-orange-500 text-white text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2">
                            Sent by {report.adminId?.fullName || 'Administrator'} on{' '}
                            {new Date(report.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('authToken');
                              const response = await fetch(
                                `${API_BASE_URL}/api/student/risk-analysis-reports/${report._id}/download`,
                                {
                                  headers: {
                                    'Authorization': `Bearer ${token}`
                                  }
                                }
                              );

                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = report.pdfFilename || 'risk-analysis-report.pdf';
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);

                                // Refresh reports to update read status
                                const refreshResponse = await fetch(`${API_BASE_URL}/api/student/risk-analysis-reports`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  }
                                });
                                if (refreshResponse.ok) {
                                  const refreshData = await refreshResponse.json();
                                  if (refreshData.success) {
                                    setRiskAnalysisReports(refreshData.data || []);
                                  }
                                }
                              }
                            } catch (error) {
                              console.error('Failed to download report:', error);
                            }
                          }}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Homework Submissions Section */}
        <div className="mb-responsive relative z-10">
          <Card className="bg-white rounded-xl shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">
                  My Homework
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {assignedHomework.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">
                    Assigned Homework ({assignedHomework.length})
                  </h4>
                  <div className="space-y-2">
                    {assignedHomework.slice(0, 10).map((homework: any) => {
                      const homeworkId = String(homework._id || homework.id || '');
                      const submitted = homeworkSubmissionByHomeworkId.has(homeworkId);

                      return (
                        <div
                          key={homeworkId}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            submitted ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{homework.title || 'Untitled Homework'}</p>
                            <p className="text-xs text-gray-600 truncate">
                              {getSubjectName(homework)}
                              {homework.deadline
                                ? ` â€¢ Due ${new Date(homework.deadline).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}`
                                : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={submitted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                              {submitted ? 'Submitted' : 'Pending'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHomeworkSubmit(homework)}
                            >
                              {submitted ? 'Update' : 'Submit'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isLoadingSubmissions && assignedHomework.length === 0 && (
                <div className="text-center py-4 sm:py-6 lg:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-xs sm:text-sm">Loading homework...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid-responsive-3 gap-responsive mb-responsive relative z-10">
          <div className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Questions Solved</p>
                  <p className="text-responsive-xl font-bold text-white">{stats.questionsAnswered.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Accuracy Rate</p>
                  <p className="text-responsive-xl font-bold text-white">{stats.accuracyRate}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-responsive p-responsive hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Rank</p>
                  <p className="text-responsive-xl font-bold text-white">#{stats.rank}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Main Content */}
        <div className="relative z-10 space-y-3 sm:space-y-4 sm:p-6 lg:space-y-6 lg:p-8">
          <div className="min-w-0 space-y-3 sm:space-y-4 lg:space-y-6">
            
            {/* Learning Progress */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent">Your Learning Progress</CardTitle>
                  <Badge className="bg-gradient-to-r from-orange-400 to-teal-500 text-white shadow-lg">
                    Asli Learn
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
                {/* Progress Overview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-responsive-xs font-medium text-gray-700">Overall Progress</span>
                    <span className="text-responsive-xs font-medium text-primary">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-orange-400 [&>div]:via-blue-500 [&>div]:to-teal-500" />
                </div>

                {/* Subject Progress */}
                <div className="space-y-2.5">
                  {subjectProgress.length > 0 ? subjectProgress.map((subject, idx) => (
                    <div
                      key={subject.id || subject.name || `subject-${idx}`}
                      className="rounded-xl border border-orange-50 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SubjectProgressIcon name={subject.name || ''} />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate capitalize">{subject.name}</h3>
                            <p className="text-responsive-xs text-gray-500 truncate">{subject.currentTopic}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-slate-900 leading-none">{subject.progress}%</p>
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-orange-400 via-blue-500 to-teal-500"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500">
                      Complete exams to see your subject-wise progress
                    </div>
                  )}
                </div>

                {/* Topic-wise Learning Roadmap */}
                {topicWiseProgress.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {topicWiseProgress.map((subject: any) => (
                        <button
                          key={subject.subjectId}
                          onClick={() => setSelectedTopicSubject(subject.subjectId)}
                          className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                            selectedTopicSubject === subject.subjectId
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {subject.subjectName}
                        </button>
                      ))}
                    </div>

                    {topicWiseProgress
                      .filter((subject: any) => subject.subjectId === selectedTopicSubject)
                      .map((subject: any) => (
                        <div key={subject.subjectId} className="space-y-4">
                          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs sm:text-sm text-gray-800">
                            Based on your progress, continue with the next pending topic in {subject.subjectName}.
                          </div>

                          {subject.chapters.map((chapter: any) => (
                            <div key={chapter.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{chapter.order}. {chapter.chapterName}</h4>
                                <Badge variant="outline" className="rounded-full">
                                  {chapter.completedTopics}/{chapter.totalTopics}
                                </Badge>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                                <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${chapter.progress}%` }} />
                              </div>

                              <div className="space-y-3">
                                {chapter.topics.map((topic: any) => (
                                  <div
                                    key={topic.id}
                                    className="flex items-center justify-between gap-3 cursor-pointer"
                                    onClick={() => handleOpenPreview(topic.raw, false)}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex-shrink-0">
                                        {topic.status === 'completed' ? (
                                          <CheckCircle2Icon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                        ) : topic.status === 'in_progress' ? (
                                          <Play className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                        ) : (
                                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-gray-300" />
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-gray-900 truncate">{topic.title}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {topic.progress > 0 && (
                                        <Badge className="bg-orange-100 text-orange-700 border-0">
                                          {topic.progress}%
                                        </Badge>
                                      )}
                                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                )}

                <Button 
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white shadow-lg"
                  onClick={() => setLocation('/learning-paths')}
                >
                  View Complete Learning Path
                </Button>
              </CardContent>
            </Card>

            {/* Adaptive Learning - Recommendation Engine */}
            <AdaptiveRecommendations />


                  </div>
        </div>


      </div>

      {/* Content Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[90vw] h-[95vh] max-w-none overflow-hidden bg-white rounded-2xl flex flex-col">
          {selectedScheduleItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedScheduleItem.isQuiz 
                    ? `Quiz: ${selectedScheduleItem.title || 'Untitled Quiz'}`
                    : `${getContentTypeLabel(selectedScheduleItem.type || 'Material')}: ${selectedScheduleItem.title || 'Untitled Content'}`}
                </DialogTitle>
                <DialogDescription>
                  {selectedScheduleItem.isQuiz 
                    ? selectedScheduleItem.description || 'Complete this quiz to test your knowledge'
                    : selectedScheduleItem.description || 'Review this content to enhance your learning'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4 flex-1 min-h-0 overflow-y-auto">
                {selectedScheduleItem.isQuiz ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Subject</p>
                        <p className="text-xs sm:text-sm text-gray-900">
                          {typeof selectedScheduleItem.subject === 'string' 
                            ? selectedScheduleItem.subject 
                            : (typeof selectedScheduleItem.subject === 'object' && selectedScheduleItem.subject?.name 
                              ? selectedScheduleItem.subject.name 
                              : 'Unknown Subject')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Difficulty</p>
                        <Badge className={`${getPriorityColor(selectedScheduleItem.difficulty || 'Easy')} text-xs`}>
                          {selectedScheduleItem.difficulty || 'Easy'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Duration</p>
                        <p className="text-xs sm:text-sm text-gray-900 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{selectedScheduleItem.duration || 30} minutes</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Questions</p>
                        <p className="text-xs sm:text-sm text-gray-900">{selectedScheduleItem.questionCount || 0} questions</p>
                      </div>
                    </div>
                    {selectedScheduleItem.totalPoints && (
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Total Points</p>
                        <p className="text-xs sm:text-sm text-gray-900">{selectedScheduleItem.totalPoints} points</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Subject</p>
                        <p className="text-xs sm:text-sm text-gray-900">
                          {getSubjectName(selectedScheduleItem)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700">Type</p>
                        <Badge className="text-xs bg-gray-100 text-gray-700">
                          {selectedScheduleItem.type || 'Material'}
                        </Badge>
                      </div>
                    </div>
                    {selectedScheduleItem.fileUrl && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-medium text-gray-700">Content Preview</p>
                        </div>
                        
                        {/* Content Preview */}
                        {(() => {
                          // Ensure fileUrl is properly formatted
                          let fileUrl = selectedScheduleItem.fileUrl || '';
                          if (fileUrl && !fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
                            if (fileUrl.startsWith('/')) {
                              fileUrl = `${API_BASE_URL}${fileUrl}`;
                            } else {
                              fileUrl = `${API_BASE_URL}/${fileUrl}`;
                            }
                          }
                          fileUrl = extractDirectFileUrl(fileUrl);
                          
                          const fileUrlLower = fileUrl.toLowerCase();
                          const isVideo = selectedScheduleItem.type === 'Video' || 
                                         fileUrlLower.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/) ||
                                         fileUrlLower.includes('youtube.com') || 
                                         fileUrlLower.includes('youtu.be');
                          const isPDF =
                            fileUrlLower.endsWith('.pdf') ||
                            fileUrlLower.includes('.pdf') ||
                            selectedScheduleItem.type === 'PDF';
                          const isAudio = selectedScheduleItem.type === 'Audio' || 
                                         fileUrlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/);
                          const isImage = fileUrlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/);
                          const isGoogleDrive = fileUrlLower.includes('drive.google.com');
                          
                          if (isVideo) {
                            if (fileUrlLower.includes('youtube.com') || fileUrlLower.includes('youtu.be')) {
                              // YouTube video
                              const getYouTubeId = (url: string) => {
                                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                const match = url.match(regExp);
                                return (match && match[2].length === 11) ? match[2] : null;
                              };
                              const videoId = getYouTubeId(fileUrl);
                              return videoId ? (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                  <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={selectedScheduleItem.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                  <VideoIcon className="w-12 h-12 text-gray-400" />
                                  <p className="ml-2 text-gray-600">Video preview not available</p>
                                </div>
                              );
                            } else {
                              // Regular video
                              return (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                  <video
                                    src={fileUrl}
                                    controls
                                    className="w-full h-full"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              );
                            }
                          }
                          
                          if (isPDF) {
                            const iframeSrc = getStudentPdfPreviewIframeSrc(
                              fileUrl,
                              selectedScheduleItem?.title
                            );
                            return (
                              <iframe
                                key={iframeSrc}
                                title={selectedScheduleItem.title || 'PDF Preview'}
                                src={iframeSrc}
                                className="h-[min(78vh,900px)] w-full border-0 bg-white rounded-lg"
                              />
                            );
                          }
                          
                          if (isAudio) {
                            return (
                              <div className="w-full bg-gray-100 rounded-lg p-4 sm:p-6 lg:p-8">
                                <div className="text-center space-y-4">
                                  <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                    <File className="w-12 h-12 text-orange-600" />
                                  </div>
                                  <audio 
                                    src={fileUrl} 
                                    controls 
                                    className="w-full max-w-md mx-auto"
                                  >
                                    Your browser does not support the audio tag.
                                  </audio>
                                </div>
                              </div>
                            );
                          }
                          
                          if (isImage) {
                            return (
                              <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={fileUrl}
                                  alt={selectedScheduleItem.title || 'Content preview'}
                                  draggable={false}
                                  className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                                  onError={(e) => {
                                    console.error('Image load error:', e);
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                                  }}
                                />
                              </div>
                            );
                          }
                          
                          if (isGoogleDrive) {
                            return (
                              <div className="w-full">
                                <DriveViewer 
                                  driveUrl={fileUrl}
                                  title={selectedScheduleItem.title}
                                />
                              </div>
                            );
                          }
                          
                          // Default: show file info
                          return (
                            <div className="w-full bg-gray-100 rounded-lg p-4 sm:p-6 lg:p-8">
                              <div className="text-center space-y-4">
                                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                  <File className="w-12 h-12 text-orange-600" />
                                </div>
                                <p className="text-gray-600">Preview not available for this file type</p>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  This file can only be viewed in this preview window.
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setSelectedScheduleItem(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white"
                  onClick={() => handleToggleScheduleComplete(selectedScheduleItem, selectedScheduleItem.isQuiz)}
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  {completedScheduleIds.has(selectedScheduleItem._id || selectedScheduleItem.id)
                    ? 'Undo Complete'
                    : 'Mark as Complete'}
                </Button>
                {selectedScheduleItem.isQuiz && (
                  <Button
                    className="bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setLocation('/learning-paths');
                    }}
                  >
                    Start Quiz
                  </Button>
                )}
                {!selectedScheduleItem.isQuiz && selectedScheduleItem.type === 'Homework' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      handleOpenHomeworkSubmit(selectedScheduleItem);
                    }}
                  >
                    Submit Homework
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHomeworkSubmitOpen} onOpenChange={setIsHomeworkSubmitOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Homework</DialogTitle>
            <DialogDescription>
              Review the assigned homework and submit your solution link.
            </DialogDescription>
          </DialogHeader>

          {selectedHomeworkForSubmit && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">
                  {selectedHomeworkForSubmit.title || 'Untitled Homework'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Subject: {getSubjectName(selectedHomeworkForSubmit)}
                  {selectedHomeworkForSubmit.deadline
                    ? ` â€¢ Due ${new Date(selectedHomeworkForSubmit.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}`
                    : ''}
                </p>
                {selectedHomeworkForSubmit.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelectedScheduleItem(selectedHomeworkForSubmit);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    View Teacher Homework
                  </Button>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700">Upload Submission File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => setHomeworkSubmissionFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs sm:text-sm file:mr-3 file:rounded file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-orange-700"
                />
                {homeworkSubmissionFile && (
                  <p className="mt-1 text-xs text-gray-600">Selected: {homeworkSubmissionFile.name}</p>
                )}
                {!homeworkSubmissionFile && homeworkSubmissionLink && (
                  <p className="mt-1 text-xs text-gray-600">
                    Current file already submitted. Upload a new file to replace it.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700">Description (optional)</label>
                <textarea
                  value={homeworkSubmissionDescription}
                  onChange={(e) => setHomeworkSubmissionDescription(e.target.value)}
                  rows={3}
                  placeholder="Add short notes about your submission..."
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {homeworkSubmitError && (
                <p className="text-xs sm:text-sm text-red-600">{homeworkSubmitError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHomeworkSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white"
              onClick={handleSubmitHomeworkFromDashboard}
              disabled={isSubmittingHomework}
            >
              {isSubmittingHomework ? 'Submitting...' : 'Submit Homework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo}
      />
    </>
  );
}
