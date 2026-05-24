import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks,
  addDays, isSameDay, isSameMonth, parseISO, isValid,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Upload, Download, Trash2,
  CalendarDays, AlertTriangle, FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import {
  useTimetableEntries, useCreateTimetable, useUpdateTimetable,
  useDeleteTimetable, useBulkDeleteTimetable, useBulkDeleteTimetableGroup,
  useImportTimetableCSV,
  downloadTimetableTemplate, exportTimetableCSV,
} from '@/hooks/useTimetable';
import type { TimetableEntry, TimetableFilters, SessionType } from '@/types/timetable';
import { SESSION_TYPE_COLORS, STATUS_COLORS, COLOR_PRESETS } from '@/types/timetable';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'teacher' | 'class' | 'room';

const VIEW_MODES: ViewMode[] = ['month', 'week', 'teacher', 'class', 'room'];

function viewLabel(v: ViewMode): string {
  if (v === 'teacher') return 'Teacher View';
  if (v === 'class') return 'Class View';
  if (v === 'room') return 'Room View';
  if (v === 'week') return 'Week';
  return 'Month';
}

const isCalendarView = (v: ViewMode) => v === 'month' || v === 'week';

const SESSION_TYPES: SessionType[] = ['Lecture', 'Lab', 'Exam', 'Workshop', 'Activity', 'Holiday', 'Special Class'];

function refId(v: string | { _id?: string } | undefined): string {
  if (!v) return '';
  return typeof v === 'string' ? v : v._id || '';
}

function refName(v: string | { name?: string; fullName?: string } | undefined, fallback = ''): string {
  if (!v || typeof v === 'string') return fallback;
  return v.name || v.fullName || fallback;
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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<TimetableFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [conflictDialog, setConflictDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [classes, setClasses] = useState<Array<{ _id: string; classNumber: string; section: string; assignedSubjects?: Array<{ _id: string; name: string }> }>>([]);
  const [teachers, setTeachers] = useState<Array<{ _id: string; fullName: string; email: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ _id: string; name: string }>>([]);

  const rangeStart = useMemo(() => {
    if (viewMode === 'month') return format(startOfMonth(currentDate), 'yyyy-MM-dd');
    return format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }, [viewMode, currentDate]);

  const rangeEnd = useMemo(() => {
    if (viewMode === 'month') return format(endOfMonth(currentDate), 'yyyy-MM-dd');
    return format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }, [viewMode, currentDate]);

  const queryFilters = useMemo(() => ({ ...filters, startDate: rangeStart, endDate: rangeEnd }), [filters, rangeStart, rangeEnd]);
  const { data: entries = [], isLoading, refetch } = useTimetableEntries(queryFilters);

  const displayEntries = entries;
  const createMut = useCreateTimetable();
  const updateMut = useUpdateTimetable();
  const deleteMut = useDeleteTimetable();
  const bulkDeleteMut = useBulkDeleteTimetable();
  const bulkDeleteGroupMut = useBulkDeleteTimetableGroup();
  const importCsv = useImportTimetableCSV();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    Promise.all([
      fetch(`${API_BASE_URL}/api/admin/classes`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/admin/teachers`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/admin/subjects`, { headers }).then((r) => r.json()),
    ]).then(([cls, tch, sub]) => {
      setClasses(cls?.data || cls?.classes || cls || []);
      setTeachers(tch?.data || tch?.teachers || tch || []);
      setSubjects(sub?.data || sub?.subjects || sub || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.classId) return;
    const cls = classes.find((c) => c._id === form.classId);
    if (cls) {
      setForm((f) => ({ ...f, sectionId: cls.section }));
      if (cls.assignedSubjects?.length) {
        setSubjects(cls.assignedSubjects.map((s) => ({ _id: s._id, name: s.name })));
      }
    }
  }, [form.classId, classes]);

  const filteredSubjects = useMemo(() => {
    if (!form.classId) return subjects;
    const cls = classes.find((c) => c._id === form.classId);
    if (cls?.assignedSubjects?.length) return cls.assignedSubjects.map((s) => ({ _id: s._id, name: s.name }));
    return subjects;
  }, [form.classId, classes, subjects]);

  const openAdd = (date?: Date) => {
    setEditingEntry(null);
    setForm({ ...emptyForm(), date: format(date || currentDate, 'yyyy-MM-dd') });
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
      colorTag: entry.colorTag || COLOR_PRESETS[0],
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
    const payload = { ...buildPayload(), forceSave };
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
    parts.push(`${queryFilters.startDate} to ${queryFilters.endDate}`);
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

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMM d, yyyy');
  }, [viewMode, currentDate, weekDays]);

  const navPrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };

  const navNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };

  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-2xl overflow-hidden">
      {weekDays.map((day) => (
        <motion.div
          key={`hdr-${day.toISOString()}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600"
        >
          <span className="block">{format(day, 'EEE')}</span>
          <span className="block text-gray-800">{format(day, 'd')}</span>
        </motion.div>
      ))}
      {weekDays.map((day) => {
        const dayEntries = entriesForDate(day)
          .slice()
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = isSameDay(day, new Date());
        return (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'bg-white min-h-[140px] p-2 cursor-pointer hover:bg-sky-50/50',
              isToday && 'ring-2 ring-inset ring-orange-400'
            )}
            onClick={() => openAdd(day)}
          >
            {dayEntries.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center mt-4">No entries</p>
            ) : (
              dayEntries.map((e) => (
                <div
                  key={e._id}
                  className={cn('text-[11px] rounded px-1.5 py-1 mb-1 cursor-pointer', entryClasses(e))}
                  style={e.colorTag ? { backgroundColor: e.colorTag, color: '#fff', borderColor: e.colorTag } : undefined}
                  onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                >
                  <span className="font-medium">{e.startTime}</span>
                  <span className="block truncate">{refName(e.subjectId)}</span>
                </div>
              ))
            )}
          </motion.div>
        );
      })}
    </div>
  );

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-2xl overflow-hidden">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <motion.div key={d} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">{d}</motion.div>
      ))}
      {monthDays.map((day) => {
        const dayEntries = entriesForDate(day);
        const inMonth = isSameMonth(day, currentDate);
        return (
          <motion.div
            key={day.toISOString()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-sky-50/50', !inMonth && 'opacity-40')}
            onClick={() => openAdd(day)}
          >
            <p className="text-xs font-medium text-gray-700 mb-1">{format(day, 'd')}</p>
            {dayEntries.slice(0, 3).map((e) => (
              <div
                key={e._id}
                className={cn('text-[10px] rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer', entryClasses(e))}
                style={e.colorTag ? { backgroundColor: e.colorTag, color: '#fff', borderColor: e.colorTag } : undefined}
                onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
              >
                {e.startTime} {refName(e.subjectId)}
              </div>
            ))}
            {dayEntries.length > 3 && <p className="text-[10px] text-gray-500">+{dayEntries.length - 3} more</p>}
          </motion.div>
        );
      })}
    </div>
  );

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
    const weekdays = weekDays.slice(0, 5);
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
          <SelectTrigger className="w-[140px] rounded-xl bg-white border-orange-200"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
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
        <Input type="date" className="w-[140px] rounded-xl bg-white border-orange-200" value={filters.startDate || rangeStart} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
        <Input type="date" className="w-[140px] rounded-xl bg-white border-orange-200" value={filters.endDate || rangeEnd} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
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
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl w-full sm:w-auto">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white/95 border-orange-200 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                Upload Timetable CSV
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-xs sm:text-sm">
                Upload a CSV or Excel file to bulk import schedule entries.
              </DialogDescription>
            </DialogHeader>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">CSV Template</p>
                    <p className="text-xs text-gray-600">Download sample format</p>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={downloadTimetableTemplate} className="border-orange-200 text-orange-700 hover:bg-orange-50">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <div>
                <Label htmlFor="timetable-csv" className="text-gray-700 font-medium mb-2 block">Select file</Label>
                <Input id="timetable-csv" type="file" accept=".csv,.xlsx,.xls" className="border-orange-200 focus:border-orange-400 rounded-xl" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                {csvFile && (
                  <p className="mt-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
                    <FileSpreadsheet className="w-3 h-3 inline mr-1" />
                    {csvFile.name}
                  </p>
                )}
              </div>
            </motion.div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setIsUploadDialogOpen(false); setCsvFile(null); }}>Cancel</Button>
              <Button
                type="button"
                disabled={!csvFile || importCsv.isPending}
                className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl"
                onClick={async () => {
                  if (!csvFile) return;
                  const r = await importCsv.mutateAsync({ file: csvFile, mode: 'import' }) as { imported: number; skipped: number };
                  toast({ title: 'Import done', description: `Imported: ${r.imported}, Skipped: ${r.skipped}` });
                  setIsUploadDialogOpen(false);
                  setCsvFile(null);
                  refetch();
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

      <Card className="rounded-2xl shadow-sm border border-white/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-1">
                {VIEW_MODES.map((v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={viewMode === v ? 'default' : 'outline'}
                      className={cn(
                        'rounded-xl',
                        viewMode === v && 'bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 border-0'
                      )}
                      onClick={() => setViewMode(v)}
                    >
                      {viewLabel(v)}
                    </Button>
                  ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={navPrev}><ChevronLeft /></Button>
                <span className="font-semibold text-gray-800">{dateRangeLabel}</span>
                <Button variant="ghost" size="icon" onClick={navNext}><ChevronRight /></Button>
              </div>

              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl" />)}</div>
              ) : displayEntries.length === 0 && !isCalendarView(viewMode) ? (
                <div className="text-center py-16 text-gray-500">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No timetable entries</p>
                  <Button className="mt-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600" onClick={() => openAdd()}>Add first entry</Button>
                </div>
              ) : (
                <>
                  {viewMode === 'month' && renderMonthView()}
                  {viewMode === 'week' && renderWeekView()}
                  {viewMode === 'teacher' && renderMatrixView('teacher')}
                  {viewMode === 'class' && renderMatrixView('class')}
                  {viewMode === 'room' && renderMatrixView('room')}
                </>
              )}
            </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{editingEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Day</Label><Input disabled value={form.date && isValid(parseISO(form.date)) ? format(parseISO(form.date), 'EEEE') : ''} /></div>
              <div><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <Select value={form.classId} onValueChange={(v) => setForm((f) => ({ ...f, classId: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Class *" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.classNumber}-{c.section}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Section" value={form.sectionId} onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value.toUpperCase() }))} />
            <Select value={form.subjectId} onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Subject *" /></SelectTrigger>
              <SelectContent>{filteredSubjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Teacher *" /></SelectTrigger>
              <SelectContent>{teachers.map((t) => <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Room</Label><Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} /></div>
              <div><Label>Building</Label><Input value={form.building} onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))} /></div>
            </div>
            <Select value={form.sessionType} onValueChange={(v) => setForm((f) => ({ ...f, sessionType: v as SessionType }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{SESSION_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2"><Switch checked={form.attendanceRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, attendanceRequired: v }))} /><Label>Attendance Required</Label></motion.div>
            <Select value={form.repeatRule} onValueChange={(v) => setForm((f) => ({ ...f, repeatRule: v as typeof form.repeatRule }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Repeat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {form.repeatRule !== 'none' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} /></div>
                <div><Label>To</Label><Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} /></div>
              </div>
            )}
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof form.status }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" className={cn('w-8 h-8 rounded-full border-2', form.colorTag === c ? 'border-gray-900 scale-110' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setForm((f) => ({ ...f, colorTag: c }))} />
              ))}
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
              <Button type="button" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => handleSave()} disabled={createMut.isPending || updateMut.isPending}>
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
