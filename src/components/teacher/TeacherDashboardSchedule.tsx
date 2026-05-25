import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarWidget } from '@/components/teacher/CalendarWidget';
import { TimetableSection } from '@/components/teacher/TimetableSection';
import type { TimetableEntry, UnifiedScheduleEntry } from '@/components/teacher/schedule-types';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import 'react-day-picker/dist/style.css';

export type { TimetableEntry } from '@/components/teacher/schedule-types';

type TeacherDashboardScheduleProps = {
  storageKey?: string;
};

type TeacherRemoteEvent = {
  id?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  eventType?: 'exam' | 'admin_event';
  subject?: string;
  classNumber?: string;
  room?: string;
  description?: string;
};

export function TeacherDashboardSchedule({
  storageKey = 'default',
}: TeacherDashboardScheduleProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [externalEvents, setExternalEvents] = useState<UnifiedScheduleEntry[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<UnifiedScheduleEntry | null>(null);

  const lsKey = useMemo(
    () => `teacher-timetable:${storageKey.replace(/[^a-zA-Z0-9@._-]/g, '_')}`,
    [storageKey]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TimetableEntry[];
        if (Array.isArray(parsed)) setEntries(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [lsKey]);

  useEffect(() => {
    try {
      localStorage.setItem(lsKey, JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }, [entries, lsKey]);

  const dateKey =
    selectedDate && isValid(selectedDate) ? format(selectedDate, 'yyyy-MM-dd') : '';

  const monthKey = useMemo(
    () => format(selectedDate && isValid(selectedDate) ? selectedDate : new Date(), 'yyyy-MM'),
    [selectedDate]
  );

  const normalizeTime = (rawDate: string | Date | undefined, fallback: string) => {
    if (!rawDate) return fallback;
    const parsed = typeof rawDate === 'string' ? parseISO(rawDate) : rawDate;
    if (!isValid(parsed)) return fallback;
    return format(parsed, 'HH:mm');
  };

  const toDateKey = (rawDate: string | Date | undefined) => {
    if (!rawDate) return '';
    const parsed = typeof rawDate === 'string' ? parseISO(rawDate) : rawDate;
    if (!isValid(parsed)) return '';
    return format(parsed, 'yyyy-MM-dd');
  };

  const fetchExternalEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/teacher/calendar/events?month=${monthKey}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        // Older backend instances may not have the teacher calendar endpoint yet.
        setExternalEvents([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load schedule events (${response.status})`);
      }

      const payload = await response.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];

      const mapped: UnifiedScheduleEntry[] = rows.map((row: TeacherRemoteEvent) => {
        const startDateKey = toDateKey(row.startDate);
        const endDateKey = toDateKey(row.endDate) || startDateKey;
        const eventType: UnifiedScheduleEntry['eventType'] =
          row.eventType === 'exam' ? 'exam' : 'admin_event';

        return {
          id: String(row.id || `remote-${Math.random().toString(36).slice(2, 10)}`),
          date: startDateKey,
          endDateKey,
          startTime: normalizeTime(row.startDate, eventType === 'exam' ? '09:00' : '00:00'),
          endTime: normalizeTime(row.endDate, eventType === 'exam' ? '12:00' : '23:59'),
          title: row.title || 'Untitled event',
          room: row.room || '',
          eventType,
          subject: row.subject || '',
          classNumber: row.classNumber || '',
          description: row.description || '',
          removable: false,
        };
      });

      setExternalEvents(mapped);
    } catch (error) {
      console.error('Failed to fetch teacher calendar events:', error);
      toast({
        variant: 'destructive',
        title: 'Calendar sync failed',
        description: 'Could not load exam/admin events. Showing local class schedule only.',
      });
      setExternalEvents([]);
    }
  }, [monthKey, toast]);

  useEffect(() => {
    fetchExternalEvents();
  }, [fetchExternalEvents]);

  const isDateWithinEvent = useCallback(
    (date: Date, entry: UnifiedScheduleEntry) => {
      if (!isValid(date)) return false;
      const start = entry.date;
      const end = entry.endDateKey || entry.date;
      const current = format(date, 'yyyy-MM-dd');
      return current >= start && current <= end;
    },
    []
  );

  const classEntries = useMemo<UnifiedScheduleEntry[]>(
    () =>
      entries.map((entry) => ({
        ...entry,
        eventType: 'class',
        removable: true,
        classNumber: entry.classNumber,
      })),
    [entries]
  );

  const dayEntries = useMemo(
    () =>
      [...classEntries, ...externalEvents]
        .filter((e) => {
          if (e.eventType === 'class') return e.date === dateKey;
          if (!dateKey) return false;
          return dateKey >= e.date && dateKey <= (e.endDateKey || e.date);
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [classEntries, externalEvents, dateKey]
  );

  const scheduleMatcher = useCallback(
    (date: Date) =>
      classEntries.some((e) => e.date === format(date, 'yyyy-MM-dd')) ||
      externalEvents.some((e) => isDateWithinEvent(date, e)),
    [classEntries, externalEvents, isDateWithinEvent]
  );

  const examMatcher = useCallback(
    (date: Date) =>
      externalEvents.some((e) => e.eventType === 'exam' && isDateWithinEvent(date, e)),
    [externalEvents, isDateWithinEvent]
  );

  const adminEventMatcher = useCallback(
    (date: Date) =>
      externalEvents.some((e) => e.eventType === 'admin_event' && isDateWithinEvent(date, e)),
    [externalEvents, isDateWithinEvent]
  );

  const dateLabel =
    dateKey && selectedDate && isValid(selectedDate)
      ? format(selectedDate, 'EEEE, MMM d, yyyy')
      : 'Select a date';

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="w-full space-y-3">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
      <div className="min-w-0 w-full">
        <CalendarWidget
          compact
          selected={selectedDate}
          onSelect={setSelectedDate}
          hasScheduleOnDate={scheduleMatcher}
          hasExamOnDate={examMatcher}
          hasAdminEventOnDate={adminEventMatcher}
        />
      </div>

      <div className="min-w-0 flex w-full flex-col">
        <TimetableSection
          className="h-full min-h-[280px] flex-1"
          dateLabel={dateLabel}
          entries={dayEntries}
          onRemoveSlot={removeEntry}
          onEntryClick={(entry) => {
            setSelectedEntry(entry);
            setDetailsOpen(true);
          }}
        />
      </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.title || 'Event details'}</DialogTitle>
            <DialogDescription>
              {selectedEntry?.eventType === 'exam'
                ? 'Exam details'
                : selectedEntry?.eventType === 'admin_event'
                  ? 'Admin event details'
                  : 'Class details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-900">Time:</span>{' '}
              {selectedEntry?.startTime} - {selectedEntry?.endTime}
            </p>
            {selectedEntry?.subject ? (
              <p>
                <span className="font-semibold text-gray-900">Subject:</span> {selectedEntry.subject}
              </p>
            ) : null}
            {selectedEntry?.classNumber ? (
              <p>
                <span className="font-semibold text-gray-900">Class:</span> {selectedEntry.classNumber}
              </p>
            ) : null}
            {selectedEntry?.room ? (
              <p>
                <span className="font-semibold text-gray-900">Room:</span> {selectedEntry.room}
              </p>
            ) : null}
            {selectedEntry?.description ? (
              <p>
                <span className="font-semibold text-gray-900">Notes:</span> {selectedEntry.description}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
