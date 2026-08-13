import { useState, useEffect, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAuthToken } from '@/lib/auth-utils';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Trophy,
  AlertCircle,
  Sparkles,
  Play,
  ListChecks,
  Target,
} from 'lucide-react';
import StudentShell from '@/components/layout/StudentShell';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  subject: {
    _id: string;
    name: string;
  } | string;
}

export default function IQRankBoostQuiz() {
  const [, params] = useRoute('/iq-rank-boost/quiz/:quizId');
  const backHref = '/iq-rank-boost-subjects';
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
  } | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [quizTitle, setQuizTitle] = useState('Quiz');
  const [quizId, setQuizId] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [navDirection, setNavDirection] = useState(1);
  const [isDailyQuiz, setIsDailyQuiz] = useState(false);
  const [lockedUntilTomorrow, setLockedUntilTomorrow] = useState(false);

  useEffect(() => {
    if (params?.quizId) {
      setQuizId(params.quizId);
      setHasStarted(false);
      setIsSubmitted(false);
      setResults(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      void fetchQuestions(params.quizId);
    }
  }, [params?.quizId]);

  const fetchQuestions = async (id: string) => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const questionsResponse = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-questions?quizId=${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );

      if (!questionsResponse.ok) {
        toast({
          title: 'Could not load quiz',
          description: 'This quiz may not be available for your class or trial account.',
          variant: 'destructive',
        });
        setQuestions([]);
        return;
      }

      const questionsData = await questionsResponse.json();
      const fetchedQuestions = questionsData.data || questionsData.questions || [];
      const quiz = questionsData.quiz;
      const dailyMeta = questionsData.daily;
      const dailyBank =
        quiz?.questionBankSource === 'daily-quiz-xlsx' ||
        quiz?.activityType === 'daily' ||
        Boolean(dailyMeta);
      setIsDailyQuiz(dailyBank);
      const shuffled = dailyBank
        ? fetchedQuestions
        : [...fetchedQuestions].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);

      if (quiz) {
        setQuizTitle(quiz.title || 'Quiz');
        if (quiz.subject && typeof quiz.subject === 'object' && quiz.subject.name) {
          setSubjectName(quiz.subject.name);
        }
      } else if (shuffled.length > 0) {
        const firstQuestion = shuffled[0];
        if (typeof firstQuestion.subject === 'object' && firstQuestion.subject?.name) {
          setSubjectName(firstQuestion.subject.name);
        }
        setQuizTitle('Quiz');
      }

      if (dailyBank && dailyMeta?.completed) {
        const total = Number(dailyMeta.pickCount) || shuffled.length || 5;
        const score =
          dailyMeta.score != null
            ? Number(dailyMeta.score)
            : null;
        // Prefer live status endpoint for exact score if questions response omits it
        try {
          const statusRes = await fetch(`${API_BASE_URL}/api/student/daily-quiz-status`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            const today = statusJson?.data?.today;
            if (today?.completed) {
              const t = Number(today.totalQuestions) || total;
              const c = Number(today.correctCount) || 0;
              setResults({
                total: t,
                correct: c,
                incorrect: Math.max(0, t - c),
                unattempted: 0,
                score: today.score != null ? Number(today.score) : score ?? 0,
              });
              setIsSubmitted(true);
              setLockedUntilTomorrow(true);
              setHasStarted(true);
              return;
            }
          }
        } catch {
          /* fall through */
        }
        if (score != null) {
          setResults({
            total,
            correct: 0,
            incorrect: 0,
            unattempted: 0,
            score,
          });
          setIsSubmitted(true);
          setLockedUntilTomorrow(true);
          setHasStarted(true);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
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
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const handleSubmit = async () => {
    if (questions.length === 0 || isSubmitted) return;

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      if (!userAnswer) unattempted += 1;
      else if (userAnswer === question.correctAnswer) correct += 1;
      else incorrect += 1;
    });

    const score = Math.round((correct / questions.length) * 100);
    setResults({ total: questions.length, correct, incorrect, unattempted, score });
    setIsSubmitted(true);

    try {
      const token = getAuthToken();
      const subjectId =
        questions.length > 0 && questions[0].subject
          ? typeof questions[0].subject === 'object'
            ? questions[0].subject._id
            : questions[0].subject
          : null;

      const res = await fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-result`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          quizId: quizId || params?.quizId,
          subjectId,
          subject: subjectId,
          totalQuestions: questions.length,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          unattempted,
          score,
          answers,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 || data?.code === 'DAILY_QUIZ_ALREADY_COMPLETED') {
        setLockedUntilTomorrow(true);
        toast({
          title: 'Already completed today',
          description: data?.message || 'Come back tomorrow for a new daily quiz.',
        });
        return;
      }
      if (!res.ok || !data?.success) {
        toast({
          title: 'Could not save result',
          description: data?.message || 'Your score is shown, but saving failed. Try again later.',
          variant: 'destructive',
        });
        return;
      }
      if (data?.daily?.lockedUntilTomorrow || isDailyQuiz) {
        setLockedUntilTomorrow(true);
      }
      toast({
        title: 'Result saved',
        description: isDailyQuiz
          ? 'Today’s quiz is done. A new set unlocks tomorrow.'
          : 'Your score has been recorded.',
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      toast({
        title: 'Could not save result',
        description: 'Check your connection and try submitting again.',
        variant: 'destructive',
      });
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  const scoreTone = useMemo(() => {
    const s = results?.score ?? 0;
    if (s >= 80) return 'from-emerald-500 to-teal-600';
    if (s >= 50) return 'from-sky-500 to-teal-600';
    return 'from-slate-500 to-sky-600';
  }, [results?.score]);

  if (isLoading) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </StudentShell>
    );
  }

  if (questions.length === 0) {
    return (
      <StudentShell>
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-ink">No questions yet</h2>
          <p className="mb-6 text-sm text-slate-600">
            This quiz has no questions for your class, or it is not assigned to you.
          </p>
          <Link href={backHref}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to quizzes
            </Button>
          </Link>
        </div>
      </StudentShell>
    );
  }

  if (!hasStarted && !isSubmitted) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl px-4 py-6 pb-20">
          <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-lg shadow-sky-100/50">
            <div className="border-b border-sky-100/80 bg-white/70 px-5 py-5 sm:px-7">
              <div className="mb-2 flex items-center gap-2 text-sky-700">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.14em]">Ready to start</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {quizTitle}
              </h1>
              {subjectName ? <p className="mt-2 text-sm text-slate-600">{subjectName}</p> : null}
            </div>

            <div className="grid grid-cols-3 gap-3 px-5 py-5 sm:px-7">
              {[
                { icon: ListChecks, label: 'Questions', value: questions.length },
                { icon: Target, label: 'Subject', value: subjectName || 'General' },
                { icon: Trophy, label: 'Mode', value: 'Practice' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white bg-white/90 px-3 py-3 shadow-sm"
                >
                  <stat.icon className="mb-1.5 h-4 w-4 text-sky-600" />
                  <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{stat.value}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 px-5 pb-2 sm:px-7">
              {[
                'Pick an answer for each question — you can jump around anytime',
                'Submit when ready to see score and explanations',
                'Retake later from the Quiz section if you want a better score',
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
              <Link href={backHref} className="sm:flex-1">
                <Button variant="outline" className="w-full rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md hover:from-sky-600 hover:to-teal-600 sm:flex-[1.4]"
                onClick={() => setHasStarted(true)}
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

  if (isSubmitted && results) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-20">
          <div className={cn('overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg sm:p-8', scoreTone)}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/80">Quiz complete</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{quizTitle}</h1>
                {subjectName ? <p className="mt-1 text-sm text-white/80">{subjectName}</p> : null}
              </div>
              <Trophy className="h-10 w-10 text-white/90" />
            </div>
            <div className="mb-6 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums sm:text-6xl">{results.score}%</span>
              <span className="mb-2 text-sm text-white/80">score</span>
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
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href={backHref}>
                <Button className="rounded-xl bg-white text-slate-900 hover:bg-white/90">
                  Back to quizzes
                </Button>
              </Link>
              {lockedUntilTomorrow || isDailyQuiz ? (
                <p className="text-sm text-white/90">
                  Today’s set is saved. Next daily quiz unlocks tomorrow.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Review</h2>
            {questions.map((question, index) => {
              const userAnswer = answers[question._id];
              const isCorrect = userAnswer === question.correctAnswer;
              const isAnswered = Boolean(userAnswer);
              return (
                <div
                  key={question._id}
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
                  <p className="mb-3 font-medium text-slate-900">{question.questionText}</p>
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => {
                      const letter = String.fromCharCode(65 + optIndex);
                      const selected = userAnswer === option.text;
                      const correctOpt = option.isCorrect;
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
              );
            })}
          </div>
        </div>
      </StudentShell>
    );
  }

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
              <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{quizTitle}</h1>
              {subjectName ? <p className="mt-1 text-sm text-slate-600">{subjectName}</p> : null}
            </div>
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="shrink-0 rounded-xl">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Exit
              </Button>
            </Link>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 sm:text-sm">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
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
            key={currentQuestion._id || currentQuestionIndex}
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
                {currentQuestion.difficulty || 'mixed'}
              </Badge>
            </div>
            <p className="mb-5 text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">
              {currentQuestion.questionText}
            </p>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const selected = answers[currentQuestion._id] === option.text;
                return (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => handleAnswerSelect(currentQuestion._id, option.text)}
                    whileHover={reduceMotion ? undefined : { scale: 1.01, x: 2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                    className={cn(
                      'quiz-option-btn flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors',
                      selected
                        ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-100'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50',
                    )}
                  >
                    <motion.span
                      layout
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        selected
                          ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {letter}
                    </motion.span>
                    <span className="pt-1 text-sm font-medium text-slate-800 sm:text-base">
                      {option.text}
                    </span>
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

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              className="rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600"
              onClick={() => {
                setNavDirection(1);
                setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1));
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
            {questions.map((question, index) => {
              const isAnswered = Boolean(answers[question._id]);
              const isCurrent = index === currentQuestionIndex;
              return (
                <motion.button
                  key={question._id}
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
