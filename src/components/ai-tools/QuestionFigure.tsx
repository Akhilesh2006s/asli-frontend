import { normalizeContentFileUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';

/** Renders an AI-generated educational diagram under a question stem. */
export function QuestionFigure({
  imageUrl,
  alt = 'Question figure',
  className,
}: {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}) {
  const src = normalizeContentFileUrl(String(imageUrl || '').trim());
  if (!src) return null;
  return (
    <figure
      className={cn(
        'my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="mx-auto max-h-[420px] w-full object-contain bg-white p-2 sm:p-3"
      />
      <figcaption className="border-t border-slate-100 px-3 py-1.5 text-center text-micro font-medium text-slate-500">
        Figure
      </figcaption>
    </figure>
  );
}
