import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AI_V2 } from '@/lib/ai-tool-design-tokens';
import { formatAiToolText } from '@/lib/title-case';

/** Fixed label band so long labels never push controls out of row alignment. */
export function AiToolFormField({
  label,
  htmlFor,
  loading = false,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label
        htmlFor={htmlFor}
        className="flex min-h-10 items-end gap-2 text-sm font-medium leading-snug text-slate-700"
      >
        <span className="line-clamp-2">{label}</span>
        <span className="mb-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          ) : null}
        </span>
      </Label>
      {children}
    </div>
  );
}

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
  const displayTitle = formatAiToolText(title);
  const displayDescription = description ? formatAiToolText(description) : undefined;
  const displayBadge = badge ? formatAiToolText(badge) : undefined;

  return (
    <div className={cn('asli-app-bg min-h-screen p-5 sm:p-7 lg:p-10', className)}>
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="asli-card-premium asli-ai-glow overflow-hidden p-0"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-violet-600 to-teal-500" />
          <div className="flex flex-col gap-5 bg-gradient-to-br from-violet-50/90 via-white to-orange-50/40 p-5 sm:gap-6 sm:p-8">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-fit shrink-0"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
              {backLabel}
            </Button>
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-700 shadow-lg shadow-violet-500/25 sm:h-16 sm:w-16">
                <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-violet-950 sm:text-3xl lg:text-4xl">
                    {displayTitle}
                  </h1>
                  {displayBadge ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-sm font-semibold text-violet-950 sm:px-3 sm:py-1 sm:text-[0.9375rem]">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {displayBadge}
                    </span>
                  ) : null}
                </div>
                {displayDescription ? (
                  <p className="w-full max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                    {displayDescription}
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
  title = 'Choose What To Generate',
  subtitle = 'Pick Board, Class, Subject, Topic, And Subtopic — Then Generate Interactive Study Content.',
  notices,
  children,
  onGenerate,
  isGenerating = false,
  generateLabel = 'Generate',
  generateDisabled = false,
  className,
}: AiToolGenerateFormCardProps) {
  const displayTitle = formatAiToolText(title);
  const displaySubtitle = subtitle ? formatAiToolText(subtitle) : undefined;
  const displayGenerateLabel = formatAiToolText(generateLabel);

  return (
    <section
      className={cn(
        AI_V2.radius.cardLg,
        AI_V2.shadow.card,
        'overflow-hidden border border-slate-200/80 bg-white [overflow-anchor:none]',
        className,
      )}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-violet-600 to-teal-500" aria-hidden />
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-orange-50/60 px-5 py-5 sm:px-7">
        <p className="mb-1 text-micro font-bold uppercase tracking-[0.18em] text-violet-700/80">
          Generate
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-violet-950">{displayTitle}</h2>
        {displaySubtitle ? (
          <p className="mt-2 text-base leading-relaxed text-slate-600 sm:text-lg">{displaySubtitle}</p>
        ) : null}
      </div>
      <div className="space-y-6 bg-gradient-to-b from-white to-slate-50/50 p-5 sm:p-7">
        {notices}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children}
          </div>
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || generateDisabled}
          className="h-14 w-full rounded-xl bg-violet-700 text-lg font-bold text-white shadow-lg shadow-violet-500/25 transition-[background-color,box-shadow,opacity] hover:translate-y-0 hover:bg-violet-800 active:scale-100 disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {formatAiToolText('Generating…')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {displayGenerateLabel}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
