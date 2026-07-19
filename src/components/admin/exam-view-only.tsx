import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, BarChart3, Filter, Download, TrendingUp, Users, Clock, Calendar, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import {
  CLASS_FILTER_OPTIONS,
  examIncludesClass,
  getExamClassStrings,
} from '@/lib/exam-classes';
import { downloadSchoolPerformanceAnalysisExcel } from '@/lib/school-performance-analysis-excel';

interface Exam {
  _id: string;
  title: string;
  description?: string;
  examType: string;
  classNumber?: string;
  assignedClasses?: string[];
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy?: {
    fullName: string;
    email: string;
  };
  questions?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface ExamResult {
  _id: string;
  examId: string;
  examTitle: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    classNumber: string;
  };
  percentage: number;
  obtainedMarks: number;
  totalMarks: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  unattempted?: number;
  timeTaken?: number;
  attemptNumber?: number;
  subjectWiseScore?: Record<string, { correct?: number; total?: number; marks?: number }>;
  questionAnalytics?: Array<{
    subject?: string;
    chapter?: string;
    difficulty?: string;
    questionType?: string;
    timeTaken?: number;
    status?: 'correct' | 'wrong' | 'not_answered';
  }>;
  completedAt: string;
}

const normalizeClassNumberForDisplay = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'N/A';
  return raw
    .replace(/^class\s*-\s*(\d+)/i, 'Class $1')
    .replace(/^-([0-9]+)([A-Za-z]?)$/, '$1$2');
};

const derivePercentageFromMarks = (obtainedMarks: unknown, totalMarks: unknown): number | null => {
  const obtained = Number(obtainedMarks);
  const total = Number(totalMarks);
  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((obtained / total) * 10000) / 100;
};

const getResultPercentage = (result: ExamResult): number => {
  const fromMarks = derivePercentageFromMarks(result.obtainedMarks, result.totalMarks);
  if (fromMarks !== null) return fromMarks;
  const stored = Number(result.percentage);
  return Number.isFinite(stored) ? stored : 0;
};

const parsePerformerMarks = (marks: unknown): { obtained: number; total: number } | null => {
  const text = String(marks ?? '').trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { obtained: Number(match[1]), total: Number(match[2]) };
};

const getPerformerPercentage = (performer: any): number => {
  const parsedMarks = parsePerformerMarks(performer?.marks);
  if (parsedMarks) {
    const fromMarks = derivePercentageFromMarks(parsedMarks.obtained, parsedMarks.total);
    if (fromMarks !== null) return fromMarks;
  }
  const stored = Number(performer?.percentage);
  return Number.isFinite(stored) ? stored : 0;
};

const formatTimeTaken = (seconds: unknown): string => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const getAttemptedCount = (result: ExamResult): number =>
  Math.max(0, Number(result.correctAnswers) || 0) + Math.max(0, Number(result.wrongAnswers) || 0);

const getQuestionAccuracy = (result: ExamResult): number => {
  const attempted = getAttemptedCount(result);
  if (attempted <= 0) return 0;
  return Math.round((Math.max(0, Number(result.correctAnswers) || 0) / attempted) * 100);
};

const formatCompletedAt = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const subjectWiseEntries = (result: ExamResult) => {
  const raw = result.subjectWiseScore;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw).map(([subject, stats]) => ({
    subject,
    correct: Number(stats?.correct) || 0,
    total: Number(stats?.total) || 0,
    marks: Number(stats?.marks) || 0,
  }));
};

const marksBadgeClass = (pct: number) =>
  pct >= 70 ? 'bg-green-100 text-green-800 border-green-200' :
  pct >= 50 ? 'bg-amber-100 text-amber-800 border-amber-200' :
  'bg-red-100 text-red-800 border-red-200';

export default function ExamViewOnly() {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [filters, setFilters] = useState({
    classNumber: '',
    subject: '',
    startDate: '',
    endDate: ''
  });
  const [listClassFilter, setListClassFilter] = useState<string>('all');

  const rankedExamResults = useMemo(() => {
    return [...examResults]
      .map((result) => ({
        result,
        marksPct: getResultPercentage(result),
        questionAcc: getQuestionAccuracy(result),
      }))
      .sort((a, b) => b.marksPct - a.marksPct || b.result.obtainedMarks - a.result.obtainedMarks);
  }, [examResults]);

  const getExamSortTime = (exam: Exam) => {
    const candidates = [exam.updatedAt, exam.createdAt, exam.startDate, exam.endDate];
    for (const value of candidates) {
      if (!value) continue;
      const ts = new Date(value).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    return 0;
  };

  const filteredExams = useMemo(() => {
    const list =
      listClassFilter === 'all'
        ? [...exams]
        : exams.filter((e) => examIncludesClass(e, listClassFilter));
    list.sort((a, b) => {
      const timeDiff = getExamSortTime(b) - getExamSortTime(a);
      if (timeDiff !== 0) return timeDiff;
      return (a.title || '').localeCompare(b.title || '');
    });
    return list;
  }, [exams, listClassFilter]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/exams/viewable`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExams(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExamResults = async (examId: string) => {
    setIsLoadingResults(true);
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams();
      queryParams.append('examId', String(examId));
      if (filters.classNumber) queryParams.append('classNumber', filters.classNumber);
      if (filters.subject) queryParams.append('subject', filters.subject);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/api/admin/exam-results?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExamResults(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exam results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const emptyAnalytics = () => ({
    totalStudents: 0,
    attemptedCount: 0,
    notAttemptedCount: 0,
    averageScore: '0.00',
    topPerformers: [] as any[],
    classPerformance: [] as any[],
  });

  const fetchAnalytics = async (examId: string) => {
    setIsLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('authToken');
      const qs = new URLSearchParams();
      if (filters.classNumber) qs.set('classNumber', filters.classNumber);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const response = await fetch(
        `${API_BASE_URL}/api/admin/exams/${encodeURIComponent(examId)}/analytics${suffix}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.data) {
        setAnalytics(data.data);
      } else {
        setAnalytics(emptyAnalytics());
        toast({
          title: 'Could not load exam analytics',
          description: data?.message || `Request failed (${response.status})`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(emptyAnalytics());
      toast({
        title: 'Could not load exam analytics',
        description: error instanceof Error ? error.message : 'Network error',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleViewExam = async (exam: Exam) => {
    const examId = String(exam._id ?? '');
    setSelectedExam(exam);
    setAnalytics(null);
    await Promise.all([fetchExamResults(examId), fetchAnalytics(examId)]);
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-purple-100 text-purple-700';
      case 'weekend': return 'bg-green-100 text-green-700';
      case 'practice': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
    if (now > endDate) return { status: 'Ended', color: 'bg-red-100 text-red-700' };
    return { status: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (!selectedExam || examResults.length === 0) {
      alert('No results to export');
      return;
    }

    setIsExporting(true);
    try {
      const ok = await downloadSchoolPerformanceAnalysisExcel(selectedExam.title, examResults);
      if (!ok) alert('No results to export');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Could not generate Excel file',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <div className="p-3 sm:p-4 lg:p-6">Loading exams...</div>;
  }

  if (selectedExam) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setSelectedExam(null)}>
              ← Back to Exams
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold mt-4">{selectedExam.title}</h2>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Filter Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Class</Label>
                <Select
                  value={filters.classNumber || 'all'}
                  onValueChange={(v) =>
                    setFilters({ ...filters, classNumber: v === 'all' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {CLASS_FILTER_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Subject"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={() => {
                const id = String(selectedExam._id ?? '');
                void Promise.all([fetchExamResults(id), fetchAnalytics(id)]);
              }}
            >
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        {/* Analytics */}
        {isLoadingAnalytics && !analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4 lg:p-6 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Total Students</p>
                    <p className="text-xl sm:text-2xl font-bold">{analytics.totalStudents}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Attempted</p>
                    <p className="text-xl sm:text-2xl font-bold">{analytics.attemptedCount}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Not Attempted</p>
                    <p className="text-xl sm:text-2xl font-bold">{analytics.notAttemptedCount}</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Average Score</p>
                    <p className="text-xl sm:text-2xl font-bold">{analytics.averageScore}%</p>
                  </div>
                  <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Top Performers */}
        {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPerformers.map((performer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-4">
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-white' :
                        idx === 1 ? 'bg-gray-400 text-white' :
                        idx === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {performer.rank}
                      </div>
                      <div>
                        <p className="font-medium">{performer.studentName}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {performer.studentEmail} • Class {normalizeClassNumberForDisplay(performer.classNumber)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{getPerformerPercentage(performer)}%</p>
                      <p className="text-xs sm:text-sm text-gray-600">{performer.marks}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Student Results</span>
              <Button 
                variant="outline" 
                size="sm"
                disabled={isExporting || examResults.length === 0}
                onClick={() => void exportToExcel()}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                {isExporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingResults ? (
              <div>Loading results...</div>
            ) : examResults.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">#</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Student</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Class</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Attempt</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Questions</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Marks</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Accuracy</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Time</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-700">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedExamResults.map(({ result, marksPct, questionAcc }, idx) => {
                      const completed = formatCompletedAt(result.completedAt);
                      const subjects = subjectWiseEntries(result);
                      const totalQ =
                        Number(result.totalQuestions) ||
                        Math.max(
                          0,
                          (Number(result.correctAnswers) || 0) +
                            (Number(result.wrongAnswers) || 0) +
                            (Number(result.unattempted) || 0)
                        );
                      return (
                        <tr key={result._id} className="border-b border-gray-100 hover:bg-slate-50/80 align-top">
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : idx === 1
                                    ? 'bg-slate-200 text-slate-700'
                                    : idx === 2
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 min-w-[180px]">
                            <p className="font-semibold text-slate-900">{result.userId.fullName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{result.userId.email}</p>
                            {subjects.length > 0 ? (
                              <p className="text-mini text-slate-500 mt-1.5 leading-snug">
                                {subjects
                                  .map(
                                    (s) =>
                                      `${s.subject}: ${s.marks}m (${s.correct}/${s.total})`
                                  )
                                  .join(' · ')}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            {normalizeClassNumberForDisplay(result.userId.classNumber)}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {result.attemptNumber && result.attemptNumber > 1 ? (
                              <Badge variant="outline" className="text-xs">
                                Attempt {result.attemptNumber}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-500">1st</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              <span className="rounded-md bg-green-50 px-2 py-0.5 font-medium text-green-700 border border-green-100">
                                ✓ {result.correctAnswers ?? 0}
                              </span>
                              <span className="rounded-md bg-orange-50 px-2 py-0.5 font-medium text-orange-700 border border-orange-100">
                                ✗ {result.wrongAnswers ?? 0}
                              </span>
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-100">
                                ○ {result.unattempted ?? 0}
                              </span>
                            </div>
                            <p className="text-mini text-slate-500 mt-1">
                              {totalQ} questions · {getAttemptedCount(result)} attempted
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-base font-bold text-slate-900">
                              {result.obtainedMarks}
                              <span className="text-slate-400 font-medium"> / {result.totalMarks}</span>
                            </p>
                            <p className="text-mini text-slate-500">marks obtained</p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <Badge className={`border ${marksBadgeClass(marksPct)}`}>
                                {marksPct}% marks
                              </Badge>
                              <p className="text-mini text-slate-500">
                                {questionAcc}% on attempted ({result.correctAnswers ?? 0}/
                                {getAttemptedCount(result) || '—'})
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {formatTimeTaken(result.timeTaken)}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            <p className="font-medium text-slate-800">{completed.date}</p>
                            <p className="text-xs text-slate-500">{completed.time}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 sm:py-6 lg:py-8 text-gray-500">
                No results found for this exam.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Exams (View Only)</h2>
          <p className="text-gray-600 mt-1">View exams created by Super Admin for your board</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Class</Label>
          <Select value={listClassFilter} onValueChange={setListClassFilter}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {CLASS_FILTER_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exams available. Exams are created by Super Admin.</p>
          </CardContent>
        </Card>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No exams for this class. Choose another class or &quot;All classes&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
          {filteredExams.map((exam, index) => {
            const status = getExamStatus(exam);
            const classLabels = getExamClassStrings(exam);
            // Cycle through orange, sky blue, and teal gradients
            const colorSchemes = [
              { bg: 'from-orange-300 to-orange-400', text: 'text-gray-900', badge: 'bg-orange-500/20 text-gray-900' },
              { bg: 'from-sky-300 to-sky-400', text: 'text-gray-900', badge: 'bg-sky-500/20 text-gray-900' },
              { bg: 'from-teal-400 to-teal-500', text: 'text-gray-900', badge: 'bg-teal-500/20 text-gray-900' }
            ];
            const colorScheme = colorSchemes[index % 3];
            
            return (
              <Card
                key={exam._id}
                className={`bg-gradient-to-br ${colorScheme.bg} border-0 hover:shadow-xl transition-all duration-300 h-full flex flex-col`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg mb-2 text-gray-900 break-words leading-tight">
                        {exam.title}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2 min-h-[2.25rem]">
                        <Badge className={`${colorScheme.badge} border-0`}>
                          {exam.examType.toUpperCase()}
                        </Badge>
                        <Badge className={
                          status.status === 'Ended' 
                            ? 'bg-red-600 text-white border-2 border-white/50 shadow-lg font-semibold'
                            : status.status === 'Active'
                            ? 'bg-teal-600 text-white border-2 border-white/50 shadow-lg font-semibold'
                            : 'bg-yellow-600 text-white border-2 border-white/50 shadow-lg font-semibold'
                        }>
                          {status.status}
                        </Badge>
                        {classLabels.map((cl) => (
                          <Badge key={cl} className="bg-white/90 text-gray-900 border-0 font-medium whitespace-nowrap">
                            Class {cl}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {exam.description && (
                    <p className={`text-xs sm:text-sm text-white/90 mt-2 line-clamp-2`}>{exam.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-2 text-xs sm:text-sm text-white">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-white" />
                      <span className="text-white">{exam.duration} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-white" />
                      <span className="text-white">{exam.totalQuestions} questions • {exam.totalMarks} marks</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-white" />
                      <span className="text-xs text-white">
                        {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {exam.createdBy && (
                      <div className={`text-xs text-white/90 pt-2 border-t border-white/30`}>
                        Created by: {exam.createdBy.fullName}
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full mt-auto pt-4 bg-white/90 text-gray-900 border-white/30 hover:bg-white hover:text-gray-900" 
                    onClick={() => handleViewExam(exam)}
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    View Results & Analytics
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

