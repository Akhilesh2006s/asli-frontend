import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AdminTone = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'rose';

/**
 * Shared admin button styles.
 *
 * The admin theme is indigo/violet (see the sidebar and page heroes), so action
 * buttons use intent rather than one-off colours: primary for the main create
 * action, secondary for supporting actions, and danger only for destructive ones.
 */
export const adminBtn = {
  /** Main create/save action — one per toolbar. */
  primary:
    'rounded-xl bg-gradient-to-r from-indigo-blue-600 to-violet-600 px-4 text-white shadow-md shadow-indigo-blue-200/60 transition-all hover:from-indigo-blue-700 hover:to-violet-700 hover:shadow-lg sm:px-6',
  /** Supporting actions (Export, Upload, Filters) — quiet next to primary. */
  secondary:
    'rounded-xl border border-indigo-blue-200 bg-white px-4 font-medium text-indigo-blue-700 shadow-sm transition-all hover:border-indigo-blue-300 hover:bg-indigo-blue-50 hover:text-indigo-blue-800 sm:px-6',
  /** Destructive actions only. */
  danger:
    'rounded-xl border border-red-200 bg-red-50 px-4 font-medium text-red-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-700 sm:px-6',
  /** Solid destructive — use inside confirm dialogs. */
  dangerSolid:
    'rounded-xl bg-red-600 px-4 text-white shadow-md transition-all hover:bg-red-700 sm:px-6',
  /** Selected state for segmented view toggles. */
  toggleActive:
    'rounded-lg bg-gradient-to-r from-indigo-blue-600 to-violet-600 text-xs text-white shadow-sm sm:text-sm',
  /** Unselected state for segmented view toggles. */
  toggleIdle:
    'rounded-lg text-xs text-slate-600 hover:bg-indigo-blue-50 hover:text-indigo-blue-700 sm:text-sm',
} as const;

const toneMap: Record<
  AdminTone,
  { tile: string; label: string; stroke: string; fill: string; soft: string }
> = {
  blue: {
    tile: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200/70',
    label: 'text-blue-600',
    stroke: '#3b82f6',
    fill: 'rgba(59,130,246,0.16)',
    soft: 'bg-blue-50',
  },
  orange: {
    tile: 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-200/70',
    label: 'text-orange-600',
    stroke: '#f97316',
    fill: 'rgba(249,115,22,0.16)',
    soft: 'bg-orange-50',
  },
  green: {
    tile: 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200/70',
    label: 'text-emerald-600',
    stroke: '#10b981',
    fill: 'rgba(16,185,129,0.16)',
    soft: 'bg-emerald-50',
  },
  purple: {
    tile: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-200/70',
    label: 'text-violet-600',
    stroke: '#8b5cf6',
    fill: 'rgba(139,92,246,0.16)',
    soft: 'bg-violet-50',
  },
  teal: {
    tile: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-200/70',
    label: 'text-teal-600',
    stroke: '#14b8a6',
    fill: 'rgba(20,184,166,0.16)',
    soft: 'bg-teal-50',
  },
  rose: {
    tile: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200/70',
    label: 'text-rose-600',
    stroke: '#f43f5e',
    fill: 'rgba(244,63,94,0.16)',
    soft: 'bg-rose-50',
  },
};

/** Deterministic gentle curve so cards look alive without needing real series data. */
function buildSparkPath(seed: number, width = 120, height = 34) {
  const points = 7;
  const values: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const wave = Math.sin(seed * 1.7 + i * 0.9) * 0.5 + Math.cos(seed * 0.6 + i * 1.4) * 0.3;
    values.push(0.5 + wave * 0.34);
  }
  const step = width / (points - 1);
  const coords = values.map((v, i) => [i * step, height - v * height]);

  let d = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 1; i < coords.length; i += 1) {
    const [px, py] = coords[i - 1];
    const [x, y] = coords[i];
    const cx = (px + x) / 2;
    d += ` Q ${cx} ${py} ${x} ${y}`;
  }
  return { line: d, area: `${d} L ${width} ${height} L 0 ${height} Z` };
}

export function AdminSparkline({ tone, seed }: { tone: AdminTone; seed: number }) {
  const { stroke, fill } = toneMap[tone];
  const { line, area } = buildSparkPath(seed);
  return (
    <svg viewBox="0 0 120 34" className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export type AdminStat = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: AdminTone;
  footLabel?: string;
  footValue?: ReactNode;
  onClick?: () => void;
};

export function AdminStatCard({ stat, index = 0 }: { stat: AdminStat; index?: number }) {
  const reduceMotion = useReducedMotion();
  const tone = toneMap[stat.tone];
  const interactive = Boolean(stat.onClick);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      onClick={stat.onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                stat.onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg',
        interactive && 'cursor-pointer',
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-2">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
            tone.tile,
          )}
        >
          {stat.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-xs font-semibold sm:text-sm', tone.label)}>{stat.label}</p>
          <p className="mt-0.5 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
            {stat.value}
          </p>
        </div>
      </div>

      {stat.footLabel ? (
        <div className="flex items-center justify-between gap-2 px-4 pb-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 truncate">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.tile)} />
            <span className="truncate">{stat.footLabel}</span>
          </span>
          {stat.footValue != null ? (
            <span className="shrink-0 font-bold text-slate-700">{stat.footValue}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto">
        <AdminSparkline tone={stat.tone} seed={index + 1} />
      </div>
    </motion.div>
  );
}

export function AdminStatGrid({ stats }: { stats: AdminStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <AdminStatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}

export function AdminPageHero({
  title,
  highlight,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-indigo-300/30 bg-gradient-to-br from-[#2563eb] via-[#4f46e5] to-[#7c3aed] px-5 py-6 text-white shadow-[0_18px_42px_-26px_rgba(79,70,229,0.65)] sm:px-7 sm:py-7"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            {title}
            {highlight ? <span className="text-cyan-200"> {highlight}</span> : null}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-white/80 sm:text-base">{subtitle}</p>
          ) : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <motion.span
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:flex lg:h-24 lg:w-24"
        >
          {icon}
        </motion.span>
      </div>
    </motion.div>
  );
}

export function AdminSectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminFooterBanner({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50/60 to-white px-5 py-4 sm:px-6 sm:py-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200/60">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 sm:text-base">{title}</p>
        <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
