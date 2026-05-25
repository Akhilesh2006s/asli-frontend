import { motion } from 'framer-motion';
import { Clock, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TimetableEntry } from '@/types/timetable';
import { entryAccentStyle, getSubjectTheme, refName, isEntryOngoing } from '@/lib/student-timetable-utils';
import { cn } from '@/lib/utils';

type TimetableGridCellProps = {
  entries: TimetableEntry[];
  now?: Date;
  compact?: boolean;
  interactive?: boolean;
  onEntryClick?: (entry: TimetableEntry) => void;
  onEmptyClick?: () => void;
};

export function TimetableGridCell({
  entries,
  now = new Date(),
  compact,
  interactive,
  onEntryClick,
  onEmptyClick,
}: TimetableGridCellProps) {
  if (entries.length === 0) {
    return (
      <div
        role={interactive && onEmptyClick ? 'button' : undefined}
        tabIndex={interactive && onEmptyClick ? 0 : undefined}
        onClick={interactive ? onEmptyClick : undefined}
        onKeyDown={
          interactive && onEmptyClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onEmptyClick();
              }
            : undefined
        }
        className={cn(
          'w-full rounded-md border border-dashed border-gray-100 bg-gray-50/30',
          compact ? 'h-[44px]' : 'min-h-[72px] sm:min-h-[88px]',
          interactive && onEmptyClick && 'cursor-pointer hover:bg-orange-50/50 hover:border-orange-200'
        )}
      />
    );
  }

  return (
    <div className={cn('flex w-full flex-col gap-1', compact ? 'min-h-[44px]' : 'min-h-[72px] sm:min-h-[88px]')}>
      {entries.map((entry) => {
        const subject = refName(entry.subjectId) || 'Class';
        const theme = getSubjectTheme(subject);
        const accent = entryAccentStyle(entry.colorTag);
        const ongoing = isEntryOngoing(entry, now);
        const isLab = entry.sessionType === 'Lab';

        return (
          <motion.div
            key={entry._id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={interactive && onEntryClick ? () => onEntryClick(entry) : undefined}
            style={accent}
            className={cn(
              'relative rounded-md border shadow-sm overflow-hidden',
              interactive && onEntryClick ? 'cursor-pointer' : 'cursor-default',
              compact ? 'p-1.5' : 'rounded-lg p-2 sm:p-2.5',
              !accent && 'bg-gradient-to-br',
              !accent && theme.bg,
              !accent && theme.border,
              !accent && theme.gradient,
              accent && 'border-2',
              ongoing && 'ring-2 ring-sky-400 ring-offset-1 shadow-md z-[1]'
            )}
          >
            {ongoing && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
              </span>
            )}

            <p className={cn('font-bold text-[11px] sm:text-xs leading-tight pr-3 uppercase tracking-wide', theme.text)}>
              {subject}
            </p>

            {!compact && (
              <>
                <p className="text-[10px] sm:text-[11px] text-gray-600 mt-1 flex items-center gap-1 truncate">
                  <User className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="truncate">{refName(entry.teacherId) || '—'}</span>
                </p>
                {entry.room && (
                  <p className="text-[10px] sm:text-[11px] text-gray-600 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                    <span className="truncate">{entry.room}</span>
                  </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  {entry.startTime} – {entry.endTime}
                </p>
              </>
            )}

            <Badge
              className={cn(
                'font-semibold border-0',
                compact ? 'mt-0.5 text-[8px] px-1 py-0 h-4' : 'mt-1.5 text-[9px] sm:text-[10px] px-1.5 py-0 h-5',
                isLab ? 'bg-purple-100 text-purple-700' : theme.badge
              )}
            >
              {entry.sessionType === 'Lab' ? 'Lab' : 'Lecture'}
            </Badge>
          </motion.div>
        );
      })}
    </div>
  );
}

export default TimetableGridCell;
