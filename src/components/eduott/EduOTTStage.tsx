import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Sparkles, Video } from 'lucide-react';

/** IIT Exclusive EduOTT shell — videos here are IIT-track only (not board Learning Path videos). */
export interface EduOTTStat {
  value: string | number;
  label: string;
  icon?: ReactNode;
}

export function EduOTTStage({
  children,
  className,
  title = 'EduOTT',
  subtitle = 'IIT Exclusive — Alpha / Beta / Gamma track videos for your school. Board curriculum videos stay in Learning Paths.',
  actions,
  stats,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Headline figures shown as pills under the hero copy. */
  stats?: EduOTTStat[];
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 lg:p-10 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative z-[1] max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold uppercase tracking-[0.12em] text-teal-100">
              <Video className="h-4 w-4" aria-hidden="true" />
              {title}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              IIT Exclusive
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            IIT prep videos.
            <br />
            <span className="text-amber-300">Only for your track.</span>
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-300">{subtitle}</p>

          {stats && stats.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"
                >
                  {s.icon && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200">
                      {s.icon}
                    </span>
                  )}
                  <span className="leading-tight">
                    <span className="block font-display text-xl font-bold text-white">{s.value}</span>
                    <span className="block text-sm text-slate-300">{s.label}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>

      {children}
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
      <div className="relative aspect-[21/9] min-h-[210px] w-full bg-gradient-to-br from-slate-900 to-teal-900 sm:min-h-[250px]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center sm:justify-end sm:pr-16">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-teal-800 shadow-glow-lg transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <p className="text-[0.9375rem] font-bold uppercase tracking-[0.16em] text-amber-200">
            IIT Exclusive
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
