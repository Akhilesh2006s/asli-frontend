import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formRoom, setFormRoom] = useState('');

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

  const addEntry = () => {
    if (!dateKey || !formTitle.trim()) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setEntries((prev) => [
      ...prev,
      {
        id,
        date: dateKey,
        startTime: formStart,
        endTime: formEnd,
        title: formTitle.trim(),
        room: formRoom.trim() || undefined,
      },
    ]);
    setDialogOpen(false);
    setFormTitle('');
    setFormRoom('');
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const openAdd = () => {
    if (!dateKey) return;
    setFormTitle('');
    setFormRoom('');
    setFormStart('09:00');
    setFormEnd('10:00');
    setDialogOpen(true);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-start lg:gap-4 xl:gap-5">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legend</span>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Class (blue)
          </span>
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            Exam (red)
          </span>
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
            Admin Event (purple)
          </span>
        </div>
        <CalendarWidget
          selected={selectedDate}
          onSelect={setSelectedDate}
          hasScheduleOnDate={scheduleMatcher}
          hasExamOnDate={examMatcher}
          hasAdminEventOnDate={adminEventMatcher}
        />
      </div>

      <div className="min-w-0">
        <TimetableSection
          dateLabel={dateLabel}
          entries={dayEntries}
          onAddSlot={openAdd}
          onRemoveSlot={removeEntry}
          canAdd={Boolean(dateKey)}
          onEntryClick={(entry) => {
            setSelectedEntry(entry);
            setDetailsOpen(true);
          }}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add timetable slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Date:{' '}
              <span className="font-medium text-gray-900">
                {dateKey && selectedDate && isValid(selectedDate)
                  ? format(selectedDate, 'MMMM d, yyyy')
                  : '—'}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="tt-title">Class / title</Label>
              <Input
                id="tt-title"
                placeholder="e.g. Maths 7C · Period 2"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tt-start">Start</Label>
                <Input
                  id="tt-start"
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tt-end">End</Label>
                <Input
                  id="tt-end"
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-room">Room (optional)</Label>
              <Input
                id="tt-room"
                placeholder="e.g. Room 7C"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addEntry}
              disabled={!formTitle.trim()}
              className="rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700"
            >
              Save slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="space-y-2 text-sm text-gray-700">
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
