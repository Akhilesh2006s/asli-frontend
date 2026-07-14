import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Sparkles, Video } from 'lucide-react';

/** Bright premium EduOTT shell — inviting, Zoom-readable, buyable. */
export function EduOTTStage({
  children,
  className,
  title = 'EduOTT',
  subtitle = 'Watch curated lessons and join live classroom sessions',
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 shadow-elevated backdrop-blur-md',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 0% 0%, rgba(20,184,166,0.16), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(251,191,36,0.14), transparent 50%), linear-gradient(180deg, #f8fcfd 0%, #ffffff 40%, #f3fafb 100%)',
        }}
      />

      <div className="relative z-[1] space-y-7 p-5 sm:p-7 lg:p-9">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-green-500 to-indigo-blue-600 shadow-glow">
              <Video className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold uppercase tracking-[0.14em] text-teal-green-700">
                <Sparkles className="h-4 w-4" />
                Watch & learn
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink lg:text-4xl">
                {title}
              </h2>
              <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function EduOTTFeaturedHero({
  title,
  meta,
  thumbnailUrl,
  onPlay,
}: {
  title: string;
  meta?: string;
  thumbnailUrl?: string | null;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-elevated ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="relative aspect-[21/9] min-h-[210px] w-full bg-gradient-to-br from-teal-green-700 to-indigo-blue-800 sm:min-h-[250px]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center sm:justify-end sm:pr-16">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-teal-green-700 shadow-glow-lg transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <p className="text-[0.9375rem] font-bold uppercase tracking-[0.16em] text-teal-green-200">
            Start here
          </p>
          <h3 className="mt-2 max-w-3xl font-display text-2xl font-bold text-white sm:text-3xl lg:text-[2.35rem]">
            {title}
          </h3>
          {meta ? <p className="mt-2 text-lg text-white/75">{meta}</p> : null}
        </div>
      </div>
    </button>
  );
}
