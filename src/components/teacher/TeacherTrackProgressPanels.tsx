import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  Clock,
  MessageSquare,
  Lightbulb,
  BarChart3,
  ThumbsUp,
  AlertCircle,
  ClipboardCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface TrackProgressStudent {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  classNumber?: string;
  assignedClass?: { classNumber?: string; section?: string };
  performance?: {
    totalExams?: number;
    averagePercentage?: number | null;
    overallProgress?: number;
    learningProgress?: number;
    dailyAverageWatchTime?: number;
    recentExamTitle?: string | null;
    recentPercentage?: number | null;
  };
}

export interface TrackProgressRemark {
  _id: string;
  remark: string;
  isPositive?: boolean;
  createdAt: string;
  studentId?: { _id?: string; fullName?: string; email?: string } | string;
  subject?: { name?: string } | null;
  teacherId?: { fullName?: string };
}

interface TeacherTrackProgressPanelsProps {
  students: TrackProgressStudent[];
  remarks: TrackProgressRemark[];
  aiInsights: string;
  isLoadingAi: boolean;
  onRefreshAi: () => void;
  onFetchStudentInsights: (student: TrackProgressStudent) => Promise<string>;
  getStudentHomeworkStats?: (studentId: string) => { assigned: number; submitted: number };
}

function studentDisplayName(s: TrackProgressStudent) {
  return s.name || s.fullName || s.email || 'Student';
}

function normalizeMongoId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id != null) return String(obj._id);
    if (obj.id != null) return String(obj.id);
  }
  return String(value);
}

function studentIdStr(s: TrackProgressStudent) {
  return normalizeMongoId((s as { id?: string; _id?: string }).id ?? (s as { _id?: string })._id);
}

function remarkStudentId(remark: TrackProgressRemark): string {
  return normalizeMongoId(remark.studentId);
}

function StudentNameViewRow({
  name,
  subtitle,
  onView,
}: {
  name: string;
  subtitle?: string;
  onView: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/80 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 text-sm truncate">{name}</p>
        {subtitle ? <p className="text-xs text-gray-500 truncate">{subtitle}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0 rounded-lg border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
        onClick={onView}
      >
        <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
        View
      </Button>
    </li>
  );
}

export function TeacherTrackProgressPanels({
  students,
  remarks,
  aiInsights,
  isLoadingAi,
  onRefreshAi,
  onFetchStudentInsights,
  getStudentHomeworkStats,
}: TeacherTrackProgressPanelsProps) {
  const [remarksDialogStudent, setRemarksDialogStudent] = useState<TrackProgressStudent | null>(
    null
  );
  const [improvementDialogStudent, setImprovementDialogStudent] =
    useState<TrackProgressStudent | null>(null);
  const [improvementText, setImprovementText] = useState('');
  const [isLoadingImprovement, setIsLoadingImprovement] = useState(false);

  const studentIds = new Set(students.map(studentIdStr).filter(Boolean));
  const filteredRemarks =
    studentIds.size > 0
      ? remarks.filter((r) => {
          const sid = remarkStudentId(r);
          return sid && studentIds.has(sid);
        })
      : remarks;

  const remarksByStudentId = useMemo(() => {
    const map = new Map<string, TrackProgressRemark[]>();
    filteredRemarks.forEach((r) => {
      const sid = remarkStudentId(r);
      if (!sid) return;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(r);
    });
    return map;
  }, [filteredRemarks]);

  const openImprovementView = useCallback(
    async (student: TrackProgressStudent) => {
      setImprovementDialogStudent(student);
      setImprovementText('');
      setIsLoadingImprovement(true);
      try {
        const text = await onFetchStudentInsights(student);
        setImprovementText(text);
      } catch {
        setImprovementText('Could not load improvement analysis for this student.');
      } finally {
        setIsLoadingImprovement(false);
      }
    },
    [onFetchStudentInsights]
  );

  const refreshImprovementDialog = useCallback(async () => {
    if (!improvementDialogStudent) return;
    setIsLoadingImprovement(true);
    try {
      const text = await onFetchStudentInsights(improvementDialogStudent);
      setImprovementText(text);
    } finally {
      setIsLoadingImprovement(false);
    }
  }, [improvementDialogStudent, onFetchStudentInsights]);

  const dialogStudentRemarks = remarksDialogStudent
    ? remarksByStudentId.get(studentIdStr(remarksDialogStudent)) || []
    : [];

  const withExams = students.filter((s) => (s.performance?.totalExams || 0) > 0);
  const examScores = withExams
    .map((s) => s.performance?.averagePercentage)
    .filter((p): p is number => p != null);
  const avgExam =
    examScores.length > 0 ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;

  const withProgress = students.filter(
    (s) => (s.performance?.overallProgress ?? 0) > 0 || (s.performance?.learningProgress ?? 0) > 0
  );
  const avgOverall =
    students.length > 0
      ? students.reduce((sum, s) => sum + (s.performance?.overallProgress ?? 0), 0) / students.length
      : 0;
  const avgLearning =
    withProgress.length > 0
      ? withProgress.reduce((sum, s) => sum + (s.performance?.learningProgress ?? 0), 0) /
        withProgress.length
      : 0;

  const withUsage = students.filter((s) => (s.performance?.dailyAverageWatchTime ?? 0) > 0);
  const avgWatch =
    withUsage.length > 0
      ? withUsage.reduce((sum, s) => sum + (s.performance?.dailyAverageWatchTime ?? 0), 0) /
        withUsage.length
      : 0;

  const improvementStudent = improvementDialogStudent;
  const impPerf = improvementStudent?.performance || {};
  const impHw = improvementStudent
    ? getStudentHomeworkStats?.(studentIdStr(improvementStudent)) || {
        assigned: 0,
        submitted: 0,
      }
    : { assigned: 0, submitted: 0 };

  return (
    <div id="teacher-progress-analytics" className="space-y-4 sm:space-y-6 scroll-mt-24">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgExam.toFixed(1)}%</p>
              <p className="text-xs text-gray-600">Avg exam score</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {withExams.length} of {students.length} students with exam data
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgOverall.toFixed(1)}%</p>
              <p className="text-xs text-gray-600">Avg overall progress</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Content + exam combined</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgWatch.toFixed(1)} min</p>
              <p className="text-xs text-gray-600">Avg daily platform usage</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {withUsage.length} students with session data
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Exam performance */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20"
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Exams performance
          </h3>
          {withExams.length === 0 ? (
            <p className="text-sm text-gray-500">No exam attempts yet for students in this view.</p>
          ) : (
            <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {withExams.map((s) => {
                const perf = s.performance || {};
                const pct = perf.averagePercentage ?? 0;
                return (
                  <li
                    key={studentIdStr(s)}
                    className="rounded-xl border border-gray-100 bg-white/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {studentDisplayName(s)}
                      </span>
                      <Badge
                        className={
                          pct >= 70
                            ? 'bg-green-100 text-green-800'
                            : pct >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }
                      >
                        {pct.toFixed(1)}% avg
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {perf.totalExams} exam{perf.totalExams !== 1 ? 's' : ''}
                        {perf.recentExamTitle
                          ? ` · Recent: ${perf.recentExamTitle} (${(perf.recentPercentage ?? 0).toFixed(0)}%)`
                          : ''}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* 2. Usage & overall progress */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20"
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Usage &amp; overall progress
          </h3>
          {students.length === 0 ? (
            <p className="text-sm text-gray-500">No students match the current filters.</p>
          ) : (
            <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {students.map((s) => {
                const perf = s.performance || {};
                const overall = perf.overallProgress ?? 0;
                const learning = perf.learningProgress ?? 0;
                const watch = perf.dailyAverageWatchTime ?? 0;
                return (
                  <li
                    key={studentIdStr(s)}
                    className="rounded-xl border border-gray-100 bg-white/80 p-3 space-y-2"
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {studentDisplayName(s)}
                    </p>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Overall progress</span>
                        <span className="font-medium text-emerald-700">{overall.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(overall, 100)} className="h-2" />
                    </div>
                    {learning > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Content completion</span>
                          <span className="font-medium text-blue-700">{learning.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(learning, 100)} className="h-1.5" />
                      </div>
                    )}
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {watch > 0
                        ? `${watch.toFixed(1)} min/day avg on platform`
                        : 'No usage data yet'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* 3. Remarks — student list + View */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 lg:col-span-1"
        >
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-600" />
            Remarks
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            All students in this view — click View to see every remark for that student.
          </p>
          {students.length === 0 ? (
            <p className="text-sm text-gray-500">No students match the current filters.</p>
          ) : (
            <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {students.map((s) => {
                const sid = studentIdStr(s);
                const count = remarksByStudentId.get(sid)?.length || 0;
                return (
                  <StudentNameViewRow
                    key={sid}
                    name={studentDisplayName(s)}
                    subtitle={
                      count > 0
                        ? `${count} remark${count !== 1 ? 's' : ''}`
                        : 'No remarks yet'
                    }
                    onView={() => setRemarksDialogStudent(s)}
                  />
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* 4. Areas for improvement — student list + View */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-amber-200/60 lg:col-span-1"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              Areas for improvement
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg border-amber-300 text-amber-900 hover:bg-amber-100"
              onClick={onRefreshAi}
              disabled={isLoadingAi || students.length === 0}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingAi ? 'animate-spin' : ''}`} />
              Refresh all
            </Button>
          </div>
          {aiInsights && students.length > 1 ? (
            <p className="text-xs text-gray-700 mb-3 leading-relaxed border-b border-amber-200/60 pb-3">
              <span className="font-semibold">Class summary: </span>
              {aiInsights}
            </p>
          ) : null}
          <p className="text-xs text-gray-600 mb-3">
            Click View for per-student analysis (exams, usage, progress, homework, remarks).
          </p>
          {students.length === 0 ? (
            <p className="text-sm text-gray-500">No students match the current filters.</p>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {students.map((s) => (
                <StudentNameViewRow
                  key={studentIdStr(s)}
                  name={studentDisplayName(s)}
                  subtitle="View personalized improvement analysis"
                  onView={() => openImprovementView(s)}
                />
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      {/* Remarks detail dialog */}
      <Dialog
        open={!!remarksDialogStudent}
        onOpenChange={(open) => !open && setRemarksDialogStudent(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Remarks — {remarksDialogStudent ? studentDisplayName(remarksDialogStudent) : ''}
            </DialogTitle>
            <DialogDescription>
              All teacher remarks recorded for this student
            </DialogDescription>
          </DialogHeader>
          {dialogStudentRemarks.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No remarks yet for this student.
            </p>
          ) : (
            <ul className="space-y-3">
              {dialogStudentRemarks.map((remark) => (
                <li
                  key={remark._id}
                  className={`p-3 rounded-lg border-l-4 text-sm ${
                    remark.isPositive
                      ? 'bg-green-50 border-green-500'
                      : 'bg-orange-50 border-orange-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {remark.isPositive ? (
                        <ThumbsUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      )}
                      {remark.subject?.name && (
                        <Badge variant="outline" className="text-micro">
                          {remark.subject.name}
                        </Badge>
                      )}
                      {remark.teacherId?.fullName && (
                        <span className="text-xs text-gray-600">{remark.teacherId.fullName}</span>
                      )}
                    </div>
                    <span className="text-micro text-gray-500 shrink-0">
                      {new Date(remark.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed">{remark.remark}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Improvement detail dialog */}
      <Dialog
        open={!!improvementDialogStudent}
        onOpenChange={(open) => {
          if (!open) {
            setImprovementDialogStudent(null);
            setImprovementText('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Areas for improvement —{' '}
              {improvementStudent ? studentDisplayName(improvementStudent) : ''}
            </DialogTitle>
            <DialogDescription>
              Analysis from exams, platform usage, content progress, homework, and remarks
            </DialogDescription>
          </DialogHeader>
          {improvementStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-blue-50 p-2 border border-blue-100">
                  <p className="text-gray-500">Exams</p>
                  <p className="font-semibold text-gray-900">
                    {impPerf.totalExams || 0} taken
                    {impPerf.averagePercentage != null
                      ? ` · ${impPerf.averagePercentage.toFixed(1)}% avg`
                      : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                  <p className="text-gray-500">Overall progress</p>
                  <p className="font-semibold text-gray-900">
                    {(impPerf.overallProgress ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-2 border border-purple-100">
                  <p className="text-gray-500">Daily usage</p>
                  <p className="font-semibold text-gray-900">
                    {(impPerf.dailyAverageWatchTime ?? 0).toFixed(1)} min/day
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2 border border-amber-100">
                  <p className="text-gray-500">Homework</p>
                  <p className="font-semibold text-gray-900">
                    {impHw.submitted}/{impHw.assigned} submitted
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-amber-900 flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    Recommendation
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-amber-300"
                    onClick={refreshImprovementDialog}
                    disabled={isLoadingImprovement}
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${isLoadingImprovement ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </Button>
                </div>
                {isLoadingImprovement ? (
                  <p className="text-sm text-gray-600 italic">Preparing an easy-to-read summary…</p>
                ) : (
                  <p className="text-sm text-gray-800 leading-relaxed">{improvementText}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
