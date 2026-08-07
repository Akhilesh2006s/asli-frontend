import { motion } from 'framer-motion';
import { Clock, Coffee } from 'lucide-react';
import { TimetableGridCell } from '@/components/student/timetable/TimetableGridCell';
import type { TimetableEntry } from '@/types/timetable';
import type { WeekdayIndex } from '@/lib/student-timetable-utils';
import {
  WEEKDAY_LABELS,
  buildWeekdayPlacements,
  formatHourLabel,
  getCellEntries,
  getEntriesForPeriod,
  getScheduleColumns,
  getTimeSlotsForEntries,
  isBreakEntry,
  shouldUsePeriodColumns,
  todayWeekdayIndex,
} from '@/lib/student-timetable-utils';
import { cn } from '@/lib/utils';

function formatSlotRange(hour: number): string {
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour + 1).padStart(2, '0')}:00`;
  return `${start} – ${end}`;
}

function formatPeriodRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

export type WeeklyTimetableGridProps = {
  entries: TimetableEntry[];
  variant?: 'admin' | 'student' | 'teacher';
  interactive?: boolean;
  onEntryClick?: (entry: TimetableEntry) => void;
  onEmptyClick?: (dayIndex: WeekdayIndex, hourOrStart: number | string) => void;
  className?: string;
  /** When true, show class code on each card (multi-class dumps). */
  showClassOnCard?: boolean;
};

const themes = {
  admin: {
    shell: 'border-orange-200/80 bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20',
    header: 'bg-gradient-to-r from-orange-600 to-amber-500 text-white',
    headerCorner: 'bg-orange-700/90',
    headerBreak: 'bg-gradient-to-r from-stone-500 to-stone-400 text-white',
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
    headerBreak: 'bg-gradient-to-r from-stone-500 to-stone-400 text-white',
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
    headerBreak: 'bg-[#8B7355] text-white',
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

function BreakCell({ label, startTime, endTime }: { label: string; startTime: string; endTime: string }) {
  return (
    <div className="h-full min-h-[56px] w-full rounded-lg border border-dashed border-stone-300 bg-stone-100/80 flex flex-col items-center justify-center gap-0.5 px-1 py-2">
      <Coffee className="w-3.5 h-3.5 text-stone-500" />
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-700 text-center leading-tight">
        {label}
      </p>
      <p className="text-[9px] tabular-nums text-stone-500 leading-tight">
        {startTime}–{endTime}
      </p>
    </div>
  );
}

export function WeeklyTimetableGrid({
  entries,
  variant = 'student',
  interactive = false,
  onEntryClick,
  onEmptyClick,
  className,
  showClassOnCard = false,
}: WeeklyTimetableGridProps) {
  const t = themes[variant] ?? themes.student;
  const labelMode = variant === 'teacher' ? 'teacher' : showClassOnCard ? 'admin' : 'subject';
  const now = new Date();
  const todayIdx = todayWeekdayIndex(now);
  const usePeriods = variant === 'admin' || shouldUsePeriodColumns(entries);
  const scheduleCols = usePeriods ? getScheduleColumns(entries) : [];
  const usePeriodLayout = scheduleCols.length > 0;
  const timeSlots = usePeriodLayout ? [] : getTimeSlotsForEntries();
  const placements = usePeriodLayout ? [] : buildWeekdayPlacements(entries);

  const dayColWidth = usePeriodLayout ? 84 : 96;
  const colMin = usePeriodLayout ? 100 : 92;
  const colCount = usePeriodLayout ? scheduleCols.length : timeSlots.length;

  let periodNumber = 0;

  return (
    <div className={cn('rounded-2xl border shadow-sm overflow-hidden', t.shell, className)}>
      <div className="overflow-x-auto scroll-smooth" aria-label="Weekly timetable grid">
        <div style={{ minWidth: `${dayColWidth + Math.max(colCount, 1) * colMin}px` }}>
          <div
            className="grid sticky top-0 z-20 shadow-md"
            style={{
              gridTemplateColumns: `${dayColWidth}px repeat(${Math.max(colCount, 1)}, minmax(${colMin}px, 1fr))`,
            }}
          >
            <div
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-3 border-r border-white/20 sticky left-0 z-30',
                t.headerCorner,
              )}
            >
              <Clock className="w-3.5 h-3.5 text-white/90 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/95">
                {usePeriodLayout ? 'Period' : 'Time'}
              </span>
            </div>
            {usePeriodLayout
              ? scheduleCols.map((col) => {
                  const isBreak = col.kind === 'break';
                  if (!isBreak) periodNumber += 1;
                  const pLabel = isBreak ? col.label || 'Break' : `P${periodNumber}`;
                  return (
                    <div
                      key={col.key}
                      className={cn(
                        'relative px-1.5 py-2 border-r border-white/15 last:border-r-0 text-center',
                        isBreak ? t.headerBreak : t.header,
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/95">
                          {pLabel}
                        </span>
                        <span className="text-xs font-bold leading-tight tabular-nums">{col.startTime}</span>
                        <span className="text-[9px] font-medium text-white/85 tabular-nums leading-tight">
                          {formatPeriodRange(col.startTime, col.endTime)}
                        </span>
                      </div>
                    </div>
                  );
                })
              : timeSlots.map((hour, i) => (
                  <div
                    key={hour}
                    className={cn(
                      'relative px-2 py-2.5 border-r border-white/15 last:border-r-0 text-center',
                      t.header,
                    )}
                  >
                    {i > 0 && (
                      <span
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 opacity-40',
                          t.timelineLine,
                        )}
                        aria-hidden
                      />
                    )}
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn('w-2 h-2 rounded-full ring-2 ring-white/40 shrink-0', t.timelineDot)}
                      />
                      <span className="text-xs sm:text-sm font-bold leading-none">
                        {formatHourLabel(hour)}
                      </span>
                      <span className="text-[9px] font-medium text-white/80 tabular-nums">
                        {formatSlotRange(hour)}
                      </span>
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
                transition={{ delay: dayIndex * 0.03 }}
                className={cn('grid items-stretch border-b border-gray-100/80 last:border-b-0', t.rowHover)}
                style={{
                  gridTemplateColumns: `${dayColWidth}px repeat(${Math.max(colCount, 1)}, minmax(${colMin}px, 1fr))`,
                }}
              >
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 border-r sticky left-0 z-10 self-stretch min-h-[64px]',
                    isToday ? t.dayColToday : t.dayCol,
                  )}
                >
                  {isToday && (
                    <span
                      className={cn(
                        'absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-gradient-to-b',
                        t.todayAccent,
                      )}
                      aria-hidden
                    />
                  )}
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center leading-tight',
                      isToday ? t.todayText : 'text-gray-800',
                    )}
                  >
                    {label.slice(0, 3)}
                  </p>
                  {isToday && (
                    <span
                      className={cn(
                        'text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                        t.todayBadge,
                      )}
                    >
                      Today
                    </span>
                  )}
                </div>

                {usePeriodLayout
                  ? scheduleCols.map((col, colIdx) => {
                      const isBreakCol = col.kind === 'break';
                      const cellEntries = col.inferred
                        ? []
                        : getEntriesForPeriod(entries, dayIndex as WeekdayIndex, col.startTime).filter(
                            (e) => (isBreakCol ? isBreakEntry(e) : !isBreakEntry(e)),
                          );
                      // If stored break and teaching share unlikely same start, prefer matching kind
                      const allAtStart = col.inferred
                        ? []
                        : getEntriesForPeriod(entries, dayIndex as WeekdayIndex, col.startTime);
                      const displayEntries =
                        cellEntries.length > 0
                          ? cellEntries
                          : !isBreakCol
                            ? allAtStart.filter((e) => !isBreakEntry(e))
                            : allAtStart.filter((e) => isBreakEntry(e));

                      return (
                        <div
                          key={`${dayIndex}-${col.key}`}
                          className={cn(
                            'flex items-stretch p-1 border-r border-gray-100/60 last:border-r-0 min-h-[64px]',
                            isBreakCol
                              ? 'bg-stone-50/90'
                              : colIdx % 2 === 0
                                ? t.timeColAlt
                                : 'bg-white/50',
                          )}
                        >
                          <div className="w-full">
                            {isBreakCol && (col.inferred || displayEntries.length === 0) ? (
                              <BreakCell
                                label={col.label || 'Break'}
                                startTime={col.startTime}
                                endTime={col.endTime}
                              />
                            ) : isBreakCol ? (
                              <BreakCell
                                label={col.label || 'Break'}
                                startTime={col.startTime}
                                endTime={col.endTime}
                              />
                            ) : (
                              <TimetableGridCell
                                entries={displayEntries}
                                now={now}
                                compact
                                dense
                                labelMode={labelMode}
                                interactive={interactive}
                                onEntryClick={onEntryClick}
                                onEmptyClick={
                                  interactive && onEmptyClick
                                    ? () => onEmptyClick(dayIndex as WeekdayIndex, col.startTime)
                                    : undefined
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  : timeSlots.map((hour, colIdx) => {
                      const cellEntries = getCellEntries(
                        placements,
                        dayIndex as WeekdayIndex,
                        hour,
                      );
                      return (
                        <div
                          key={`${dayIndex}-${hour}`}
                          className={cn(
                            'flex items-center p-1.5 border-r border-gray-100/60 last:border-r-0 min-h-[64px]',
                            colIdx % 2 === 0 ? t.timeColAlt : 'bg-white/50',
                          )}
                        >
                          <div className="w-full">
                            <TimetableGridCell
                              entries={cellEntries}
                              now={now}
                              compact
                              dense
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
          Monday – Saturday
          {usePeriodLayout ? ' · periods + breaks' : ' · hourly slots'}
        </span>
        {interactive && variant !== 'teacher' && (
          <span>Click a class to edit · use Edit period times to change bells</span>
        )}
      </div>
    </div>
  );
}

export default WeeklyTimetableGrid;
