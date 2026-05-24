import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTimetableEntries, usePatchTimetableStatus } from '@/hooks/useTimetable';
import type { TimetableEntry } from '@/types/timetable';
import { SESSION_TYPE_COLORS, STATUS_COLORS } from '@/types/timetable';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function refName(v: string | { name?: string; fullName?: string } | undefined) {
  if (!v || typeof v === 'string') return '';
  return v.name || v.fullName || '';
}

function classLabel(e: TimetableEntry) {
  if (typeof e.classId === 'object') {
    return `${e.classId.classNumber}-${e.sectionId || e.classId.section || ''}`.replace(/-$/, '');
  }
  return e.sectionId || '—';
}

export default function TeacherTimetableDashboard() {
  const { toast } = useToast();
  const [classFilter, setClassFilter] = useState('all');

  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = format(weekStartDate, 'yyyy-MM-dd');
  const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd');

  const { data: entries = [], isLoading, refetch } = useTimetableEntries({
    startDate: weekStart,
    endDate: weekEnd,
  });
  const patchStatus = usePatchTimetableStatus();

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      const label = classLabel(e);
      if (label && label !== '—') map.set(label, label);
    });
    return Array.from(map.values()).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const list = classFilter === 'all'
      ? entries
      : entries.filter((e) => classLabel(e) === classFilter);
    return [...list].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, [entries, classFilter]);

  const markComplete = async (entry: TimetableEntry) => {
    try {
      await patchStatus.mutateAsync({ id: entry._id, status: 'Completed' });
      toast({ title: 'Marked as completed' });
      refetch();
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-violet-50 via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center shadow-md">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  My Timetable
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Your teaching schedule · {format(weekStartDate, 'MMM d')} – {format(addDays(weekStartDate, 6), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit text-violet-700 border-violet-200 bg-white/80 px-3 py-1">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'session' : 'sessions'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px] rounded-xl bg-white border-violet-200">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No timetable entries this week</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Schedules assigned by your admin will appear here once they add entries in Timetable Management.
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
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Class</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Room</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const entryDate = parseISO(entry.date.slice(0, 10));
                  const isToday = isSameDay(entryDate, new Date());
                  const sessionStyle = SESSION_TYPE_COLORS[entry.sessionType];
                  return (
                    <TableRow
                      key={entry._id}
                      className={cn('transition-colors', isToday && 'bg-violet-50/50 hover:bg-violet-50/50')}
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
                      <TableCell className="font-medium text-gray-900">
                        {refName(entry.subjectId) || '—'}
                      </TableCell>
                      <TableCell className="text-gray-600">{classLabel(entry)}</TableCell>
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
                      <TableCell className="text-right">
                        {entry.status === 'Scheduled' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                            disabled={patchStatus.isPending}
                            onClick={() => markComplete(entry)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Complete
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
