import type { ReactNode } from 'react';
import { Flame, Target, Trophy, ClipboardCheck, Rocket, CalendarDays, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  accuracyCheer,
  streakCheer,
  type QuizPlayStats,
} from '@/lib/quiz-play-stats';

export function QuizPlayHero({
  onStart,
  startLabel = "Let's Start",
  subtitle = 'Explore topics, attempt quizzes and become your best!',
}: {
  onStart?: () => void;
  startLabel?: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#3b5bff] via-[#4f46e5] to-[#6d28d9] px-5 py-7 text-white shadow-[0_22px_50px_-28px_rgba(55,48,163,0.7)] sm:px-8 sm:py-8">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        aria-hidden
      >
        <g fill="none" stroke="white" strokeWidth="1.4">
          <path d="M42 38c18-22 48-18 58 6" strokeDasharray="4 6" />
          <circle cx="92%" cy="22%" r="18" />
          <path d="M88% 18% l12 0 m-6 -8 v16" />
        </g>
      </svg>
      <span className="pointer-events-none absolute left-[38%] top-5 text-lg opacity-40">✦</span>
      <span className="pointer-events-none absolute right-[42%] top-10 text-sm opacity-35">★</span>
      <span className="pointer-events-none absolute bottom-6 left-[28%] text-xl opacity-30">🚀</span>
      <span className="pointer-events-none absolute right-[36%] bottom-8 text-lg opacity-30">💡</span>
      <span className="pointer-events-none absolute left-[18%] top-1/2 text-lg opacity-25">📖</span>

      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(160px,0.7fr)]">
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
            Keep Learning.{' '}
            <span className="text-[#c6f34a]">Keep Growing.</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">{subtitle}</p>
          {onStart ? (
            <button
              type="button"
              onClick={onStart}
              className="mt-5 inline-flex items-center gap-3 rounded-full bg-white py-2.5 pl-6 pr-2 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:scale-[1.02] hover:bg-indigo-50 active:scale-[0.98]"
            >
              {startLabel}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                →
              </span>
            </button>
          ) : null}
        </div>
        <div className="relative mx-auto hidden w-full max-w-[220px] lg:block">
          <div className="pointer-events-none absolute inset-4 rounded-full bg-white/20 blur-2xl" />
          <img
            src="/Scholar.png"
            alt=""
            className="relative z-10 mx-auto h-auto max-h-[200px] w-full object-contain drop-shadow-2xl"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

export function QuizPlayStatCards({ stats }: { stats: QuizPlayStats }) {
  const quizPct = Math.round((stats.quizzesDone / Math.max(1, stats.quizzesGoal)) * 100);
  const items = [
    {
      label: 'Quizzes Today',
      value: `${stats.quizzesDone}/${stats.quizzesGoal}`,
      hint: stats.quizzesDone >= stats.quizzesGoal ? 'Done for today!' : 'Keep it up!',
      bar: quizPct,
      barClass: 'bg-violet-500',
      iconWrap: 'bg-violet-500',
      hintClass: 'text-violet-600',
      Icon: ClipboardCheck,
    },
    {
      label: 'Accuracy',
      value: `${stats.accuracy}%`,
      hint: accuracyCheer(stats.accuracy),
      bar: stats.accuracy,
      barClass: 'bg-emerald-500',
      iconWrap: 'bg-emerald-500',
      hintClass: 'text-emerald-600',
      Icon: Target,
    },
    {
      label: 'Current Streak',
      value: stats.streak === 1 ? '1 Day' : `${stats.streak} Days`,
      hint: streakCheer(stats.streak),
      bar: Math.min(100, stats.streak * 8),
      barClass: 'bg-orange-400',
      iconWrap: 'bg-orange-400',
      hintClass: 'text-orange-600',
      Icon: Flame,
    },
    {
      label: 'XP Earned',
      value: String(stats.xp),
      hint: `Level ${stats.level}`,
      bar: stats.xpProgress,
      barClass: 'bg-sky-500',
      iconWrap: 'bg-sky-500',
      hintClass: 'text-slate-700',
      Icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)] sm:p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm',
                item.iconWrap,
              )}
            >
              <item.Icon className="h-5 w-5" />
            </span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {item.label}
          </p>
          <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{item.value}</p>
          <p className={cn('mt-0.5 text-xs font-semibold', item.hintClass)}>{item.hint}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all', item.barClass)}
              style={{ width: `${Math.max(6, item.bar)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuizReviewSidebar({
  streak,
  nextUnlockLabel,
  locked,
}: {
  streak: number;
  nextUnlockLabel?: string;
  locked?: boolean;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto lg:sticky lg:top-0">
      <div className="rounded-3xl bg-orange-50 p-5 ring-1 ring-orange-100">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-400 text-white shadow-sm">
          <Flame className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Your Streak</p>
        <p className="mt-1 text-3xl font-black text-slate-900">
          {streak} {streak === 1 ? 'day' : 'days'}
        </p>
        <p className="text-sm font-medium text-orange-700">{streakCheer(streak)}</p>
      </div>

      <div className="rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
          <CalendarDays className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-sky-600">What’s Next?</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {locked
            ? `Next daily quiz unlocks ${nextUnlockLabel || 'tomorrow at midnight (IST)'}.`
            : 'Finish today’s quiz to lock in your streak.'}
        </p>
        {locked ? (
          <p className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white">
            Try again tomorrow
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl bg-violet-50 p-5 ring-1 ring-violet-100">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-sm">
          <Rocket className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Keep Improving!</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Review mistakes once — you’ll remember them tomorrow.
        </p>
      </div>
    </aside>
  );
}

export function QuizReviewQuestionCard({
  index,
  questionText,
  options,
  userAnswer,
  isCorrect,
  isAnswered,
  explanation,
}: {
  index: number;
  questionText: string;
  options: { text: string; isCorrect?: boolean }[];
  userAnswer?: string;
  isCorrect: boolean;
  isAnswered: boolean;
  explanation?: string;
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm',
        isCorrect ? 'border-emerald-200' : isAnswered ? 'border-rose-200' : 'border-slate-200',
      )}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Q{index + 1}
            </span>
            {isCorrect ? (
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                Correct ✓
              </span>
            ) : isAnswered ? (
              <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
                Incorrect ✕
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                Skipped
              </span>
            )}
          </div>
          <p className="mb-4 text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">
            {questionText}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {options.map((option, optIndex) => {
              const letter = String.fromCharCode(65 + optIndex);
              const selected = userAnswer === option.text;
              const correctOpt = Boolean(option.isCorrect);
              return (
                <div
                  key={optIndex}
                  className={cn(
                    'rounded-xl border px-3.5 py-3 text-sm sm:text-[0.95rem]',
                    correctOpt
                      ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-900'
                      : selected
                        ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : 'border-slate-100 bg-slate-50 text-slate-700',
                  )}
                >
                  <span className="mr-1.5 font-bold">{letter}.</span>
                  {option.text}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className={cn(
            'flex flex-col justify-center border-t p-5 sm:p-6 lg:border-l lg:border-t-0',
            isCorrect ? 'bg-emerald-50/80' : isAnswered ? 'bg-rose-50/80' : 'bg-slate-50',
          )}
        >
          {isCorrect ? (
            <>
              <p className="text-sm font-bold text-emerald-700">Great job!</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">
                {explanation || 'That’s the right call. Keep this one in your pocket.'}
              </p>
            </>
          ) : (
            <>
              <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-bold text-rose-700">
                <Lightbulb className="h-4 w-4" />
                Explanation
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {explanation || 'Review the highlighted option — that’s the correct answer.'}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function QuizReviewHeader({
  title = 'Review Your Answers',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.85rem]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
          Let’s go through each question so you can learn and improve.
        </p>
      </div>
      <div className="inline-flex max-w-sm items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        {children || 'Study a little each day and you’ll see big progress!'}
      </div>
    </div>
  );
}
