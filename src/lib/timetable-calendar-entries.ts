import { parseISO } from 'date-fns';
import type { TimetableEntry } from '@/types/timetable';

function refName(v: string | { name?: string; fullName?: string } | undefined) {
  if (!v || typeof v === 'string') return '';
  return v.name || v.fullName || '';
}

export type TimetableCalendarEntry = {
  id: string;
  type: 'timetable';
  title: string;
  subject: string;
  date: Date;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
  sessionType: TimetableEntry['sessionType'];
  source: TimetableEntry;
};

export function parseTimetableDateTime(entry: TimetableEntry): Date {
  const base = parseISO(entry.date.slice(0, 10));
  const [h, m] = (entry.startTime || '00:00').split(':').map((v) => parseInt(v, 10));
  base.setHours(Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return base;
}

export function buildTimetableCalendarEntries(entries: TimetableEntry[]): TimetableCalendarEntry[] {
  return entries
    .filter((e) => e.status !== 'Cancelled')
    .map((entry) => ({
      id: entry._id,
      type: 'timetable' as const,
      title: refName(entry.subjectId) || 'Class',
      subject: refName(entry.subjectId) || 'General',
      date: parseTimetableDateTime(entry),
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      teacher: refName(entry.teacherId),
      sessionType: entry.sessionType,
      source: entry,
    }));
}
