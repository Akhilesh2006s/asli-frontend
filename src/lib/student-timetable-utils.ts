import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import type { TimetableEntry } from '@/types/timetable';

export const TIMETABLE_HOUR_START = 9;
/** Last hour column label (5 PM slot = 17:00–18:00). */
export const TIMETABLE_HOUR_END = 17;

export const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface SubjectTheme {
  bg: string;
  border: string;
  text: string;
  badge: string;
  dot: string;
  gradient: string;
}

export interface GridPlacement {
  entry: TimetableEntry;
  dayIndex: WeekdayIndex;
  slotHour: number;
}

export function refName(v: string | { name?: string; fullName?: string } | undefined): string {
  if (!v || typeof v === 'string') return '';
  return v.name || v.fullName || '';
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHourLabel(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export function getTimeSlots(): number[] {
  const slots: number[] = [];
  for (let h = TIMETABLE_HOUR_START; h <= TIMETABLE_HOUR_END; h += 1) slots.push(h);
  return slots;
}

/** Full school day grid: always 9 AM through 5 PM (not trimmed to last class). */
export function getTimeSlotsForEntries(_entries?: TimetableEntry[]): number[] {
  return getTimeSlots();
}

/** Subject-based colors for class blocks */
export function getSubjectTheme(subject: string): SubjectTheme {
  const s = subject.toLowerCase();
  if (s.includes('physics')) {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-500',
      gradient: 'from-blue-500/10 to-blue-600/5',
    };
  }
  if (s.includes('biology') || s.includes('bio')) {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
      gradient: 'from-emerald-500/10 to-emerald-600/5',
    };
  }
  if (s.includes('english') || s.includes('eng')) {
    return {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-900',
      badge: 'bg-violet-100 text-violet-700',
      dot: 'bg-violet-500',
      gradient: 'from-violet-500/10 to-violet-600/5',
    };
  }
  if (s.includes('math') || s.includes('mathematics')) {
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-700',
      dot: 'bg-orange-500',
      gradient: 'from-orange-500/10 to-orange-600/5',
    };
  }
  if (s.includes('chemistry') || s.includes('chem')) {
    return {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-900',
      badge: 'bg-pink-100 text-pink-700',
      dot: 'bg-pink-500',
      gradient: 'from-pink-500/10 to-pink-600/5',
    };
  }
  return {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
  };
}

/** Hex color for timetable colorTag — matches subject theme on the grid. */
export function colorTagForSubject(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('physics')) return '#3B82F6';
  if (s.includes('biology') || s.includes('bio')) return '#22C55E';
  if (s.includes('english') || s.includes('eng')) return '#8B5CF6';
  if (s.includes('math') || s.includes('mathematics')) return '#F97316';
  if (s.includes('chemistry') || s.includes('chem')) return '#EC4899';
  return '#6366F1';
}

export function entryAccentStyle(colorTag?: string): { backgroundColor: string; borderColor: string } | undefined {
  if (!colorTag) return undefined;
  return {
    backgroundColor: `${colorTag}18`,
    borderColor: colorTag,
  };
}

/** Normalize API date (UTC midnight) to yyyy-MM-dd without timezone shift. */
export function entryDateKey(entry: TimetableEntry): string {
  const raw = entry.date;
  if (typeof raw === 'string') return raw.slice(0, 10);
  return format(new Date(raw), 'yyyy-MM-dd');
}

export function isEntryInWeek(entry: TimetableEntry, weekStart: Date): boolean {
  const d = entryDateKey(entry);
  const start = format(weekStart, 'yyyy-MM-dd');
  const end = format(addDays(weekStart, 5), 'yyyy-MM-dd');
  return d >= start && d <= end;
}

/** Map entry to Mon(0)…Sat(5) — same grid every week, no calendar dates. */
export function entryWeekdayIndex(entry: TimetableEntry): WeekdayIndex | null {
  const day = (entry.day || '').trim().toLowerCase();
  if (day.startsWith('mon')) return 0;
  if (day.startsWith('tue')) return 1;
  if (day.startsWith('wed')) return 2;
  if (day.startsWith('thu')) return 3;
  if (day.startsWith('fri')) return 4;
  if (day.startsWith('sat')) return 5;

  const dow = parseISO(entryDateKey(entry)).getDay();
  if (dow >= 1 && dow <= 6) return (dow - 1) as WeekdayIndex;
  return null;
}

export function todayWeekdayIndex(now = new Date()): WeekdayIndex | null {
  const dow = now.getDay();
  if (dow >= 1 && dow <= 6) return (dow - 1) as WeekdayIndex;
  return null;
}

/** Date for add-entry form: upcoming occurrence of Mon–Sat. */
export function dateForWeekdayIndex(dayIndex: WeekdayIndex, ref = new Date()): Date {
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
  return addDays(weekStart, dayIndex);
}

export function getSlotHour(startTime: string): number | null {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (Number.isNaN(hour) || hour < TIMETABLE_HOUR_START || hour > TIMETABLE_HOUR_END) return null;
  return hour;
}

/** Weekly template: group by day-of-week + time (not by calendar week). */
export function buildWeekdayPlacements(entries: TimetableEntry[]): GridPlacement[] {
  const seen = new Set<string>();
  const placements: GridPlacement[] = [];
  for (const entry of entries) {
    const dayIndex = entryWeekdayIndex(entry);
    const slotHour = getSlotHour(entry.startTime);
    if (dayIndex === null || slotHour === null) continue;
    const dedupeKey = `${dayIndex}-${slotHour}-${entry.startTime}-${refName(entry.subjectId)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    placements.push({ entry, dayIndex, slotHour });
  }
  return placements;
}

export function getCellEntries(placements: GridPlacement[], dayIndex: WeekdayIndex, slotHour: number) {
  return placements.filter((p) => p.dayIndex === dayIndex && p.slotHour === slotHour).map((p) => p.entry);
}

export function isEntryOngoing(entry: TimetableEntry, now: Date): boolean {
  if (entry.status === 'Cancelled' || entry.status === 'Completed') return false;
  const today = todayWeekdayIndex(now);
  const entryDay = entryWeekdayIndex(entry);
  if (today === null || entryDay !== today) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(entry.startTime);
  const end = parseTimeToMinutes(entry.endTime);
  return mins >= start && mins < end;
}

export function getNextClass(entries: TimetableEntry[], now: Date): TimetableEntry | null {
  const upcoming = entries
    .filter((e) => e.status === 'Scheduled')
    .map((e) => {
      const d = parseISO(entryDateKey(e));
      const start = new Date(d);
      const [h, m] = e.startTime.split(':').map(Number);
      start.setHours(h || 0, m || 0, 0, 0);
      return { entry: e, start };
    })
    .filter(({ start }) => start.getTime() > now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return upcoming[0]?.entry ?? null;
}

export function getTodaysClasses(entries: TimetableEntry[], now: Date): TimetableEntry[] {
  return entries
    .filter((e) => isSameDay(parseISO(entryDateKey(e)), now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getAttendanceSummary(entries: TimetableEntry[]) {
  const required = entries.filter((e) => e.attendanceRequired && e.status !== 'Cancelled');
  const completed = required.filter((e) => e.status === 'Completed');
  const pct = required.length ? Math.round((completed.length / required.length) * 100) : 0;
  return { required: required.length, completed: completed.length, pct };
}

export function getWeekStart(anchor?: Date): Date {
  return startOfWeek(anchor ?? new Date(), { weekStartsOn: 1 });
}

export function getWeekDates(weekStart: Date): Date[] {
  return WEEKDAY_LABELS.map((_, i) => addDays(weekStart, i));
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 5);
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}
