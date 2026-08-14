import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { computeQuizPlayStats } from '@/lib/quiz-play-stats';
import {
  QuizPlayHero,
  QuizPlayStatCards,
  QuizReviewHeader,
  QuizReviewQuestionCard,
  QuizReviewSidebar,
} from '@/components/quiz/QuizPlayChrome';

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

  const playStats = useMemo(() => {
    const extra = Array.from(quizResultsMap.values()).map((row) => Number(row.score) || 0);
    return computeQuizPlayStats(dailyStatus, extra);
  }, [dailyStatus, quizResultsMap]);

  const firstPlayableQuizId = useMemo(() => {
    for (const subject of subjects) {
      for (const quiz of subject.quizzes) {
        const daily = isDailyQuiz(quiz);
        if (daily && dailyStatus?.lockedUntilTomorrow) continue;
        return String(quiz._id);
      }
    }
    return '';
  }, [subjects, dailyStatus?.lockedUntilTomorrow]);

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
              className="mb-4 rounded-xl text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <QuizPlayHero
            subtitle={
              studentClass
                ? `Class ${studentClass} quizzes — play daily to keep your streak alive.`
                : 'Play daily to keep your streak, earn XP, and come back tomorrow.'
            }
            startLabel={dailyStatus?.lockedUntilTomorrow ? 'View today’s result' : "Let's Start"}
            onStart={() => {
              if (dailyStatus?.lockedUntilTomorrow && dailyStatus.today?.dateKey) {
                void openPreviousResult(dailyStatus.today.dateKey);
                return;
              }
              if (firstPlayableQuizId) {
                setLocation(`/iq-rank-boost/quiz/${firstPlayableQuizId}`);
                return;
              }
              document.getElementById('quiz-list')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <div className="mt-4">
            <QuizPlayStatCards stats={playStats} />
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
          <div id="quiz-list" className="space-y-8">
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
                          <div className="relative min-h-[210px] overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-5 sm:p-6">
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
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-200">
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
                                    className="quiz-start-btn h-11 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm shadow-indigo-200/50 transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-md"
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
                    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/70 p-4">
                      <div className="mb-2 flex items-center gap-2 text-orange-700">
                        <Lock className="h-4 w-4" />
                        <p className="text-sm font-semibold">Keep your streak</p>
                      </div>
                      <p className="text-sm text-slate-600">
                        Tomorrow’s daily quiz unlocks at midnight (IST). Complete today’s set to keep
                        your {playStats.streak}-day streak going.
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
          <DialogContent className="flex h-[min(94vh,940px)] max-h-[94vh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:p-0 lg:max-w-[1280px]">
            <DialogHeader className="shrink-0 px-6 pb-0 pt-6 sm:px-8 sm:pt-7">
              <DialogTitle className="sr-only">
                {review
                  ? `Daily quiz · ${formatDateKeyLabel(review.dateKey)}`
                  : 'Previous result'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Review saved answers, streak, and explanations.
              </DialogDescription>
            </DialogHeader>

            {reviewLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading review…
              </div>
            ) : review ? (
              <div className="grid min-h-0 flex-1 gap-6 overflow-hidden px-6 pb-6 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-h-0 overflow-y-auto pr-1">
                  <QuizReviewHeader>
                    Score {review.score != null ? `${review.score}%` : '—'} ·{' '}
                    {formatDateKeyLabel(review.dateKey)}
                  </QuizReviewHeader>
                  <div className="space-y-4 pb-2">
                    {review.questions.map((question, index) => (
                      <QuizReviewQuestionCard
                        key={question._id}
                        index={index}
                        questionText={question.questionText}
                        options={question.options}
                        userAnswer={question.userAnswer}
                        isCorrect={question.isCorrect}
                        isAnswered={question.isAnswered}
                        explanation={question.explanation}
                      />
                    ))}
                  </div>
                </div>
                <QuizReviewSidebar
                  streak={playStats.streak}
                  locked={Boolean(dailyStatus?.lockedUntilTomorrow)}
                  nextUnlockLabel={
                    dailyStatus?.nextUnlockDateKey
                      ? formatDateKeyLabel(dailyStatus.nextUnlockDateKey)
                      : 'tomorrow at midnight (IST)'
                  }
                />
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </StudentShell>
  );
}
