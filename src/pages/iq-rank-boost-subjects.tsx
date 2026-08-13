import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Trophy,
  Play,
  Clock,
  Sparkles,
  ChevronRight,
  Lock,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import StudentShell from '@/components/layout/StudentShell';
import { Link, useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuthToken } from '@/lib/auth-utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject:
    | string
    | {
        _id: string;
        name: string;
      };
  classNumber: string;
  difficulty: string;
  totalQuestions: number;
  questions?: any[];
  isCompleted?: boolean;
  createdAt: string;
  scheduleType?: string;
  activityType?: string;
  questionBankSource?: string;
  dailyPickCount?: number;
}

interface SubjectWithQuizzes {
  _id: string;
  name: string;
  quizzes: Quiz[];
  totalQuizzes: number;
  totalQuestions: number;
  difficulties: string[];
  latestScore?: number;
  latestCompletedAt?: string;
  isDaily?: boolean;
}

interface DailyHistoryRow {
  dateKey: string;
  score: number | null;
  correctCount: number;
  totalQuestions: number;
  completedAt?: string;
}

interface DailyReviewQuestion {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect?: boolean }[];
  correctAnswer: string;
  explanation?: string;
  userAnswer: string;
  isCorrect: boolean;
  isAnswered: boolean;
}

interface DailyReviewPayload {
  dateKey: string;
  score: number | null;
  correctCount: number;
  incorrectCount: number;
  unattempted: number;
  totalQuestions: number;
  completedAt?: string;
  questions: DailyReviewQuestion[];
}

interface DailyStatus {
  today: {
    dateKey: string;
    completed: boolean;
    score: number | null;
    correctCount: number;
    totalQuestions: number;
    completedAt?: string | null;
  };
  history: DailyHistoryRow[];
  nextUnlockDateKey: string;
  lockedUntilTomorrow: boolean;
}

function isDailyQuiz(quiz: Quiz) {
  return quiz.questionBankSource === 'daily-quiz-xlsx' || quiz.activityType === 'daily';
}

function formatDateKeyLabel(dateKey: string) {
  try {
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateKey;
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function IQRankBoostSubjects() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [subjects, setSubjects] = useState<SubjectWithQuizzes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [quizResultsMap, setQuizResultsMap] = useState<
    Map<string, { score: number; completedAt: string }>
  >(new Map());
  const [hoveredQuizId, setHoveredQuizId] = useState<string | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState<DailyReviewPayload | null>(null);

  useEffect(() => {
    fetchStudentClassAndQuizzes();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reviewDate = params.get('review');
      if (reviewDate && /^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
        void openPreviousResult(reviewDate);
        // Clean the query so refresh doesn't re-open unexpectedly
        const url = new URL(window.location.href);
        url.searchParams.delete('review');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      /* ignore */
    }
    // openPreviousResult is stable enough for mount-only deep link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPreviousResult = async (dateKey: string) => {
    try {
      setReviewOpen(true);
      setReviewLoading(true);
      setReview(null);
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/api/student/daily-quiz-result/${encodeURIComponent(dateKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data) {
        toast({
          title: 'Could not open result',
          description: json?.message || 'No saved review for that day.',
          variant: 'destructive',
        });
        setReviewOpen(false);
        return;
      }
      setReview(json.data as DailyReviewPayload);
    } catch {
      toast({
        title: 'Could not open result',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
      setReviewOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchStudentClassAndQuizzes = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();

      const [quizzesResponse, resultsResponse, dailyStatusResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/iq-rank-quizzes`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-results`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/student/daily-quiz-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (dailyStatusResponse.ok) {
        const dailyJson = await dailyStatusResponse.json();
        if (dailyJson?.data) setDailyStatus(dailyJson.data as DailyStatus);
      } else {
        setDailyStatus(null);
      }

      const quizResultsMapLocal = new Map<string, { score: number; completedAt: string }>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          const key = result.quizId || result.subjectId;
          if (key) {
            quizResultsMapLocal.set(String(key), {
              score: result.score,
              completedAt: result.completedAt,
            });
          }
        });
      }
      setQuizResultsMap(quizResultsMapLocal);

      if (!quizzesResponse.ok) {
        setSubjects([]);
        return;
      }

      const quizzesData = await quizzesResponse.json();
      const quizzes: Quiz[] = Array.isArray(quizzesData.data) ? quizzesData.data : [];

      if (quizzesData.classNumber) {
        setStudentClass(String(quizzesData.classNumber));
      } else if (quizzes.length > 0 && quizzes[0].classNumber) {
        setStudentClass(String(quizzes[0].classNumber));
      }

      quizzes.sort((a, b) => Number(isDailyQuiz(b)) - Number(isDailyQuiz(a)));

      const subjectMap = new Map<string, SubjectWithQuizzes>();

      for (const quiz of quizzes) {
        const daily = isDailyQuiz(quiz);
        const subjectId = daily
          ? 'daily-quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?._id || '')
            : String(quiz.subject || 'general');
        const subjectName = daily
          ? 'Daily Quiz'
          : typeof quiz.subject === 'object'
            ? String(quiz.subject?.name || 'Practice')
            : 'Practice';

        if (!subjectId) continue;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            _id: subjectId,
            name: subjectName,
            quizzes: [],
            totalQuizzes: 0,
            totalQuestions: 0,
            difficulties: [],
            isDaily: daily,
          });
        }

        const bucket = subjectMap.get(subjectId)!;
        bucket.quizzes.push(quiz);
        bucket.totalQuizzes += 1;
        bucket.totalQuestions += Number(
          daily ? quiz.dailyPickCount || quiz.totalQuestions || 5 : quiz.totalQuestions || 0,
        );
        if (quiz.difficulty && !bucket.difficulties.includes(quiz.difficulty)) {
          bucket.difficulties.push(quiz.difficulty);
        }
        const result = quizResultsMapLocal.get(String(quiz._id));
        if (result) {
          bucket.latestScore = result.score;
          bucket.latestCompletedAt = result.completedAt;
        }
      }

      const ordered = Array.from(subjectMap.values()).sort((a, b) => {
        if (a._id === 'daily-quiz') return -1;
        if (b._id === 'daily-quiz') return 1;
        return a.name.localeCompare(b.name);
      });
      setSubjects(ordered);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  let quizOrdinal = 0;

  return (
    <StudentShell>
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mb-6"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 rounded-xl text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="quiz-hero-shell relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-5 shadow-sm sm:p-6">
            <motion.div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-sky-300/30 blur-3xl"
              animate={reduceMotion ? undefined : { x: [0, 12, 0], y: [0, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-teal-300/25 blur-3xl"
              animate={reduceMotion ? undefined : { x: [0, -10, 0], y: [0, -6, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative flex items-center gap-3">
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-md shadow-sky-200/50"
                whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: -4 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <Trophy className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                  Quiz
                </h1>
                <p className="text-sm text-slate-600">
                  {studentClass
                    ? `Practice quizzes for Class ${studentClass} — start when you're ready`
                    : 'Practice quizzes to boost your score — start when you are ready'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-sky-100 bg-white p-5">
                <Skeleton className="mb-4 h-40 w-full rounded-xl bg-sky-50" />
                <Skeleton className="h-10 w-40 rounded-lg bg-sky-50" />
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <motion.div
            className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-16 text-center"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Brain className="mx-auto mb-4 h-14 w-14 text-sky-300" />
            <h3 className="text-lg font-semibold text-slate-700">No quizzes available</h3>
            <p className="mt-2 text-sm text-slate-500">
              {studentClass
                ? `No quizzes have been assigned for Class ${studentClass} yet.`
                : 'Quizzes assigned to you will appear here.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {subjects.map((subject, subjectIndex) => (
              <motion.section
                key={subject._id}
                className="space-y-4"
                variants={fadeUp}
                initial={reduceMotion ? false : 'hidden'}
                animate="show"
                transition={{ delay: subjectIndex * 0.08, duration: 0.4 }}
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-600">
                      {subject.isDaily ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                          Today
                        </>
                      ) : (
                        'Practice'
                      )}
                    </p>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{subject.name}</h2>
                    <p className="text-sm text-slate-500">
                      {subject.totalQuizzes} {subject.totalQuizzes === 1 ? 'quiz' : 'quizzes'} ·{' '}
                      {subject.totalQuestions} questions
                    </p>
                  </div>
                  {subject.latestScore != null ? (
                    <motion.div
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      {subject.latestScore}%
                    </motion.div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {subject.quizzes.map((quiz) => {
                    const ordinal = quizOrdinal++;
                    const daily = isDailyQuiz(quiz);
                    const quizResult = quizResultsMap.get(String(quiz._id));
                    const isCompleted = quiz.isCompleted || !!quizResult;
                    const questionCount = daily
                      ? Number(quiz.dailyPickCount) || Number(quiz.totalQuestions) || 5
                      : Number(quiz.totalQuestions) || 0;
                    const difficulty = String(quiz.difficulty || 'medium');
                    const brief = daily
                      ? 'Every day you get 5 fresh questions for your class. School students and trial members both receive today’s set.'
                      : quiz.description ||
                        `A ${questionCount}-question challenge${
                          difficulty ? ` · ${difficulty} difficulty` : ''
                        }.`;
                    const isHovered = hoveredQuizId === quiz._id;

                    const dailyLocked = daily && Boolean(dailyStatus?.lockedUntilTomorrow);
                    const todayScore =
                      daily && dailyStatus?.today?.completed
                        ? dailyStatus.today.score
                        : quizResult?.score;

                    return (
                      <motion.article
                        key={quiz._id}
                        className="quiz-meter-card group relative overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm shadow-sky-100/60"
                        initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: Math.min(ordinal, 6) * 0.07,
                          duration: 0.45,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={
                          reduceMotion
                            ? undefined
                            : { y: -4, boxShadow: '0 18px 36px -20px rgba(14,165,233,0.45)' }
                        }
                        onHoverStart={() => setHoveredQuizId(quiz._id)}
                        onHoverEnd={() => setHoveredQuizId(null)}
                      >
                        <div className="grid gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                          <div className="relative min-h-[210px] overflow-hidden bg-gradient-to-br from-teal-700 via-sky-600 to-cyan-600 p-5 sm:p-6">
                            <motion.div
                              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl"
                              animate={
                                reduceMotion
                                  ? undefined
                                  : isHovered
                                    ? { scale: 1.25, opacity: 0.9 }
                                    : { scale: 1, opacity: 0.7 }
                              }
                              transition={{ duration: 0.45 }}
                            />
                            <div className="relative flex h-full flex-col justify-between gap-6">
                              <div className="flex items-start justify-between gap-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                    daily
                                      ? 'bg-white/20 text-white ring-1 ring-white/25'
                                      : 'text-white/80'
                                  }`}
                                >
                                  {daily ? (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      Daily
                                    </>
                                  ) : (
                                    'Feature'
                                  )}
                                </span>
                                <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                                  {studentClass ? `Class ${studentClass}` : 'Quiz'}
                                </span>
                              </div>
                              <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100">
                                  {typeof quiz.subject === 'object'
                                    ? quiz.subject?.name || 'Practice'
                                    : daily
                                      ? 'Class bank'
                                      : 'Practice'}
                                </p>
                                <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                                  {quiz.title}
                                </h3>
                              </div>
                              <motion.div
                                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20"
                                animate={reduceMotion ? undefined : { rotate: isHovered ? 8 : 0 }}
                              >
                                <BookOpen className="h-6 w-6" />
                              </motion.div>
                            </div>
                          </div>

                          <div className="flex flex-col justify-between gap-5 bg-white p-5 sm:p-6">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
                                The brief
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-slate-600">{brief}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <motion.div
                                className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 transition-colors group-hover:border-sky-200 group-hover:bg-sky-50"
                                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                              >
                                <div className="mb-1 flex items-center gap-1.5 text-sky-600">
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                                    Questions
                                  </span>
                                </div>
                                <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                                  {questionCount || '—'}
                                </p>
                              </motion.div>
                              <motion.div
                                className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3 transition-colors group-hover:border-teal-200 group-hover:bg-teal-50"
                                whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                              >
                                <div className="mb-1 flex items-center gap-1.5 text-teal-600">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                                    {dailyLocked ? 'Status' : 'Time limit'}
                                  </span>
                                </div>
                                <p className="text-2xl font-extrabold capitalize text-slate-900">
                                  {dailyLocked ? 'Done' : daily ? 'Open' : difficulty}
                                </p>
                              </motion.div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              {dailyLocked ? (
                                <div className="flex flex-1 flex-col gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 w-full rounded-xl border-sky-200 bg-white text-sm font-semibold text-sky-700 hover:bg-sky-50"
                                    onClick={() => {
                                      const key = dailyStatus?.today?.dateKey;
                                      if (key) void openPreviousResult(key);
                                    }}
                                  >
                                    <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                                    View today’s result
                                  </Button>
                                  <Button
                                    disabled
                                    className="h-11 w-full cursor-not-allowed rounded-xl bg-slate-200 text-sm font-semibold text-slate-500"
                                  >
                                    <Lock className="mr-2 h-4 w-4" />
                                    Locked until tomorrow
                                  </Button>
                                  <p className="text-center text-xs text-slate-500">
                                    Today’s score{' '}
                                    <span className="font-semibold text-teal-700">
                                      {todayScore != null ? `${todayScore}%` : '—'}
                                    </span>
                                    · new set unlocks{' '}
                                    {dailyStatus?.nextUnlockDateKey
                                      ? formatDateKeyLabel(dailyStatus.nextUnlockDateKey)
                                      : 'tomorrow'}
                                  </p>
                                </div>
                              ) : (
                                <motion.div
                                  className="flex-1"
                                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                >
                                  <Button
                                    className="quiz-start-btn h-11 w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-sm font-semibold text-white shadow-sm shadow-sky-200/50 transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow-md hover:shadow-teal-200/50"
                                    onClick={() => setLocation(`/iq-rank-boost/quiz/${quiz._id}`)}
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    {isCompleted ? 'Retake Quiz' : 'Start Quiz'}
                                    <ChevronRight className="ml-1 h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                                  </Button>
                                </motion.div>
                              )}
                              <AnimatePresence>
                                {!dailyLocked && isCompleted && quizResult ? (
                                  <motion.div
                                    initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700"
                                  >
                                    <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                                    {quizResult.score}%
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>

                {subject.isDaily ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sky-700">
                        <Lock className="h-4 w-4" />
                        <p className="text-sm font-semibold">Upcoming</p>
                      </div>
                      <p className="text-sm text-slate-600">
                        Tomorrow’s daily quiz unlocks at midnight (IST). Complete today’s set to keep
                        your streak going.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-sky-100">
                        <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                        Unlocks{' '}
                        {dailyStatus?.nextUnlockDateKey
                          ? formatDateKeyLabel(dailyStatus.nextUnlockDateKey)
                          : 'tomorrow'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 text-teal-700">
                        <Trophy className="h-4 w-4" />
                        <p className="text-sm font-semibold">Previous results</p>
                      </div>
                      {dailyStatus?.history?.length ? (
                        <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                          {dailyStatus.history.map((row) => (
                            <li key={row.dateKey}>
                              <button
                                type="button"
                                onClick={() => void openPreviousResult(row.dateKey)}
                                className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left text-sm transition hover:bg-sky-50 hover:ring-1 hover:ring-sky-200"
                              >
                                <span className="font-medium text-slate-700">
                                  {formatDateKeyLabel(row.dateKey)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-teal-700">
                                  {row.score != null ? `${row.score}%` : '—'}
                                  <ChevronRight className="h-4 w-4 text-sky-500" />
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No saved daily scores yet. Finish today’s quiz to start your record.
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-slate-400">Tap a day to review answers</p>
                    </div>
                  </div>
                ) : null}
              </motion.section>
            ))}
          </div>
        )}

        <Dialog
          open={reviewOpen}
          onOpenChange={(open) => {
            setReviewOpen(open);
            if (!open) {
              setReview(null);
              setReviewLoading(false);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">
                {review
                  ? `Daily quiz · ${formatDateKeyLabel(review.dateKey)}`
                  : 'Previous result'}
              </DialogTitle>
              <DialogDescription>
                {review
                  ? 'Your saved answers and score for that day.'
                  : 'Loading your saved review…'}
              </DialogDescription>
            </DialogHeader>

            {reviewLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading review…
              </div>
            ) : review ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 p-5 text-white">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/80">Score</p>
                      <p className="text-4xl font-black tabular-nums">
                        {review.score != null ? `${review.score}%` : '—'}
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-white/90" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/15 px-2 py-2">
                      <p className="text-lg font-bold tabular-nums">{review.correctCount}</p>
                      <p className="text-[11px] text-white/80">Correct</p>
                    </div>
                    <div className="rounded-xl bg-white/15 px-2 py-2">
                      <p className="text-lg font-bold tabular-nums">{review.incorrectCount}</p>
                      <p className="text-[11px] text-white/80">Wrong</p>
                    </div>
                    <div className="rounded-xl bg-white/15 px-2 py-2">
                      <p className="text-lg font-bold tabular-nums">{review.unattempted}</p>
                      <p className="text-[11px] text-white/80">Skipped</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Review
                  </h3>
                  {review.questions.map((question, index) => (
                    <div
                      key={question._id}
                      className={cn(
                        'rounded-2xl border bg-white p-4 shadow-sm',
                        question.isCorrect
                          ? 'border-emerald-200'
                          : question.isAnswered
                            ? 'border-rose-200'
                            : 'border-slate-200',
                      )}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-500">Q{index + 1}</span>
                        {question.isCorrect ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500">Correct</Badge>
                        ) : question.isAnswered ? (
                          <Badge variant="destructive">Incorrect</Badge>
                        ) : (
                          <Badge variant="outline">Skipped</Badge>
                        )}
                      </div>
                      <p className="mb-3 font-medium text-slate-900">{question.questionText}</p>
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => {
                          const letter = String.fromCharCode(65 + optIndex);
                          const selected = question.userAnswer === option.text;
                          const correctOpt = Boolean(option.isCorrect);
                          return (
                            <div
                              key={optIndex}
                              className={cn(
                                'rounded-xl border px-3 py-2.5 text-sm',
                                correctOpt
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : selected
                                    ? 'border-rose-300 bg-rose-50'
                                    : 'border-slate-100 bg-slate-50',
                              )}
                            >
                              <span className="mr-2 font-semibold">{letter}.</span>
                              {option.text}
                            </div>
                          );
                        })}
                      </div>
                      {question.explanation ? (
                        <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
                          <span className="font-semibold">Why: </span>
                          {question.explanation}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </StudentShell>
  );
}
