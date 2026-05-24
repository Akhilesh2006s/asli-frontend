import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { BookMarked, GraduationCap, Loader2 } from 'lucide-react';

export type AssignedClassOption = {
  id: string;
  label: string;
};

type ClassRef = {
  _id?: string;
  classNumber?: string;
  section?: string;
  name?: string;
};

type DiaryEntry = {
  _id: string;
  forDate: string;
  title?: string;
  content: string;
  classDisplay?: string;
  classId?: string | ClassRef;
};

function formatClassSectionLabel(ref: ClassRef) {
  if (ref.classNumber) {
    const section = ref.section?.trim();
    return section ? `Class ${ref.classNumber} - ${section}` : `Class ${ref.classNumber}`;
  }
  return ref.name || null;
}

function normalizeClassKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

function getEntryClassId(entry: DiaryEntry): string | null {
  const ref = entry.classId;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && ref._id) return String(ref._id);
  return null;
}

function entryMatchesClassFilter(
  entry: DiaryEntry,
  selectedClassId: string,
  classById: Map<string, string>
): boolean {
  const entryClassId = getEntryClassId(entry);
  if (entryClassId && entryClassId === selectedClassId) return true;

  const entryLabel = resolveEntryClassLabel(entry, classById);
  const selectedLabel = classById.get(selectedClassId);
  if (entryLabel && selectedLabel) {
    return normalizeClassKey(entryLabel) === normalizeClassKey(selectedLabel);
  }
  return false;
}

function resolveEntryClassLabel(
  entry: DiaryEntry,
  classById: Map<string, string>
): string | null {
  if (entry.classDisplay?.trim()) return entry.classDisplay.trim();
  const ref = entry.classId;
  if (ref && typeof ref === 'object') {
    return formatClassSectionLabel(ref);
  }
  if (typeof ref === 'string') {
    return classById.get(ref) ?? null;
  }
  return null;
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string | null;
  teacherName: string;
  assignedClasses?: AssignedClassOption[];
};

export function AdminTeacherDailyDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  assignedClasses = [],
}: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const classById = useMemo(() => {
    const map = new Map<string, string>();
    assignedClasses.forEach((c) => {
      if (c.id && c.label) map.set(c.id, c.label);
    });
    return map;
  }, [assignedClasses]);

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(
        `${API_BASE_URL}/api/admin/teacher-work-diary?teacherId=${encodeURIComponent(teacherId)}&limit=40`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEntries(data.data);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const filteredEntries = useMemo(() => {
    if (!selectedClassId) return entries;
    return entries.filter((e) => entryMatchesClassFilter(e, selectedClassId, classById));
  }, [entries, selectedClassId, classById]);

  useEffect(() => {
    if (open && teacherId) {
      load();
      setSelectedClassId(null);
    } else if (!open) {
      setEntries([]);
      setSelectedClassId(null);
    }
  }, [open, teacherId, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BookMarked className="h-4 w-4" aria-hidden />
            </span>
            Daily — {teacherName}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>Class updates logged by this teacher (newest first).</p>
              {assignedClasses.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                  <span className="text-xs font-medium text-gray-700">Assigned:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedClassId === null ? 'default' : 'outline'}
                    className={cn(
                      'h-7 rounded-md px-2.5 text-xs font-medium',
                      selectedClassId === null
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
                    )}
                    onClick={() => setSelectedClassId(null)}
                  >
                    All
                  </Button>
                  {assignedClasses.map((c) => {
                    const isActive = selectedClassId === c.id;
                    return (
                      <Button
                        key={c.id}
                        type="button"
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className={cn(
                          'h-7 rounded-md px-2.5 text-xs font-medium',
                          isActive
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                        )}
                        onClick={() => setSelectedClassId(isActive ? null : c.id)}
                      >
                        {c.label}
                      </Button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
          ) : entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No daily entries yet for this teacher.
            </p>
          ) : filteredEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No daily entries for{' '}
              {selectedClassId ? classById.get(selectedClassId) ?? 'this class' : 'this class'} yet.
            </p>
          ) : (
            filteredEntries.map((e) => {
              const classLabel = resolveEntryClassLabel(e, classById);
              return (
                <div key={e._id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      {formatDay(e.forDate)}
                    </p>
                    {classLabel ? (
                      <Badge className="rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-600">
                        {classLabel}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-md border-gray-300 text-gray-500 text-xs font-normal"
                      >
                        Class not specified
                      </Badge>
                    )}
                  </div>
                  {e.title ? <p className="font-semibold text-gray-900">{e.title}</p> : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{e.content}</p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
