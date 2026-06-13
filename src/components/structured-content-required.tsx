import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  toolLabel?: string;
};

/** Shown when metadata.structuredContent is missing — viewers do not parse markdown. */
export function StructuredContentRequired({ className, toolLabel }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-6 py-10 text-center',
        className,
      )}
    >
      <FileWarning className="mx-auto h-9 w-9 text-amber-600/80 mb-2" aria-hidden />
      <p className="text-sm font-medium text-stone-800">
        Structured content required{toolLabel ? ` (${toolLabel})` : ''}
      </p>
      <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
        This record has no metadata.structuredContent. Run fingerprint backfill or regenerate to populate
        structured JSON. Markdown is not used for viewer rendering.
      </p>
    </div>
  );
}
