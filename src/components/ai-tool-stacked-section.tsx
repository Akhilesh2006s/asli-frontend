import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RealisticIcon,
  lucideTo3dName,
  type AiTool3dIconName,
} from '@/components/ai-tool-3d-icons';

const fadeUp = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const ACCENTS = [
  'bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6]',
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-emerald-500 to-green-600',
  'bg-gradient-to-br from-amber-500 to-orange-500',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-cyan-500 to-teal-600',
  'bg-gradient-to-br from-indigo-500 to-blue-700',
  'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  'bg-gradient-to-br from-lime-500 to-emerald-600',
  'bg-gradient-to-br from-orange-500 to-red-500',
  'bg-gradient-to-br from-slate-600 to-slate-800',
];

const GRADIENTS = [
  'bg-gradient-to-r from-violet-50/80 to-indigo-50/50',
  'bg-gradient-to-r from-sky-50 to-blue-50',
  'bg-gradient-to-r from-violet-50 to-fuchsia-50',
  'bg-gradient-to-r from-emerald-50 to-lime-50',
  'bg-gradient-to-r from-amber-50 to-orange-50',
  'bg-gradient-to-r from-rose-50 to-pink-50',
  'bg-gradient-to-r from-cyan-50 to-teal-50',
  'bg-gradient-to-r from-indigo-50 to-blue-50',
  'bg-gradient-to-r from-fuchsia-50 to-purple-50',
  'bg-gradient-to-r from-lime-50 to-emerald-50',
  'bg-gradient-to-r from-orange-50 to-red-50',
  'bg-gradient-to-r from-slate-50 to-slate-100',
];

function accentForNum(num: string) {
  const n = parseInt(String(num).replace(/\D/g, ''), 10);
  const i = Number.isFinite(n) && n > 0 ? (n - 1) % ACCENTS.length : 0;
  return { accent: ACCENTS[i], gradient: GRADIENTS[i] };
}

/**
 * Full-width section card used by every AI tool:
 * one section after another, large header, interactive 3D icon.
 */
export function AiToolStackedSection({
  num,
  title,
  icon,
  iconName,
  accent,
  gradient,
  children,
  className,
}: {
  /** Section number label, e.g. "01", "2", or "Section 3". */
  num: string;
  title: string;
  /** Lucide icon (mapped to Icons8 3D Fluency). Prefer iconName when set. */
  icon?: LucideIcon | null;
  iconName?: AiTool3dIconName;
  accent?: string;
  gradient?: string;
  children: ReactNode;
  className?: string;
}) {
  const resolved = iconName || lucideTo3dName(icon);
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const theme = accentForNum(numLabel);
  const accentClass = accent || theme.accent;
  const gradientClass = gradient || theme.gradient;

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 18px 36px -18px rgba(108,99,255,0.35)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={cn(
        'group relative w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-[0_12px_36px_-20px_rgba(15,23,42,0.28)]',
        className,
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1.5 rounded-l-[1.5rem]', accentClass)} />
      <div className={cn('border-b border-slate-100/80 px-4 py-3.5 sm:px-5 sm:py-4', gradientClass)}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={cn(
              'flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl text-sm sm:text-base font-black text-white shadow-md',
              accentClass,
            )}
          >
            {numLabel.length > 3 ? numLabel.slice(0, 2) : numLabel}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Section {numLabel}
            </p>
            <h4 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{title}</h4>
          </div>
          <RealisticIcon name={resolved} alt="" className="h-12 w-12 sm:h-14 sm:w-14 shrink-0" />
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </motion.section>
  );
}

/** Always one full-width section after another. */
export function AiToolStackedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex w-full flex-col gap-4', className)}>{children}</div>;
}
