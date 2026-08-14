import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type PortalTone = 'student' | 'teacher' | 'admin';

const tones: Record<PortalTone, string> = {
  student: 'from-[#3159f5] via-[#4655e8] to-[#6548df] border-indigo-300/30',
  teacher: 'from-[#4f46e5] via-[#6550df] to-[#7c3aed] border-violet-300/30',
  admin: 'from-[#2563eb] via-[#4f46e5] to-[#7c3aed] border-indigo-300/30',
};

/** Shared boxed page header for portal pages and dashboard tabs. */
export function PortalPageHero({
  portal = 'admin',
  title,
  subtitle,
  badge,
  icon,
  actions,
  className,
}: {
  portal?: PortalTone;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const badgeLabel = badge || title;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br px-5 py-6 text-white shadow-[0_18px_42px_-26px_rgba(79,70,229,0.65)] sm:px-7 sm:py-7',
        tones[portal],
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <Sparkles className="pointer-events-none absolute right-8 top-7 h-5 w-5 text-white/20" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/20">
            {icon ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
            {badgeLabel}
          </p>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-base">
              {subtitle}
            </p>
          ) : (
            <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {title}
            </h1>
          )}
        </div>
        {actions ? <div className="relative shrink-0">{actions}</div> : null}
      </div>
    </motion.section>
  );
}

export default PortalPageHero;
