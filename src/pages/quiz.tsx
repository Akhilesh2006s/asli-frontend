import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StudentShell from '@/components/layout/StudentShell';
import { getAuthToken } from '@/lib/auth-utils';
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Target,
  ArrowLeft,
  ArrowRight,
  Trophy,
  Sparkles,
  Play,
  ListChecks,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Question {
  _id?: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  questions: Question[];
  totalPoints: number;
  subjectIds?: any[];
}

type Phase = 'lobby' | 'attempt' | 'results';

export default function QuizPage() {
  const [, params] = useRoute('/quiz/:id');
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [navDirection, setNavDirection] = useState(1);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('lobby');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (params?.id) void fetchQuiz();
  }, [params?.id]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || phase === 'results') return;

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;

    quiz.questions.forEach((question) => {
      const questionId = question._id || question.question;
      const userAnswer = answers[questionId];

      if (!userAnswer) {
        unattempted += 1;
        return;
      }

      const correctAnswer = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];

      if (correctAnswer.includes(userAnswer)) {
        correct += 1;
        totalScore += question.points || 1;
      } else {
        incorrect += 1;
      }
    });

    const percentage =
      quiz.totalPoints > 0
        ? Math.round((totalScore / quiz.totalPoints) * 100)
        : Math.round((correct / Math.max(1, quiz.questions.length)) * 100);

    setResults({
      total: quiz.questions.length,
      correct,
      incorrect,
      unattempted,
      score: totalScore,
      percentage,
    });
    setPhase('results');

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/student/quizzes/${quiz._id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          answers,
          score: percentage,
          timeTaken: Math.max(0, quiz.duration * 60 - timeLeft),
        }),
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  }, [quiz, answers, timeLeft, phase]);

  useEffect(() => {
    if (phase !== 'attempt' || !quiz) return;

    setTimeLeft(Math.max(60, (quiz.duration || 15) * 60));
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, quiz?._id]);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      setPhase('lobby');
      setAnswers({});
      setResults(null);
      setCurrentQuestionIndex(0);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/student/quizzes/${params?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setQuiz(data.data || data);
      } else {
        toast({
          title: 'Could not load quiz',
          description: 'This quiz may not be available for your account.',
          variant: 'destructive',
        });
        setQuiz(null);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong while loading the quiz.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: string) => {
    if (phase !== 'attempt') return;
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress =
    quiz && quiz.questions.length > 0
      ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100
      : 0;

  const scoreTone = useMemo(() => {
    const s = results?.percentage ?? 0;
    if (s >= 80) return 'from-emerald-500 to-teal-600';
    if (s >= 50) return 'from-sky-500 to-indigo-600';
    return 'from-rose-500 to-orange-500';
  }, [results?.percentage]);

  if (isLoading) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </StudentShell>
    );
  }

  if (!quiz) {
    return (
      <StudentShell>
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-ink">Quiz not found</h2>
          <p className="mb-6 text-sm text-slate-600">
            This quiz does not exist or you do not have access to it.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </StudentShell>
    );
  }

  if (phase === 'lobby') {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
          <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50 shadow-lg shadow-sky-100/60">
            <div className="border-b border-sky-100/80 bg-white/70 px-5 py-4 sm:px-7 sm:py-5">
              <div className="mb-2 flex items-center gap-2 text-sky-700">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.14em]">Ready to start</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {quiz.title}
              </h1>
              {quiz.description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{quiz.description}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Answer each question carefully. You can jump between questions before submitting.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4 sm:px-7">
              {[
                { icon: ListChecks, label: 'Questions', value: quiz.questions.length },
                { icon: Trophy, label: 'Points', value: quiz.totalPoints || quiz.questions.length },
                { icon: Clock, label: 'Minutes', value: quiz.duration || 15 },
                { icon: Target, label: 'Level', value: quiz.difficulty || 'Mixed' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white bg-white/90 px-3 py-3 shadow-sm"
                >
                  <stat.icon className="mb-1.5 h-4 w-4 text-sky-600" />
                  <p className="text-lg font-bold tabular-nums text-slate-900">{stat.value}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 px-5 pb-2 sm:px-7">
              {[
                'Timer starts when you tap Start quiz',
                'You can review and change answers before submit',
                'Submit early anytime — or auto-submit when time ends',
              ].map((tip) => (
                <div
                  key={tip}
                  className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600 ring-1 ring-sky-100"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:px-7">
              <Link href="/dashboard" className="sm:flex-1">
                <Button variant="outline" className="w-full rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Not now
                </Button>
              </Link>
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md hover:from-sky-600 hover:to-teal-600 sm:flex-[1.4]"
                onClick={() => setPhase('attempt')}
              >
                <Play className="mr-2 h-4 w-4" />
                Start quiz
              </Button>
            </div>
          </div>
        </div>
      </StudentShell>
    );
  }

  if (phase === 'results' && results) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-20">
          <div className={cn('overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg sm:p-8', scoreTone)}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/80">Quiz complete</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{quiz.title}</h1>
              </div>
              <Trophy className="h-10 w-10 text-white/90" />
            </div>
            <div className="mb-6 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums sm:text-6xl">{results.percentage}%</span>
              <span className="mb-2 text-sm text-white/80">
                {results.score}/{quiz.totalPoints || quiz.questions.length} pts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total', value: results.total },
                { label: 'Correct', value: results.correct },
                { label: 'Wrong', value: results.incorrect },
                { label: 'Skipped', value: results.unattempted },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/15 px-3 py-3 backdrop-blur-sm">
                  <div className="text-xl font-bold tabular-nums">{stat.value}</div>
                  <div className="text-xs text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button className="rounded-xl bg-white text-slate-900 hover:bg-white/90">
                  Back to dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  setAnswers({});
                  setResults(null);
                  setCurrentQuestionIndex(0);
                  setPhase('lobby');
                }}
              >
                Try again
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Review</h2>
            {quiz.questions.map((question, index) => {
              const qid = question._id || question.question;
              const userAnswer = answers[qid];
              const correctAnswer = Array.isArray(question.correctAnswer)
                ? question.correctAnswer
                : [question.correctAnswer];
              const isCorrect = Boolean(userAnswer && correctAnswer.includes(userAnswer));
              const isAnswered = Boolean(userAnswer);
              return (
                <div
                  key={qid}
                  className={cn(
                    'rounded-2xl border bg-white p-4 shadow-sm',
                    isCorrect
                      ? 'border-emerald-200'
                      : isAnswered
                        ? 'border-rose-200'
                        : 'border-slate-200',
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500">Q{index + 1}</span>
                    {isCorrect ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-500">Correct</Badge>
                    ) : isAnswered ? (
                      <Badge variant="destructive">Incorrect</Badge>
                    ) : (
                      <Badge variant="outline">Skipped</Badge>
                    )}
                  </div>
                  <p className="mb-3 font-medium text-slate-900">{question.question}</p>
                  <div className="space-y-2">
                    {(question.options || []).map((option, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const selected = userAnswer === option;
                      const correctOpt = correctAnswer.includes(option);
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
                          {option}
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
              );
            })}
          </div>
        </div>
      </StudentShell>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const questionId = currentQuestion?._id || currentQuestion?.question;
  const unansweredCount = Math.max(0, quiz.questions.length - answeredCount);
  const timerUrgent = timeLeft > 0 && timeLeft <= 60;

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-4 py-5 pb-24">
        <div className="mb-5 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-sky-700">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide">In progress</span>
              </div>
              <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{quiz.title}</h1>
            </div>
            <div
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-bold tabular-nums',
                timerUrgent
                  ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                  : 'bg-white text-slate-800 ring-1 ring-sky-100',
              )}
            >
              <Clock className={cn('h-4 w-4', timerUrgent ? 'text-rose-600' : 'text-sky-600')} />
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 sm:text-sm">
            <span>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            <span>
              {answeredCount} answered
              {unansweredCount > 0 ? ` · ${unansweredCount} left` : ''}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-sky-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" custom={navDirection}>
          <motion.div
            key={questionId || currentQuestionIndex}
            custom={navDirection}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, x: navDirection > 0 ? 28 : -28, scale: 0.98 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={
              reduceMotion
                ? undefined
                : { opacity: 0, x: navDirection > 0 ? -20 : 20, scale: 0.98 }
            }
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 rounded-3xl border border-sky-100/80 bg-white p-5 shadow-sm shadow-sky-100/40 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Q{currentQuestionIndex + 1}
              </span>
              <Badge variant="outline" className="capitalize border-sky-200 text-sky-700">
                {quiz.difficulty || 'mixed'} · {currentQuestion?.points || 1} pt
              </Badge>
            </div>
            <p className="mb-5 text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">
              {currentQuestion?.question}
            </p>

            <div className="space-y-3">
              {(currentQuestion?.options || []).map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const selected = answers[questionId] === option;
                return (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => handleAnswerSelect(questionId, option)}
                    whileHover={reduceMotion ? undefined : { scale: 1.01, x: 2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                    className={cn(
                      'quiz-option-btn flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors',
                      selected
                        ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-100'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        selected
                          ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {letter}
                    </span>
                    <span className="pt-1 text-sm font-medium text-slate-800 sm:text-base">{option}</span>
                    <AnimatePresence mode="wait">
                      {selected ? (
                        <motion.span
                          key="check"
                          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          className="ml-auto mt-1"
                        >
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
                        </motion.span>
                      ) : (
                        <motion.span key="empty" className="ml-auto mt-1">
                          <Circle className="h-5 w-5 shrink-0 text-slate-200" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mb-5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setNavDirection(-1);
              setCurrentQuestionIndex((i) => Math.max(0, i - 1));
            }}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <Button
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600"
              onClick={() => {
                setNavDirection(1);
                setCurrentQuestionIndex((i) => Math.min(quiz.questions.length - 1, i + 1));
              }}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="quiz-start-btn rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600"
              onClick={() => void handleSubmit()}
            >
              Submit quiz
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Jump to question
          </p>
          <div className="flex flex-wrap gap-2">
            {quiz.questions.map((question, index) => {
              const qid = question._id || question.question;
              const isAnswered = Boolean(answers[qid]);
              const isCurrent = index === currentQuestionIndex;
              return (
                <motion.button
                  key={qid}
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={() => {
                    setNavDirection(index > currentQuestionIndex ? 1 : -1);
                    setCurrentQuestionIndex(index);
                  }}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                    isCurrent
                      ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm'
                      : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700',
                  )}
                >
                  {index + 1}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
