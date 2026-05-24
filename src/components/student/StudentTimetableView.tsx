import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, subWeeks, addWeeks, parseISO, isSameDay } from 'date-fns';
import { CalendarDays, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTimetableEntries } from '@/hooks/useTimetable';
import type { TimetableEntry } from '@/types/timetable';
import { SESSION_TYPE_COLORS, STATUS_COLORS } from '@/types/timetable';
import { cn } from '@/lib/utils';

function refName(v: string | { name?: string; fullName?: string } | undefined) {
  if (!v || typeof v === 'string') return '';
  return v.name || v.fullName || '';
}

type Props = {
  entries?: TimetableEntry[];
  isLoading?: boolean;
  selectedDate?: Date;
  /** Monday of the week to display; defaults to current week */
  weekAnchor?: Date;
  onWeekChange?: (weekStart: Date) => void;
};

export default function StudentTimetableView({
  entries: entriesProp,
  isLoading: isLoadingProp,
  selectedDate,
  weekAnchor,
  onWeekChange,
}: Props) {
  const weekStartDate = startOfWeek(weekAnchor ?? new Date(), { weekStartsOn: 1 });
  const weekEndDate = addDays(weekStartDate, 6);
  const weekStart = format(weekStartDate, 'yyyy-MM-dd');
  const weekEnd = format(weekEndDate, 'yyyy-MM-dd');

  const { data: fetchedEntries = [], isLoading: fetchLoading } = useTimetableEntries(
    { startDate: weekStart, endDate: weekEnd },
    { enabled: !entriesProp }
  );

  const rawEntries = entriesProp ?? fetchedEntries;
  const isLoading = isLoadingProp ?? (entriesProp ? false : fetchLoading);
  const activeDay = selectedDate ?? new Date();

  const weekEntries = useMemo(() => {
    return rawEntries.filter((entry) => {
      const d = parseISO(entry.date.slice(0, 10));
      return d >= weekStartDate && d <= weekEndDate;
    });
  }, [rawEntries, weekStartDate, weekEndDate]);

  const sortedEntries = useMemo(
    () => [...weekEntries].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [weekEntries]
  );

  const goPrevWeek = () => onWeekChange?.(subWeeks(weekStartDate, 1));
  const goNextWeek = () => onWeekChange?.(addWeeks(weekStartDate, 1));

  return (
    <Card className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-sky-50 via-white to-indigo-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center shadow-md"
            >
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Class Timetable
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Your weekly class schedule · {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onWeekChange && (
              <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goPrevWeek} aria-label="Previous week">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goNextWeek} aria-label="Next week">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Badge variant="outline" className="w-fit text-sky-700 border-sky-200 bg-white/80 px-3 py-1">
              {sortedEntries.length} {sortedEntries.length === 1 ? 'session' : 'sessions'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No class timetable this week</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Schedules added by your admin will appear here. Use the Study Calendar above for exams and study tasks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Day</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Time</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Subject</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Teacher</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Room</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => {
                  const entryDate = parseISO(entry.date.slice(0, 10));
                  const isHighlighted = isSameDay(entryDate, activeDay);
                  const sessionStyle = SESSION_TYPE_COLORS[entry.sessionType];
                  return (
                    <TableRow
                      key={entry._id}
                      className={cn(
                        'transition-colors',
                        isHighlighted && 'bg-sky-50/70 hover:bg-sky-50/70'
                      )}
                    >
                      <TableCell className="whitespace-nowrap font-medium text-gray-900">
                        {format(entryDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {entry.day || format(entryDate, 'EEEE')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-800">
                        {entry.startTime} – {entry.endTime}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 uppercase tracking-wide">
                        {refName(entry.subjectId) || '—'}
                      </TableCell>
                      <TableCell className="text-gray-600 uppercase text-xs sm:text-sm">
                        {refName(entry.teacherId) || '—'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {entry.room ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            {entry.room}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-medium', sessionStyle.bg, sessionStyle.text, sessionStyle.border, 'border')}>
                          {entry.sessionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-medium', STATUS_COLORS[entry.status])}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
