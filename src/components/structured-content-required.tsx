import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  toolLabel?: string;
};

/** Shown when structured JSON is missing — prefer regenerating; markdown may still display below. */
export function StructuredContentRequired({ className, toolLabel }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-6 py-8 text-center',
        className,
      )}
    >
      <FileWarning className="mx-auto h-9 w-9 text-amber-600/80 mb-2" aria-hidden />
      <p className="text-sm font-medium text-stone-800">
        Content needs a refresh{toolLabel ? ` (${toolLabel})` : ''}
      </p>
      <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
        This topic&apos;s saved result is incomplete for the new viewer. Click Generate again, or ask Super
        Admin to regenerate this tool for the chapter.
      </p>
    </div>
  );
}
