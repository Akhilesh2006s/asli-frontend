import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeeklyTimetableGrid } from '@/components/timetable/WeeklyTimetableGrid';
import { useTimetableEntries, usePatchTimetableStatus } from '@/hooks/useTimetable';
import type { TimetableEntry } from '@/types/timetable';
import { buildWeekdayPlacements, teacherSlotLabel } from '@/lib/student-timetable-utils';
import { useToast } from '@/hooks/use-toast';

export default function TeacherTimetableDashboard() {
  const { toast } = useToast();
  const [classFilter, setClassFilter] = useState('all');

  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });

  /** No date filter — grid uses Mon–Sat pattern from all admin timetable rows for this teacher. */
  const { data: entries = [], isLoading, refetch } = useTimetableEntries({});
  const patchStatus = usePatchTimetableStatus();

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      const label = teacherSlotLabel(e);
      if (label && label !== '—') map.set(label, label);
    });
    return Array.from(map.values()).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (classFilter === 'all') return entries;
    return entries.filter((e) => teacherSlotLabel(e) === classFilter);
  }, [entries, classFilter]);

  const sessionCount = useMemo(
    () => buildWeekdayPlacements(filteredEntries).length,
    [filteredEntries]
  );

  const markComplete = async (entry: TimetableEntry) => {
    if (entry.status !== 'Scheduled') return;
    try {
      await patchStatus.mutateAsync({ id: entry._id, status: 'Completed' });
      toast({ title: 'Marked as completed' });
      refetch();
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  return (
    <Card className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-[#FFF9F2] via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#D3723E] flex items-center justify-center shadow-md">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-[#4A3121] tracking-tight">
                  Timetable
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Monday – Saturday · same weekly pattern ·{' '}
                  {format(weekStartDate, 'MMM d')} – {format(addDays(weekStartDate, 6), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="w-fit text-[#6C5CE7] border-violet-200 bg-[#F0EBFF]/80 px-3 py-1"
            >
              {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
            </Badge>
          </div>

          {classOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[240px] rounded-xl bg-white border-orange-200 text-[#4A3121]">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classOptions.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </motion.div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-orange-50/80 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : sessionCount === 0 ? (
          <div className="text-center py-12 px-4">
            <CalendarDays className="w-10 h-10 text-orange-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No schedule entries this week</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Schedules assigned by your admin will appear here once they add entries in Timetable
              Management.
            </p>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <WeeklyTimetableGrid
              entries={filteredEntries}
              variant="teacher"
              interactive
              onEntryClick={markComplete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
