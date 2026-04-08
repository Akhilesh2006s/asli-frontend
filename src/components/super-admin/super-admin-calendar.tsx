import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Eye,
  Building2,
  Plus,
  BookOpen,
  PartyPopper,
  StickyNote,
} from 'lucide-react';

export type CalendarEventRecord = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'exam' | 'holiday' | 'custom' | 'school_event';
  examId?: string;
  description?: string;
  meta?: { examType?: string; subject?: string; duration?: number };
};

interface Admin {
  id: string;
  _id?: string;
  name: string;
  email: string;
  schoolName?: string;
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Super-admin path is canonical; retry legacy `/api/calendar/events` only if the server returns 404 (old deploys / gateway rules). */
async function fetchCalendarEventsGet(
  searchParams: URLSearchParams,
  token: string | null
): Promise<Response> {
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json',
  };
  const paths = ['/api/super-admin/calendar/events', '/api/calendar/events'] as const;
  let last: Response | undefined;
  for (const path of paths) {
    last = await fetch(`${API_BASE_URL}${path}?${searchParams.toString()}`, { headers });
    if (last.status !== 404) return last;
  }
  return last!;
}

async function fetchCalendarEventsPost(
  body: Record<string, unknown>,
  token: string | null
): Promise<Response> {
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json',
  };
  const paths = ['/api/super-admin/calendar/events', '/api/calendar/events'] as const;
  let last: Response | undefined;
  for (const path of paths) {
    last = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (last.status !== 404) return last;
  }
  return last!;
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TYPE_STYLES: Record<
  CalendarEventRecord['type'],
  { bar: string; dot: string; label: string }
> = {
  exam: {
    bar: 'bg-blue-600 hover:bg-blue-700',
    dot: 'bg-blue-500',
    label: 'Exam',
  },
  holiday: {
    bar: 'bg-emerald-600 hover:bg-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Holiday',
  },
  custom: {
    bar: 'bg-orange-500 hover:bg-orange-600',
    dot: 'bg-orange-500',
    label: 'Custom',
  },
  school_event: {
    bar: 'bg-violet-600 hover:bg-violet-700',
    dot: 'bg-violet-500',
    label: 'School',
  },
};

interface SuperAdminCalendarProps {
  onNavigateToExams?: (prefill: {
    startDate: string;
    endDate: string;
    filterType: 'all-schools' | 'specific-schools';
    selectedSchools: string[];
  }) => void;
}

export default function SuperAdminCalendar({ onNavigateToExams }: SuperAdminCalendarProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);

  const [customOpen, setCustomOpen] = useState(false);
  const [customKind, setCustomKind] = useState<'holiday' | 'custom'>('custom');
  const [customTitle, setCustomTitle] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    const month = monthKey(currentDate);
    try {
      setIsLoadingEvents(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({ month });
      if (selectedSchoolId && selectedSchoolId !== 'all') {
        params.set('schoolId', selectedSchoolId);
      }
      const response = await fetchCalendarEventsGet(params, token);

      if (response.ok) {
        const data = await response.json();
        const list = (data.data || data || []) as CalendarEventRecord[];
        setEvents(Array.isArray(list) ? list : []);
      } else {
        const err = await response.json().catch(() => ({}));
        toast({
          title: 'Error',
          description: err.message || 'Failed to load calendar',
          variant: 'destructive',
        });
        setEvents([]);
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load calendar', variant: 'destructive' });
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [currentDate, selectedSchoolId, toast]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const adminsList = Array.isArray(data) ? data : data.data || [];
        setAdmins(adminsList);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch schools',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch schools',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const getLastDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    const t = stripTime(date);
    return events.filter((ev) => {
      const s = stripTime(new Date(ev.startDate));
      const e = stripTime(new Date(ev.endDate));
      return t >= s && t <= e;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleViewEvent = (event: CalendarEventRecord) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedAdmin = admins.find((a) => (a.id || a._id) === selectedSchoolId);

  const openQuickAdd = (date: Date) => {
    setQuickAddDate(date);
    setQuickAddOpen(true);
  };

  const goToExamWithDate = (date: Date) => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(21, 0, 0, 0);
    const prefill = {
      startDate: toDatetimeLocal(start),
      endDate: toDatetimeLocal(end),
      filterType:
        selectedSchoolId !== 'all'
          ? ('specific-schools' as const)
          : ('all-schools' as const),
      selectedSchools: selectedSchoolId !== 'all' ? [selectedSchoolId] : [],
    };
    onNavigateToExams?.(prefill);
    setQuickAddOpen(false);
  };

  const openCustomForm = (kind: 'holiday' | 'custom') => {
    if (!quickAddDate || selectedSchoolId === 'all') return;
    setCustomKind(kind);
    setCustomTitle('');
    setCustomDescription('');
    const d = quickAddDate;
    setCustomEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setQuickAddOpen(false);
    setCustomOpen(true);
  };

  const saveCustomEvent = async () => {
    if (!quickAddDate || selectedSchoolId === 'all' || !customTitle.trim()) {
      toast({ title: 'Validation', description: 'Title is required', variant: 'destructive' });
      return;
    }
    setIsSavingCustom(true);
    try {
      const token = localStorage.getItem('authToken');
      const start = new Date(quickAddDate);
      start.setHours(0, 0, 0, 0);
      let end: Date;
      if (customEndDate) {
        const [yy, mm, dd] = customEndDate.split('-').map(Number);
        end = new Date(yy, mm - 1, dd, 23, 59, 59, 999);
      } else {
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      }
      if (end < start) {
        toast({ title: 'Invalid range', description: 'End date must be on or after start', variant: 'destructive' });
        setIsSavingCustom(false);
        return;
      }
      const response = await fetchCalendarEventsPost(
        {
          title: customTitle.trim(),
          schoolId: selectedSchoolId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          eventKind: customKind,
          description: customDescription.trim(),
        },
        token
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        toast({ title: 'Saved', description: 'Event added to calendar' });
        setCustomOpen(false);
        setQuickAddDate(null);
        fetchCalendarEvents();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' });
    } finally {
      setIsSavingCustom(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">School Calendar</h2>
            <p className="text-gray-600 mt-1">
              Exams, holidays, and events by school. Exams sync from Exam Management.
            </p>
          </div>
          <Button onClick={goToToday} variant="outline">
            Today
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Building2 className="h-5 w-5 text-gray-500 shrink-0" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="school-select">School filter</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger id="school-select" className="w-full max-w-md">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {admins.map((admin) => {
                      const adminId = admin.id || admin._id || '';
                      return (
                        <SelectItem key={adminId} value={adminId}>
                          {admin.schoolName || admin.name || admin.email}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Legend:{' '}
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Exam
                  </span>{' '}
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Holiday
                  </span>{' '}
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" /> Custom
                  </span>{' '}
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-violet-500" /> School (admin)
                  </span>
                </p>
              </div>
            </div>
            {selectedSchoolId !== 'all' && selectedAdmin && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Filtered school:</span>{' '}
                  {selectedAdmin.schoolName || selectedAdmin.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedAdmin.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading || isLoadingEvents ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600">Loading calendar…</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}

                {calendarDays.map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isCurrentMonthDay = isCurrentMonth(date);
                  const isTodayDate = isToday(date);

                  return (
                    <motion.div
                      key={index}
                      className={`
                        min-h-[112px] border border-gray-200 rounded-lg p-1.5 flex flex-col
                        transition-all
                        ${!isCurrentMonthDay ? 'bg-gray-50 opacity-50' : 'bg-white'}
                        ${isTodayDate ? 'ring-2 ring-orange-500 ring-offset-1 shadow-sm' : ''}
                      `}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span
                          className={`
                          text-sm font-medium px-1
                          ${isTodayDate ? 'text-orange-600 font-bold' : 'text-gray-700'}
                          ${!isCurrentMonthDay ? 'text-gray-400' : ''}
                        `}
                        >
                          {date.getDate()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-gray-500 hover:text-sky-600"
                          title="Add"
                          onClick={() => openQuickAdd(date)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-0.5 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 4).map((ev) => {
                          const st = TYPE_STYLES[ev.type] || TYPE_STYLES.custom;
                          const tip = [
                            ev.title,
                            ev.description,
                            ev.meta?.subject ? `Subject: ${ev.meta.subject}` : '',
                            ev.type === 'exam' && ev.meta?.duration ? `${ev.meta.duration} min` : '',
                          ]
                            .filter(Boolean)
                            .join('\n');
                          return (
                            <Tooltip key={ev.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleViewEvent(ev)}
                                  className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate ${st.bar}`}
                                >
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${st.dot}`} />
                                  {ev.title}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                                {tip}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {dayEvents.length > 4 && (
                          <div className="text-[10px] text-gray-500 font-medium px-0.5">
                            +{dayEvents.length - 4} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick add */}
        <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add on this date</DialogTitle>
              <DialogDescription>
                {quickAddDate?.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button
                className="justify-start gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (quickAddDate) goToExamWithDate(quickAddDate);
                }}
              >
                <BookOpen className="h-4 w-4" />
                Add Exam (Exam Management)
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 border-emerald-300 text-emerald-800"
                onClick={() => openCustomForm('holiday')}
                disabled={selectedSchoolId === 'all'}
              >
                <PartyPopper className="h-4 w-4" />
                Add Holiday
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 border-orange-300 text-orange-800"
                onClick={() => openCustomForm('custom')}
                disabled={selectedSchoolId === 'all'}
              >
                <StickyNote className="h-4 w-4" />
                Add Custom Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Holiday / Custom form */}
        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{customKind === 'holiday' ? 'Add holiday' : 'Add custom event'}</DialogTitle>
              <DialogDescription>
                School: {selectedAdmin?.schoolName || selectedAdmin?.name || '—'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Event title" />
              </div>
              <div>
                <Label>End date (optional)</Label>
                <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Leave as start date for a single-day entry.</p>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Optional details"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCustomEvent} disabled={isSavingCustom}>
                {isSavingCustom ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
              <DialogDescription>
                {selectedEvent && TYPE_STYLES[selectedEvent.type]?.label} ·{' '}
                {selectedEvent?.type === 'exam' ? 'Linked exam' : 'Calendar entry'}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-3 text-sm">
                <div>
                  <Label>Start</Label>
                  <p className="text-gray-800">
                    {new Date(selectedEvent.startDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div>
                  <Label>End</Label>
                  <p className="text-gray-800">
                    {new Date(selectedEvent.endDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                {selectedEvent.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
                {selectedEvent.meta?.subject && (
                  <p className="text-gray-600">
                    Subject: <span className="font-medium">{selectedEvent.meta.subject}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <Eye className="h-4 w-4" />
                  <span>Read-only</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
