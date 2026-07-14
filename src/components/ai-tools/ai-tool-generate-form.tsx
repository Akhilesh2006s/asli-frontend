import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';

type AiToolGeneratePageChromeProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  onBack: () => void;
  backLabel?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
};

/** Shared page chrome for teacher/student AI tool generation. */
export function AiToolGeneratePageChrome({
  title,
  description,
  icon: Icon,
  onBack,
  backLabel = 'Back',
  badge,
  children,
  className,
}: AiToolGeneratePageChromeProps) {
  return (
    <div className={cn('asli-app-bg min-h-screen p-5 sm:p-7 lg:p-10', className)}>
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="asli-card-premium asli-ai-glow overflow-hidden p-0"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-green-500 to-indigo-blue-500" />
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
              {backLabel}
            </Button>
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-green-600 to-indigo-blue-600 shadow-glow">
                <Icon className="h-8 w-8 text-white" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-ink lg:text-4xl">
                    {title}
                  </h1>
                  {badge ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[0.9375rem] font-semibold text-primary">
                      <Sparkles className="h-4 w-4" />
                      {badge}
                    </span>
                  ) : null}
                </div>
                {description ? (
                  <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.header>
        {children}
      </div>
    </div>
  );
}

type AiToolGenerateFormCardProps = {
  title?: string;
  subtitle?: string;
  notices?: ReactNode;
  children: ReactNode;
  onGenerate: () => void;
  isGenerating?: boolean;
  generateLabel?: string;
  generateDisabled?: boolean;
  className?: string;
};

/** Curriculum selectors + primary Generate CTA — shared look for teacher & student. */
export function AiToolGenerateFormCard({
  title = 'Choose what to generate',
  subtitle = 'Pick board, class, subject, topic, and subtopic — then generate interactive study content.',
  notices,
  children,
  onGenerate,
  isGenerating = false,
  generateLabel = 'Generate',
  generateDisabled = false,
  className,
}: AiToolGenerateFormCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.06 }}
      className={cn(
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        'overflow-hidden border border-white/90 bg-white/95',
        className,
      )}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-teal-50/50 px-4 py-4 sm:px-6">
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{subtitle}</p> : null}
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        {notices}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        <motion.div whileTap={{ scale: 0.985 }}>
          <Button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || generateDisabled}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-700 hover:to-teal-700 disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {generateLabel}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}
