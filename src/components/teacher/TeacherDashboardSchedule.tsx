import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarWidget } from '@/components/teacher/CalendarWidget';
import { TimetableSection } from '@/components/teacher/TimetableSection';
import type { TimetableEntry } from '@/components/teacher/schedule-types';
import 'react-day-picker/dist/style.css';

export type { TimetableEntry } from '@/components/teacher/schedule-types';

type TeacherDashboardScheduleProps = {
  storageKey?: string;
};

export function TeacherDashboardSchedule({
  storageKey = 'default',
}: TeacherDashboardScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
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

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date === dateKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [entries, dateKey]
  );

  const scheduleMatcher = useCallback(
    (date: Date) => entries.some((e) => e.date === format(date, 'yyyy-MM-dd')),
    [entries]
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
        <CalendarWidget
          selected={selectedDate}
          onSelect={setSelectedDate}
          hasScheduleOnDate={scheduleMatcher}
        />
      </div>

      <div className="min-w-0">
        <TimetableSection
          dateLabel={dateLabel}
          entries={dayEntries}
          onAddSlot={openAdd}
          onRemoveSlot={removeEntry}
          canAdd={Boolean(dateKey)}
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
    </div>
  );
}
