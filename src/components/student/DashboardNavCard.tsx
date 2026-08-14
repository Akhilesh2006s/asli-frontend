import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type DashboardNavCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: 'purple' | 'orange';
};

const toneStyles = {
  purple: {
    card: 'from-violet-100/90 via-white to-white border-violet-100/80 hover:border-violet-200',
    icon: 'bg-violet-600 shadow-violet-200/60',
    chevron: 'text-violet-600 group-hover:bg-violet-50',
    glow: 'bg-violet-400/20',
  },
  orange: {
    card: 'from-orange-100/90 via-white to-white border-orange-100/80 hover:border-orange-200',
    icon: 'bg-orange-500 shadow-orange-200/60',
    chevron: 'text-orange-600 group-hover:bg-orange-50',
    glow: 'bg-orange-400/20',
  },
};

export function DashboardNavCard({ href, title, description, icon, tone }: DashboardNavCardProps) {
  const reduceMotion = useReducedMotion();
  const styles = toneStyles[tone];

  return (
    <Link href={href} className="block h-full">
      <motion.div
        className={cn(
          'group relative flex h-full w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[1.35rem] border bg-gradient-to-r p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-5 sm:p-5',
          styles.card,
        )}
        whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      >
        <div
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl',
            styles.glow,
          )}
        />
        <div
          className={cn(
            'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:h-16 sm:w-16',
            styles.icon,
          )}
        >
          {icon}
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-600 sm:text-sm">{description}</p>
        </div>
        <span
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 transition-colors',
            styles.chevron,
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </span>
      </motion.div>
    </Link>
  );
}
