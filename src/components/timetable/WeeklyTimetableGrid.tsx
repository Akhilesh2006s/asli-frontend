import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { TimetableGridCell } from '@/components/student/timetable/TimetableGridCell';
import type { TimetableEntry } from '@/types/timetable';
import type { WeekdayIndex } from '@/lib/student-timetable-utils';
import {
  WEEKDAY_LABELS,
  buildWeekdayPlacements,
  dateForWeekdayIndex,
  formatHourLabel,
  getCellEntries,
  getTimeSlotsForEntries,
  todayWeekdayIndex,
} from '@/lib/student-timetable-utils';
import { cn } from '@/lib/utils';

function formatSlotRange(hour: number): string {
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  return `${start} – ${end}`;
}

export type WeeklyTimetableGridProps = {
  entries: TimetableEntry[];
  variant?: 'admin' | 'student' | 'teacher';
  interactive?: boolean;
  onEntryClick?: (entry: TimetableEntry) => void;
  onEmptyClick?: (dayIndex: WeekdayIndex, hour: number) => void;
  className?: string;
};

const themes = {
  admin: {
    shell: 'border-orange-200/80 bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20',
    header: 'bg-gradient-to-r from-orange-600 to-amber-500 text-white',
    headerCorner: 'bg-orange-700/90',
    timeCol: 'bg-orange-50/80 border-orange-100 text-orange-900',
    timeColAlt: 'bg-white/90 border-orange-50',
    dayCol: 'bg-slate-50/95 border-orange-100',
    dayColToday: 'bg-gradient-to-r from-orange-100 to-amber-50 border-orange-300',
    todayBadge: 'bg-orange-600 text-white',
    todayText: 'text-orange-800',
    timelineLine: 'bg-orange-300',
    timelineDot: 'bg-orange-500 ring-orange-200',
    todayAccent: 'from-orange-500 to-amber-400',
    rowHover: 'hover:bg-orange-50/30',
  },
  student: {
    shell: 'border-indigo-100 bg-gradient-to-br from-sky-50/40 via-white to-indigo-50/30',
    header: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white',
    headerCorner: 'bg-indigo-700/90',
    timeCol: 'bg-sky-50/80 border-sky-100 text-sky-900',
    timeColAlt: 'bg-white/90 border-sky-50',
    dayCol: 'bg-slate-50/95 border-indigo-100',
    dayColToday: 'bg-gradient-to-r from-sky-100 to-indigo-50 border-sky-300',
    todayBadge: 'bg-sky-600 text-white',
    todayText: 'text-sky-800',
    timelineLine: 'bg-sky-300',
    timelineDot: 'bg-sky-500 ring-sky-200',
    todayAccent: 'from-sky-500 to-indigo-400',
    rowHover: 'hover:bg-sky-50/30',
  },
  teacher: {
    shell: 'border-orange-200/70 bg-white',
    header: 'bg-[#D3723E] text-white',
    headerCorner: 'bg-[#B85F34] text-white border-white/15',
    timeCol: 'bg-white border-gray-100/80',
    timeColAlt: 'bg-white border-gray-100/80',
    dayCol: 'bg-[#FFF9F2] border-orange-100/60 text-[#4A3121]',
    dayColToday: 'bg-[#FFF0E6] border-orange-200/80',
    todayBadge: 'bg-[#D3723E] text-white',
    todayText: 'text-[#4A3121]',
    timelineLine: 'bg-white/35',
    timelineDot: 'bg-white ring-white/50',
    todayAccent: 'from-[#D3723E] to-[#E8936A]',
    rowHover: 'hover:bg-orange-50/25',
  },
};

export function WeeklyTimetableGrid({
  entries,
  variant = 'student',
  interactive = false,
  onEntryClick,
  onEmptyClick,
  className,
}: WeeklyTimetableGridProps) {
  const t = themes[variant] ?? themes.student;
  const labelMode = variant === 'teacher' ? 'teacher' : 'subject';
  const placements = buildWeekdayPlacements(entries);
  const timeSlots = getTimeSlotsForEntries();
  const now = new Date();
  const todayIdx = todayWeekdayIndex(now);
  const dayColWidth = 96;
  const timeColMin = 92;
  const useBoundedScroll = variant === 'admin';

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm overflow-hidden',
        t.shell,
        className
      )}
    >
      <div
        className={cn(
          'scroll-smooth',
          useBoundedScroll
            ? 'max-h-[min(32rem,75vh)] overflow-auto overscroll-auto'
            : 'overflow-x-auto overflow-y-clip overscroll-x-contain'
        )}
        aria-label="Weekly timetable grid"
      >
        <div style={{ minWidth: `${dayColWidth + timeSlots.length * timeColMin}px` }}>
          <div
            className="grid sticky top-0 z-20 shadow-md"
            style={{
              gridTemplateColumns: `${dayColWidth}px repeat(${timeSlots.length}, minmax(${timeColMin}px, 1fr))`,
            }}
          >
            <div
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-3 border-r border-white/20 sticky left-0 z-30',
                t.headerCorner
              )}
            >
              <Clock className="w-3.5 h-3.5 text-white/90 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/95">Time</span>
            </div>
            {timeSlots.map((hour, i) => (
              <div
                key={hour}
                className={cn(
                  'relative px-2 py-2.5 border-r border-white/15 last:border-r-0 text-center',
                  t.header
                )}
              >
                {i > 0 && (
                  <span
                    className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 opacity-40', t.timelineLine)}
                    aria-hidden
                  />
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <span className={cn('w-2 h-2 rounded-full ring-2 ring-white/40 shrink-0', t.timelineDot)} />
                  <span className="text-xs sm:text-sm font-bold leading-none">{formatHourLabel(hour)}</span>
                  <span className="text-[9px] font-medium text-white/80 tabular-nums">{formatSlotRange(hour)}</span>
                </div>
              </div>
            ))}
          </div>

          {WEEKDAY_LABELS.map((label, dayIndex) => {
            const isToday = todayIdx === dayIndex;
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dayIndex * 0.04 }}
                className={cn('grid items-center border-b border-gray-100/80 last:border-b-0', t.rowHover)}
                style={{
                  gridTemplateColumns: `${dayColWidth}px repeat(${timeSlots.length}, minmax(${timeColMin}px, 1fr))`,
                }}
              >
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 border-r sticky left-0 z-10 self-stretch min-h-[52px]',
                    isToday ? t.dayColToday : t.dayCol
                  )}
                >
                  {isToday && (
                    <span
                      className={cn(
                        'absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-gradient-to-b',
                        t.todayAccent
                      )}
                      aria-hidden
                    />
                  )}
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center leading-tight whitespace-nowrap',
                      isToday ? t.todayText : 'text-gray-800'
                    )}
                  >
                    {label}
                  </p>
                  {isToday && (
                    <span
                      className={cn(
                        'text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                        t.todayBadge
                      )}
                    >
                      Today
                    </span>
                  )}
                </div>

                {timeSlots.map((hour, colIdx) => {
                  const cellEntries = getCellEntries(
                    placements,
                    dayIndex as WeekdayIndex,
                    hour
                  );
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={cn(
                        'flex items-center p-1.5 border-r border-gray-100/60 last:border-r-0 min-h-[52px]',
                        colIdx % 2 === 0 ? t.timeColAlt : 'bg-white/50'
                      )}
                    >
                      <div className="w-full">
                        <TimetableGridCell
                          entries={cellEntries}
                          now={now}
                          compact
                          labelMode={labelMode}
                          interactive={interactive}
                          onEntryClick={onEntryClick}
                          onEmptyClick={
                            interactive && onEmptyClick
                              ? () => onEmptyClick(dayIndex as WeekdayIndex, hour)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-gray-100/80 bg-white/60 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', t.timelineDot)} />
          Monday – Saturday · same weekly pattern
        </span>
        {interactive && variant !== 'teacher' && (
          <span>Click empty slot to add · click class to edit</span>
        )}
        {variant === 'teacher' && onEntryClick && (
          <span>Click a class to mark as completed</span>
        )}
      </div>
    </div>
  );
}

export default WeeklyTimetableGrid;
