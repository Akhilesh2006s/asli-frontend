import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Maximize,
  ShieldAlert,
  Star,
  Target,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InstructionsQuestion = {
  questionType?: string;
  marks?: number;
  subject?: string;
};

export type ExamInstructionsExam = {
  _id: string;
  title: string;
  description?: string;
  examType?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  instructions?: string;
  classNumber?: string | number;
  negativeMarking?: boolean;
  questions?: InstructionsQuestion[];
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice (single answer)',
  multiple: 'Multiple Choice (multiple answers)',
  integer: 'Integer / Numerical answer',
  assertion_reason: 'Assertion & Reason',
  match_following: 'Match the Following',
};

function labelForType(type: string) {
  return QUESTION_TYPE_LABELS[type] || 'Multiple Choice';
}

export function ExamInstructionsScreen({
  exam,
  questionCount,
  onStart,
  onBack,
  isStarting,
}: {
  exam: ExamInstructionsExam;
  questionCount: number;
  onStart: () => void;
  onBack: () => void;
  isStarting?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    (exam.questions || []).forEach((q) => {
      const type = String(q.questionType || 'mcq').toLowerCase();
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, label: labelForType(type) }));
  }, [exam.questions]);

  const totalMarks =
    exam.totalMarks ||
    (exam.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0) ||
    0;

  const overview = [
    {
      label: 'Total Questions',
      value: questionCount,
      icon: FileText,
      tile: 'bg-gradient-to-br from-violet-500 to-purple-600',
      card: 'bg-white',
    },
    {
      label: 'Total Marks',
      value: totalMarks || '—',
      icon: Target,
      tile: 'bg-gradient-to-br from-sky-500 to-blue-600',
      card: 'bg-sky-50/80',
    },
    {
      label: 'Duration',
      value: exam.duration ? `${exam.duration} min` : '—',
      icon: Clock,
      tile: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      card: 'bg-emerald-50/80',
    },
    {
      label: 'Negative Marking',
      value: exam.negativeMarking ? 'Yes' : 'No',
      icon: ShieldAlert,
      tile: 'bg-gradient-to-br from-amber-400 to-orange-500',
      card: 'bg-amber-50/80',
    },
  ];

  const rules = [
    'Answer all questions to the best of your ability.',
    'You can review and change answers anytime before submitting.',
    'Use the question navigator to jump between questions.',
    'Flag any question you want to revisit later.',
    'Your answers are saved automatically as you go.',
    'The exam runs in full screen — leaving it repeatedly will auto-submit.',
    'Once submitted, you cannot change your answers.',
  ];

  const customInstructions = (exam.instructions || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/60 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_28px_70px_-32px_rgba(79,70,229,0.6)]"
        >
          {/* Hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#5b4be8] via-[#6d4ae8] to-[#8b5cf6] px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
            {!reduceMotion ? (
              <>
                <motion.div
                  className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-fuchsia-300/15 blur-2xl"
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                />
              </>
            ) : null}

            <motion.div
              initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
              className="relative mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-1.5 pr-4 ring-1 ring-white/25"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white">
                <Star className="h-3.5 w-3.5 fill-current" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                Before you begin
              </span>
            </motion.div>

            <h1 className="relative text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              {exam.title}
            </h1>
            <div className="relative mt-2 flex flex-wrap items-center gap-2">
              {exam.description ? (
                <p className="text-sm font-medium text-white/75">{exam.description}</p>
              ) : null}
              {exam.classNumber ? (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                  Class {exam.classNumber}
                </span>
              ) : null}
              {exam.examType ? (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
                  {exam.examType}
                </span>
              ) : null}
            </div>

            {/* Overview chips */}
            <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {overview.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + index * 0.07, duration: 0.35 }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-3 shadow-lg shadow-indigo-900/10',
                    item.card,
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md',
                      item.tile,
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold leading-tight text-slate-900">
                      {item.value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="grid gap-5 px-5 py-6 sm:px-8 lg:grid-cols-2">
            {/* Question types */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <BookOpen className="h-4 w-4" />
                </span>
                Question types in this exam
              </h2>
              <div className="space-y-2">
                {typeBreakdown.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
                    {questionCount} questions — multiple choice.
                  </p>
                ) : (
                  typeBreakdown.map((entry, index) => (
                    <motion.div
                      key={entry.type}
                      initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.07, duration: 0.32 }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm"
                    >
                      <span className="text-sm font-medium text-slate-700">{entry.label}</span>
                      <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-700">
                        {entry.count}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <FileText className="h-4 w-4" />
                </span>
                Instructions
              </h2>
              <ul className="space-y-2">
                {[...customInstructions, ...rules].map((rule, index) => (
                  <motion.li
                    key={`${rule}-${index}`}
                    initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.04, duration: 0.3 }}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{rule}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          </div>

          {/* Timer warning */}
          <div className="mx-5 mb-5 flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/60 px-4 py-3 sm:mx-8">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Timer className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-700">
              The timer starts the moment you press{' '}
              <span className="font-bold text-slate-900">Start Exam</span>. Your exam will be
              auto-submitted when time runs out.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:px-8">
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-12 rounded-full bg-violet-50 font-bold text-violet-700 hover:bg-violet-100 sm:flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to exams
            </Button>
            <motion.div
              className="sm:flex-[1.5]"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Button
                onClick={onStart}
                disabled={isStarting}
                className="h-12 w-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#3b82f6] pl-6 pr-2 text-base font-bold text-white shadow-lg shadow-indigo-300/50 hover:opacity-95 disabled:opacity-70"
              >
                <Maximize className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1 text-center">
                  {isStarting ? 'Starting…' : 'Start Exam in Full Screen'}
                </span>
                <span className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ExamInstructionsScreen;
