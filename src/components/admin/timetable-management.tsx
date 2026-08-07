import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAuthToken } from '@/lib/auth-utils';
import {
  format, startOfWeek, eachDayOfInterval, addWeeks, subWeeks,
  addDays, isSameDay, parseISO, isValid,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Upload, Download, Trash2,
  CalendarDays, AlertTriangle, FileSpreadsheet, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import {
  useTimetableEntries, useCreateTimetable, useUpdateTimetable,
  useDeleteTimetable, useBulkDeleteTimetable, useBulkDeleteTimetableGroup,
  useImportTimetableCSV, useRemapPeriodTimes,
  downloadTimetableTemplate, exportTimetableCSV,
} from '@/hooks/useTimetable';
import type { TimetableEntry, TimetableFilters, SessionType } from '@/types/timetable';
import { SESSION_TYPE_COLORS, STATUS_COLORS, COLOR_PRESETS } from '@/types/timetable';
import { cn } from '@/lib/utils';
import { WeeklyTimetableGrid } from '@/components/timetable/WeeklyTimetableGrid';
import { colorTagForSubject, dateForWeekdayIndex, getPeriodColumnsFromEntries, getWeekDates, type WeekdayIndex } from '@/lib/student-timetable-utils';

const FORM_INPUT =
  'rounded-xl border-orange-200 bg-white min-w-0 w-full h-10 text-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-0 focus-visible:border-orange-500 selection:bg-orange-200 selection:text-orange-950';
const FORM_SELECT_TRIGGER =
  'rounded-xl border-orange-200 bg-white w-full min-w-0 h-10 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 focus:border-orange-500';

type ViewMode = 'week' | 'teacher' | 'class' | 'room';

const VIEW_MODES: ViewMode[] = ['week', 'teacher', 'class', 'room'];

function viewLabel(v: ViewMode): string {
  if (v === 'teacher') return 'Teacher View';
  if (v === 'class') return 'Class View';
  if (v === 'room') return 'Room View';
  return 'Week Schedule';
}

const SESSION_TYPES: SessionType[] = ['Lecture', 'Lab', 'Exam', 'Workshop', 'Activity', 'Holiday', 'Special Class'];

function refId(v: string | { _id?: string } | undefined): string {
  if (!v) return '';
  return typeof v === 'string' ? v : v._id || '';
}

function refName(v: string | { name?: string; fullName?: string } | undefined, fallback = ''): string {
  if (!v || typeof v === 'string') return fallback;
  return v.name || v.fullName || fallback;
}

function entityId(value: { _id?: string; id?: string } | string | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const id = value._id ?? value.id;
  return id != null ? String(id) : '';
}

type ClassOption = {
  _id: string;
  classNumber: string;
  section: string;
  assignedSubjects?: Array<{ _id: string; name: string }>;
};

function normalizeClassOptions(raw: unknown): ClassOption[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        _id: entityId(record as { _id?: string; id?: string }),
        classNumber: String(record.classNumber ?? ''),
        section: String(record.section ?? ''),
        assignedSubjects: Array.isArray(record.assignedSubjects)
          ? (record.assignedSubjects as Array<Record<string, unknown>>).map((s) => ({
              _id: entityId(s as { _id?: string; id?: string }),
              name: String(s.name ?? ''),
            }))
          : undefined,
      };
    })
    .filter((c) => c._id);
}

function normalizeSubjectOptions(raw: unknown): Array<{ _id: string; name: string }> {
  const rows = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data || (raw as { subjects?: unknown[] })?.subjects || [];
  return (Array.isArray(rows) ? rows : [])
    .map((s) => {
      const record = s as { _id?: string; id?: string; name?: string };
      return {
        _id: entityId(record),
        name: String(record.name ?? '').trim(),
      };
    })
    .filter((s) => s._id && s.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function entryClasses(entry: TimetableEntry) {
  const c = SESSION_TYPE_COLORS[entry.sessionType] || SESSION_TYPE_COLORS.Lecture;
  return `${c.bg} ${c.text} ${c.border} border`;
}

const emptyForm = (): {
  date: string;
  startTime: string;
  endTime: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  room: string;
  building: string;
  repeatRule: 'none' | 'daily' | 'weekly' | 'monthly';
  effectiveFrom: string;
  effectiveTo: string;
  sessionType: SessionType;
  attendanceRequired: boolean;
  expectedStudents: string;
  capacity: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  priority: number;
  notes: string;
  colorTag: string;
  attachment: string;
} => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  classId: '',
  sectionId: '',
  subjectId: '',
  teacherId: '',
  room: '',
  building: '',
  repeatRule: 'none' as const,
  effectiveFrom: '',
  effectiveTo: '',
  sessionType: 'Lecture' as SessionType,
  attendanceRequired: true,
  expectedStudents: '',
  capacity: '',
  status: 'Scheduled' as const,
  priority: 0,
  notes: '',
  colorTag: COLOR_PRESETS[0],
  attachment: '',
});

export default function TimetableManagement() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<TimetableFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [conflictDialog, setConflictDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; reason: string; status?: string }>>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<Array<{ _id: string; fullName: string; email: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [periodsEditOpen, setPeriodsEditOpen] = useState(false);
  const [periodDrafts, setPeriodDrafts] = useState<
    Array<{ key: string; fromStart: string; startTime: string; endTime: string }>
  >([]);
  const [breakDrafts, setBreakDrafts] = useState<
    Array<{ id: string; startTime: string; endTime: string; label: string }>
  >([]);

  const weekStartDate = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const rangeStart = useMemo(
    () => format(weekStartDate, 'yyyy-MM-dd'),
    [weekStartDate]
  );

  const rangeEnd = useMemo(
    () => format(addDays(weekStartDate, 5), 'yyyy-MM-dd'),
    [weekStartDate]
  );

  const queryFilters = useMemo((): TimetableFilters => {
    return {
      classId: filters.classId,
      teacherId: filters.teacherId,
      subjectId: filters.subjectId,
      room: filters.room,
      status: filters.status,
      sessionType: filters.sessionType,
      sectionId: filters.sectionId,
      startDate: filters.startDate || rangeStart,
      endDate: filters.endDate || rangeEnd,
    };
  }, [filters.classId, filters.teacherId, filters.subjectId, filters.room, filters.status, filters.sessionType, filters.sectionId, filters.startDate, filters.endDate, rangeStart, rangeEnd]);

  const { data: entries = [], isLoading, refetch } = useTimetableEntries(queryFilters);

  const displayEntries = entries;

  const [didAutoSelectClass, setDidAutoSelectClass] = useState(false);

  // Prefer a single class for Week Schedule so the grid stays readable after school-wide import
  useEffect(() => {
    if (didAutoSelectClass || !classes.length || filters.classId) return;
    const sorted = [...classes].sort((a, b) =>
      String(a.classNumber).localeCompare(String(b.classNumber), undefined, { numeric: true }) ||
      String(a.section).localeCompare(String(b.section)),
    );
    if (sorted[0]?._id) {
      setFilters((f) => (f.classId ? f : { ...f, classId: sorted[0]._id }));
      setDidAutoSelectClass(true);
    }
  }, [classes, filters.classId, didAutoSelectClass]);
  const createMut = useCreateTimetable();
  const updateMut = useUpdateTimetable();
  const deleteMut = useDeleteTimetable();
  const bulkDeleteMut = useBulkDeleteTimetable();
  const bulkDeleteGroupMut = useBulkDeleteTimetableGroup();
  const importCsv = useImportTimetableCSV();
  const remapPeriodsMut = useRemapPeriodTimes();

  const openPeriodsEditor = () => {
    const cols = getPeriodColumnsFromEntries(displayEntries).filter((c) => c.kind !== 'break');
    setPeriodDrafts(
      cols.map((c) => ({
        key: c.key,
        fromStart: c.startTime,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
    );
    setBreakDrafts([]);
    setPeriodsEditOpen(true);
  };

  const savePeriodTimes = async () => {
    if (!filters.classId) {
      toast({
        title: 'Select a class',
        description: 'Pick one class before editing period times.',
        variant: 'destructive',
      });
      return;
    }
    const mappings = periodDrafts.map((p) => ({
      fromStart: p.fromStart,
      toStart: p.startTime,
      toEnd: p.endTime,
    }));

    try {
      const r = await remapPeriodsMut.mutateAsync({
        classId: filters.classId,
        startDate: rangeStart,
        endDate: rangeEnd,
        mappings,
        breaksToAdd: breakDrafts.map((b) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label || 'Break',
        })),
      });
      toast({
        title: 'Period times updated',
        description: `Updated ${r.updated} slots${r.breaksCreated ? `, added ${r.breaksCreated} break cells` : ''}.`,
      });
      setPeriodsEditOpen(false);
      refetch();
    } catch (err) {
      toast({
        title: 'Could not update times',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/classes`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/admin/teachers`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/admin/subjects`, { headers }).then((r) => r.json()),
    ]).then(([cls, tch, sub]) => {
      const classRows = cls?.data || cls?.classes || cls || [];
      const teacherRows = Array.isArray(tch) ? tch : tch?.data || tch?.teachers || [];
      const subjectRows = Array.isArray(sub) ? sub : sub?.data || sub?.subjects || [];
      setClasses(normalizeClassOptions(classRows));
      setTeachers(
        (Array.isArray(teacherRows) ? teacherRows : []).map((t: { _id?: string; id?: string; fullName?: string; email?: string }) => ({
          _id: entityId(t),
          fullName: t.fullName || '',
          email: t.email || '',
        })).filter((t) => t._id)
      );
      setSubjects(normalizeSubjectOptions(subjectRows));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.classId) return;
    const cls = classes.find((c) => c._id === form.classId);
    if (cls) {
      setForm((f) => ({ ...f, sectionId: cls.section }));
    }
  }, [form.classId, classes]);

  const subjectOptions = useMemo(() => {
    const map = new Map(subjects.map((s) => [s._id, s]));
    if (form.subjectId && !map.has(form.subjectId)) {
      const name = refName(editingEntry?.subjectId) || 'Unknown subject';
      map.set(form.subjectId, { _id: form.subjectId, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, form.subjectId, editingEntry]);

  const openAdd = (date?: Date, hour?: number, dayIndex?: WeekdayIndex, startTimeExact?: string) => {
    setEditingEntry(null);
    const d = date ?? (dayIndex != null ? dateForWeekdayIndex(dayIndex) : new Date());
    let startTime = hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    let endTime = hour != null ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00';
    if (startTimeExact && /^\d{2}:\d{2}$/.test(startTimeExact)) {
      startTime = startTimeExact;
      const [h, m] = startTimeExact.split(':').map(Number);
      const endMins = h * 60 + m + 45;
      endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }
    setForm({
      ...emptyForm(),
      date: format(d, 'yyyy-MM-dd'),
      startTime,
      endTime,
      classId: filters.classId || '',
      sectionId: classes.find((c) => c._id === filters.classId)?.section || '',
    });
    setFormOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setForm({
      date: entry.date.slice(0, 10),
      startTime: entry.startTime,
      endTime: entry.endTime,
      classId: refId(entry.classId),
      sectionId: entry.sectionId || '',
      subjectId: refId(entry.subjectId),
      teacherId: refId(entry.teacherId),
      room: entry.room || '',
      building: entry.building || '',
      repeatRule: entry.repeatRule,
      effectiveFrom: entry.effectiveFrom?.slice(0, 10) || '',
      effectiveTo: entry.effectiveTo?.slice(0, 10) || '',
      sessionType: entry.sessionType,
      attendanceRequired: entry.attendanceRequired,
      expectedStudents: entry.expectedStudents?.toString() || '',
      capacity: entry.capacity?.toString() || '',
      status: entry.status,
      priority: entry.priority ?? 0,
      notes: entry.notes || '',
      colorTag: entry.colorTag || colorTagForSubject(refName(entry.subjectId)),
      attachment: entry.attachment || '',
    });
    setFormOpen(true);
  };

  const buildPayload = useCallback(() => ({
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    classId: form.classId,
    sectionId: form.sectionId,
    subjectId: form.subjectId,
    teacherId: form.teacherId,
    room: form.room,
    building: form.building,
    repeatRule: form.repeatRule,
    effectiveFrom: form.repeatRule !== 'none' ? form.effectiveFrom : undefined,
    effectiveTo: form.repeatRule !== 'none' ? form.effectiveTo : undefined,
    sessionType: form.sessionType,
    attendanceRequired: form.attendanceRequired,
    expectedStudents: form.expectedStudents ? Number(form.expectedStudents) : undefined,
    capacity: form.capacity ? Number(form.capacity) : undefined,
    status: form.status,
    priority: form.priority,
    notes: form.notes,
    colorTag: form.colorTag,
    attachment: form.attachment,
  }), [form]);

  const handleSave = async (forceSave = false) => {
    if (!form.classId || !form.subjectId || !form.teacherId) {
      toast({
        title: 'Missing fields',
        description: 'Class, subject, and teacher are required.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.room.trim() || !form.building.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Room and building are required.',
        variant: 'destructive',
      });
      return;
    }
    const payload = {
      ...buildPayload(),
      room: form.room.trim(),
      building: form.building.trim(),
      forceSave,
    };
    try {
      if (editingEntry) {
        await updateMut.mutateAsync({ id: editingEntry._id, ...payload });
        toast({ title: 'Updated', description: 'Timetable entry saved.' });
      } else {
        const result = await createMut.mutateAsync(payload) as { hasConflict?: boolean; skipped?: unknown[] };
        if (result.hasConflict && !forceSave) {
          setConflictDialog(true);
          return;
        }
        toast({ title: 'Created', description: 'Timetable entry saved.' });
      }
      setFormOpen(false);
      setConflictDialog(false);
      refetch();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Error', description: e.message || 'Save failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Timetable entry removed.' });
      setFormOpen(false);
      setEditingEntry(null);
      refetch();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
    }
  };

  const handleBulkDeleteVisible = async () => {
    try {
      const r = await bulkDeleteMut.mutateAsync({
        startDate: queryFilters.startDate,
        endDate: queryFilters.endDate,
        classId: queryFilters.classId,
        teacherId: queryFilters.teacherId,
        subjectId: queryFilters.subjectId,
        room: queryFilters.room,
        status: queryFilters.status,
        sessionType: queryFilters.sessionType,
        sectionId: queryFilters.sectionId,
      });
      toast({ title: 'Deleted', description: `${r.deleted} timetable ${r.deleted === 1 ? 'entry' : 'entries'} removed.` });
      refetch();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Error', description: e.message || 'Bulk delete failed', variant: 'destructive' });
    }
  };

  const handleDeleteRepeatGroup = async (groupId: string) => {
    try {
      const r = await bulkDeleteGroupMut.mutateAsync(groupId);
      toast({ title: 'Deleted', description: `${r.deleted} repeated ${r.deleted === 1 ? 'entry' : 'entries'} removed.` });
      setFormOpen(false);
      setEditingEntry(null);
      refetch();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
    }
  };

  const bulkDeleteSummary = useMemo(() => {
    const parts = [`${displayEntries.length} ${displayEntries.length === 1 ? 'entry' : 'entries'}`];
    if (queryFilters.startDate && queryFilters.endDate) {
      parts.push(`${queryFilters.startDate} to ${queryFilters.endDate}`);
    } else {
      parts.push('weekly pattern (all dates)');
    }
    if (filters.classId) {
      const cls = classes.find((c) => c._id === filters.classId);
      if (cls) parts.push(`class ${cls.classNumber}-${cls.section}`);
    }
    if (filters.teacherId) {
      const t = teachers.find((x) => x._id === filters.teacherId);
      if (t) parts.push(`teacher ${t.fullName}`);
    }
    return parts.join(' · ');
  }, [displayEntries.length, queryFilters, filters.classId, filters.teacherId, classes, teachers]);

  const entriesForDate = (d: Date) => displayEntries.filter((e) => isSameDay(parseISO(e.date), d));

  const weekDates = useMemo(() => getWeekDates(weekStartDate), [weekStartDate]);

  const navPrev = () => setCurrentDate(subWeeks(currentDate, 1));
  const navNext = () => setCurrentDate(addWeeks(currentDate, 1));

  const renderMatrixView = (rowKey: 'teacher' | 'class' | 'room') => {
    const rows = new Map<string, string>();
    displayEntries.forEach((e) => {
      let key = '';
      let label = '';
      if (rowKey === 'teacher') { key = refId(e.teacherId); label = refName(e.teacherId, 'Unknown'); }
      else if (rowKey === 'class') { key = `${refId(e.classId)}-${e.sectionId}`; label = `${typeof e.classId === 'object' ? e.classId.classNumber : ''}-${e.sectionId}`; }
      else { key = e.room || 'No Room'; label = e.room || 'No Room'; }
      if (key) rows.set(key, label);
    });
    const weekdays = weekDates;
    return (
      <div className="overflow-x-auto rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{rowKey === 'teacher' ? 'Teacher' : rowKey === 'class' ? 'Class' : 'Room'}</TableHead>
              {weekdays.map((d) => <TableHead key={d.toISOString()}>{format(d, 'EEE')}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(rows.entries()).map(([key, label]) => (
              <TableRow key={key}>
                <TableCell className="font-medium text-sm">{label}</TableCell>
                {weekdays.map((d) => {
                  const cell = displayEntries.filter((e) => {
                    if (!isSameDay(parseISO(e.date), d)) return false;
                    if (rowKey === 'teacher') return refId(e.teacherId) === key;
                    if (rowKey === 'class') return `${refId(e.classId)}-${e.sectionId}` === key;
                    return (e.room || 'No Room') === key;
                  });
                  return (
                    <TableCell key={d.toISOString()} className="text-xs p-1 align-top">
                      {cell.map((e) => (
                        <div key={e._id} className={cn('rounded px-1 py-0.5 mb-0.5 cursor-pointer', entryClasses(e))} onClick={() => openEdit(e)}>
                          {e.startTime} {refName(e.subjectId)}
                        </div>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const actionBar = (
    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
      <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
        <Select value={filters.classId || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, classId: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-[160px] rounded-xl bg-white border-orange-300 font-medium"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes (crowded)</SelectItem>
            {classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.classNumber}-{c.section}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.teacherId || 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, teacherId: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-[140px] rounded-xl bg-white border-orange-200"><SelectValue placeholder="Teacher" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
        {viewMode !== 'week' && (
          <>
            <Input
              type="date"
              className="asli-date-input h-10 w-[11.5rem] min-w-[11.5rem] rounded-xl border-orange-200 bg-white py-2 pl-3 pr-10 text-sm"
              value={filters.startDate || rangeStart}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              type="date"
              className="asli-date-input h-10 w-[11.5rem] min-w-[11.5rem] rounded-xl border-orange-200 bg-white py-2 pl-3 pr-10 text-sm"
              value={filters.endDate || rangeEnd}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </>
        )}
        <Button type="button" variant="outline" size="sm" className="rounded-xl border-orange-200 text-orange-700" onClick={() => exportTimetableCSV(queryFilters)}>
          <Download className="w-4 h-4 mr-1" />Export
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
              disabled={displayEntries.length === 0 || bulkDeleteMut.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete visible
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all visible entries?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600">
                This permanently deletes every entry matching your current view and filters:
                <span className="block mt-2 font-medium text-gray-800">{bulkDeleteSummary}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-red-600 hover:bg-red-700"
                onClick={handleBulkDeleteVisible}
              >
                Delete all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        <Dialog
          open={isUploadDialogOpen}
          onOpenChange={(open) => {
            setIsUploadDialogOpen(open);
            if (!open) {
              setCsvFile(null);
              setImportErrors([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl w-full sm:w-auto">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-white/95 border-orange-200 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                Upload Timetable
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-xs sm:text-sm space-y-2">
                <span className="block">
                  Upload CSV or Excel. Two formats work:
                </span>
                <span className="block">
                  1) Class weekly grid (like school printouts): header such as{' '}
                  <span className="font-medium text-gray-800">6A - Teacher</span>, then Time / Period
                  rows and Mon–Sat subject cells. Missing classes (e.g. 6-C, 10-A) and activity
                  subjects are created automatically. Re-upload replaces that week for the classes
                  in the file. Teacher column is optional.
                </span>
                <span className="block">
                  2) Flat row file (Date, Day, StartTime, EndTime, Class, Section, Subject, Teacher).
                  Use Download template for this format. Classes must already exist in School
                  Management.
                </span>
              </DialogDescription>
            </DialogHeader>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {importCsv.isPending && (
                <p className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg p-2">
                  Importing… large class grids (hundreds of periods) usually finish in under a minute.
                  Keep this dialog open.
                </p>
              )}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">CSV Template</p>
                    <p className="text-xs text-gray-600">Download sample format</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void downloadTimetableTemplate().catch((err: unknown) => {
                      const message = err instanceof Error ? err.message : 'Could not download template';
                      toast({ title: 'Template download failed', description: message, variant: 'destructive' });
                    });
                  }}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <div>
                <Label htmlFor="timetable-csv" className="text-gray-700 font-medium mb-2 block">Select file</Label>
                <Input id="timetable-csv" type="file" accept=".csv,.xlsx,.xls" className="border-orange-200 focus:border-orange-400 rounded-xl" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setImportErrors([]); }} />
                {csvFile && (
                  <p className="mt-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
                    <FileSpreadsheet className="w-3 h-3 inline mr-1" />
                    {csvFile.name}
                  </p>
                )}
              </div>
              {importErrors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {importErrors.length} issue{importErrors.length === 1 ? '' : 's'}
                    {importErrors.some((e) => e.status === 'error') ? ' (some rows skipped)' : ''}
                  </p>
                  {(() => {
                    const grouped = new Map<string, number[]>();
                    for (const err of importErrors) {
                      const reason = String(err.reason || 'Unknown error');
                      const rows = grouped.get(reason) || [];
                      if (err.row > 0) rows.push(err.row);
                      grouped.set(reason, rows);
                    }
                    return [...grouped.entries()].slice(0, 8).map(([reason, rows], idx) => {
                      const rowLabel =
                        rows.length === 0
                          ? ''
                          : rows.length <= 6
                            ? `Rows ${rows.join(', ')}: `
                            : `Rows ${rows.slice(0, 4).join(', ')}… (+${rows.length - 4}): `;
                      const shortReason =
                        reason.length > 220 ? `${reason.slice(0, 220)}…` : reason;
                      return (
                        <p key={`err-${idx}`} className="break-words">
                          {rowLabel}
                          {shortReason}
                        </p>
                      );
                    });
                  })()}
                  {importErrors.some((e) => String(e.reason || '').includes('not found')) && (
                    <p className="text-amber-800">
                      Tip: create missing classes in School Management, or re-upload a class grid —
                      missing classes are auto-created. Re-uploading a class grid replaces that
                      week&apos;s periods for those classes.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setIsUploadDialogOpen(false); setCsvFile(null); setImportErrors([]); }}>Cancel</Button>
              <Button
                type="button"
                disabled={!csvFile || importCsv.isPending}
                className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl"
                onClick={async () => {
                  if (!csvFile) return;
                  try {
                    const r = await importCsv.mutateAsync({ file: csvFile, mode: 'import' }) as {
                      imported: number;
                      skipped: number;
                      errors?: Array<{ row: number; reason: string; status?: string }>;
                      autoCreatedClasses?: string[];
                      format?: string;
                    };
                    const errs = Array.isArray(r.errors) ? r.errors : [];
                    setImportErrors(errs);
                    const created = Array.isArray(r.autoCreatedClasses) ? r.autoCreatedClasses : [];
                    const firstReason = String(errs.find((e) => e.reason)?.reason || '');
                    const shortFirst =
                      firstReason.length > 140 ? `${firstReason.slice(0, 140)}…` : firstReason;
                    const createdNote =
                      created.length > 0
                        ? ` Created classes: ${created.slice(0, 8).join(', ')}${created.length > 8 ? '…' : ''}.`
                        : '';
                    toast({
                      title: r.imported > 0 ? 'Import done' : 'Nothing imported',
                      description: shortFirst
                        ? `Imported: ${r.imported}, Skipped: ${r.skipped}.${createdNote} ${shortFirst}`
                        : `Imported: ${r.imported}, Skipped: ${r.skipped}.${createdNote}`,
                      variant: r.imported > 0 ? 'default' : 'destructive',
                    });
                    if (r.imported > 0 && errs.length === 0) {
                      setIsUploadDialogOpen(false);
                      setCsvFile(null);
                    }
                    refetch();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Import failed';
                    toast({ title: 'Import failed', description: message, variant: 'destructive' });
                    setImportErrors([{ row: 0, reason: message, status: 'error' }]);
                  }
                }}
              >
                {importCsv.isPending ? 'Uploading…' : 'Upload Timetable'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl px-4 sm:px-6 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 w-full sm:w-auto"
          onClick={() => openAdd()}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Add Entry
        </Button>
      </motion.div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-orange-600" />
          Timetable Management
        </h1>
        <p className="text-sm text-gray-600 mt-1">Manage class schedules, rooms, and teachers</p>
      </div>

      {actionBar}

      <Card className="rounded-2xl shadow-lg border border-orange-100/60 overflow-hidden">
        <CardContent className="p-0 sm:p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white">
            <div className="flex flex-wrap gap-1.5">
              {VIEW_MODES.map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={viewMode === v ? 'default' : 'outline'}
                  className={cn(
                    'rounded-xl text-xs',
                    viewMode === v
                      ? 'bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 border-0 shadow-sm'
                      : 'border-orange-200 text-orange-800 hover:bg-orange-50'
                  )}
                  onClick={() => setViewMode(v)}
                >
                  {viewLabel(v)}
                </Button>
              ))}
            </div>
            {viewMode === 'week' && (
              <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-1 py-0.5 shadow-sm">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navPrev}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-bold text-gray-900 px-2 whitespace-nowrap">
                  {format(weekStartDate, 'd MMM')} – {format(addDays(weekStartDate, 5), 'd MMM yyyy')}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {viewMode !== 'week' && (
              <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-1 py-0.5 shadow-sm">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navPrev}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-bold text-gray-900 px-2">Filter by date range</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">

              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />)}</div>
              ) : viewMode === 'week' && !filters.classId ? (
                <div className="text-center py-14 text-gray-600 space-y-3">
                  <CalendarDays className="h-12 w-12 mx-auto text-orange-300" />
                  <p className="font-semibold text-gray-900">Select a class to view the week timetable</p>
                  <p className="text-sm max-w-md mx-auto">
                    School-wide imports put many classes in the same week. Pick a class (e.g. 6-A) above for a clear Mon–Sat period grid — same layout as your Excel.
                  </p>
                </div>
              ) : displayEntries.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No timetable entries</p>
                  <Button className="mt-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600" onClick={() => openAdd()}>Add first entry</Button>
                </div>
              ) : (
                <>
                  {viewMode === 'week' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-gray-600">
                          Periods follow school bell times. Breaks show between gaps (or from import).
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-orange-300 text-orange-800"
                          disabled={!filters.classId || displayEntries.length === 0}
                          onClick={openPeriodsEditor}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          Edit period times
                        </Button>
                      </div>
                      {!filters.classId && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          Showing all classes — the grid will look crowded. Choose one class for a clean view.
                        </p>
                      )}
                      <WeeklyTimetableGrid
                        entries={displayEntries}
                        variant="admin"
                        interactive
                        showClassOnCard={!filters.classId}
                        onEntryClick={openEdit}
                        onEmptyClick={(dayIndex, hourOrStart) => {
                          if (typeof hourOrStart === 'string') {
                            openAdd(undefined, undefined, dayIndex, hourOrStart);
                          } else {
                            openAdd(undefined, hourOrStart, dayIndex);
                          }
                        }}
                      />
                    </div>
                  )}
                  {viewMode === 'teacher' && renderMatrixView('teacher')}
                  {viewMode === 'class' && renderMatrixView('class')}
                  {viewMode === 'room' && renderMatrixView('room')}
                </>
              )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={periodsEditOpen} onOpenChange={setPeriodsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-orange-100">
          <DialogHeader>
            <DialogTitle className="text-orange-900">Edit period times</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Change bell times for this class for the visible week. Add Break / Lunch slots to match
              the school timetable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Periods</p>
              {periodDrafts.map((p, idx) => (
                <div
                  key={p.key}
                  className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center rounded-xl border border-orange-100 bg-orange-50/40 p-2"
                >
                  <span className="text-xs font-bold text-orange-800 text-center">P{idx + 1}</span>
                  <div>
                    <Label className="text-[10px] text-gray-500">Start</Label>
                    <Input
                      type="time"
                      className="h-9 rounded-lg border-orange-200"
                      value={p.startTime}
                      onChange={(e) =>
                        setPeriodDrafts((rows) =>
                          rows.map((r) => (r.key === p.key ? { ...r, startTime: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">End</Label>
                    <Input
                      type="time"
                      className="h-9 rounded-lg border-orange-200"
                      value={p.endTime}
                      onChange={(e) =>
                        setPeriodDrafts((rows) =>
                          rows.map((r) => (r.key === p.key ? { ...r, endTime: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              {periodDrafts.length === 0 && (
                <p className="text-sm text-gray-500">No periods found for this class/week.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Breaks to add</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8 text-xs"
                  onClick={() => {
                    const last = periodDrafts[periodDrafts.length - 1];
                    const start = last?.endTime || '11:05';
                    const [h, m] = start.split(':').map(Number);
                    const endMins = h * 60 + m + 15;
                    const end = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
                    setBreakDrafts((rows) => [
                      ...rows,
                      {
                        id: `br-${Date.now()}`,
                        startTime: start,
                        endTime: end,
                        label: endMins - (h * 60 + m) >= 30 ? 'Lunch' : 'Break',
                      },
                    ]);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add break
                </Button>
              </div>
              {breakDrafts.map((b) => (
                <div
                  key={b.id}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-xl border border-stone-200 bg-stone-50 p-2"
                >
                  <div>
                    <Label className="text-[10px] text-gray-500">Label</Label>
                    <Input
                      className="h-9 rounded-lg"
                      value={b.label}
                      onChange={(e) =>
                        setBreakDrafts((rows) =>
                          rows.map((r) => (r.id === b.id ? { ...r, label: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Start</Label>
                    <Input
                      type="time"
                      className="h-9 rounded-lg"
                      value={b.startTime}
                      onChange={(e) =>
                        setBreakDrafts((rows) =>
                          rows.map((r) => (r.id === b.id ? { ...r, startTime: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">End</Label>
                    <Input
                      type="time"
                      className="h-9 rounded-lg"
                      value={b.endTime}
                      onChange={(e) =>
                        setBreakDrafts((rows) =>
                          rows.map((r) => (r.id === b.id ? { ...r, endTime: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-600"
                    onClick={() => setBreakDrafts((rows) => rows.filter((r) => r.id !== b.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPeriodsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-400"
              disabled={remapPeriodsMut.isPending}
              onClick={() => void savePeriodTimes()}
            >
              {remapPeriodsMut.isPending ? 'Saving…' : 'Save times'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-orange-100">
          <DialogHeader>
            <DialogTitle className="text-orange-900">{editingEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Date</Label>
                <Input
                  type="date"
                  className={cn(FORM_INPUT, 'asli-date-input pr-10')}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Day</Label>
                <Input
                  disabled
                  className={cn(FORM_INPUT, 'bg-orange-50/50 text-gray-700')}
                  value={form.date && isValid(parseISO(form.date)) ? format(parseISO(form.date), 'EEEE') : ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0 isolate">
                <Label className="text-gray-700">Start</Label>
                <Input
                  type="time"
                  className={FORM_INPUT}
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 min-w-0 isolate">
                <Label className="text-gray-700">End</Label>
                <Input
                  type="time"
                  className={FORM_INPUT}
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Class *</Label>
                <Select
                  value={form.classId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, classId: v, subjectId: '' }))}
                >
                  <SelectTrigger className={FORM_SELECT_TRIGGER}><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.classNumber}-{c.section}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Section</Label>
                <Input
                  placeholder="e.g. A"
                  className={FORM_INPUT}
                  value={form.sectionId}
                  onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Subject *</Label>
                <Select
                  value={form.subjectId || undefined}
                  onValueChange={(v) => {
                    const sub = subjectOptions.find((s) => s._id === v);
                    setForm((f) => ({
                      ...f,
                      subjectId: v,
                      colorTag: sub ? colorTagForSubject(sub.name) : f.colorTag,
                    }));
                  }}
                >
                  <SelectTrigger className={FORM_SELECT_TRIGGER}><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {subjectOptions.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Teacher *</Label>
                <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
                  <SelectTrigger className={FORM_SELECT_TRIGGER}><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Room *</Label>
                <Input
                  required
                  className={FORM_INPUT}
                  value={form.room}
                  onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="e.g. 101"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Building *</Label>
                <Input
                  required
                  className={FORM_INPUT}
                  value={form.building}
                  onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                  placeholder="e.g. Main Block"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Session type</Label>
                <Select value={form.sessionType} onValueChange={(v) => setForm((f) => ({ ...f, sessionType: v as SessionType }))}>
                  <SelectTrigger className={FORM_SELECT_TRIGGER}><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSION_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-gray-700">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof form.status }))}>
                  <SelectTrigger className={FORM_SELECT_TRIGGER}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {editingEntry && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete one
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes only the schedule for {form.date} at {form.startTime}–{form.endTime}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(editingEntry._id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {editingEntry.repeatGroupId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-red-300 text-red-700 hover:bg-red-50"
                          disabled={bulkDeleteGroupMut.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete all repeated
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete entire repeat series?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Removes every entry created together with this repeating schedule (daily/weekly/monthly), not just this day.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteRepeatGroup(editingEntry.repeatGroupId!)}
                          >
                            Delete series
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button type="button" variant="ghost" onClick={() => setForm(emptyForm())}>Reset</Button>
              <Button type="button" className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600" onClick={() => handleSave()} disabled={createMut.isPending || updateMut.isPending}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conflictDialog} onOpenChange={setConflictDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-yellow-500" />Conflicts Detected</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Some entries conflict with existing schedules.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConflictDialog(false)}>Cancel</Button>
            <Button onClick={() => handleSave(true)}>Save Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
