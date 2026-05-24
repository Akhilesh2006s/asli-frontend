import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BookMarked, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ClassRef = {
  classNumber?: string;
  section?: string;
  name?: string;
};

type Entry = {
  _id: string;
  forDate: string;
  title?: string;
  content: string;
  classDisplay?: string;
  teacherId?: { fullName?: string; email?: string };
  classId?: string | ClassRef;
};

function formatClassSectionLabel(ref: ClassRef) {
  if (ref.classNumber) {
    const section = ref.section?.trim();
    return section ? `Class ${ref.classNumber} - ${section}` : `Class ${ref.classNumber}`;
  }
  return ref.name || 'Class';
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

export function StudentTeacherDiaryFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/api/student/teacher-work-diary?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setEntries(data.data);
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BookMarked className="h-3 w-3 sm:h-4 sm:w-4" />
          </span>
          From your teachers
        </CardTitle>
        <p className="text-xs sm:text-sm text-gray-600">Daily class updates from teachers at your school.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((e) => {
          const classLabel =
            e.classDisplay?.trim() ||
            (e.classId && typeof e.classId === 'object' ? formatClassSectionLabel(e.classId) : null);
          return (
          <div
            key={e._id}
            className="rounded-xl border border-gray-100 bg-white/90 p-4 shadow-sm"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {formatDay(e.forDate)}
                {e.teacherId && typeof e.teacherId === 'object' && e.teacherId.fullName ? (
                  <span className="ml-2 font-normal normal-case text-gray-500">
                    · {e.teacherId.fullName}
                  </span>
                ) : null}
              </p>
              {classLabel ? (
                <Badge className="rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-600">
                  {classLabel}
                </Badge>
              ) : null}
            </div>
            {e.title ? <p className="mt-1 font-semibold text-gray-900">{e.title}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-xs sm:text-sm text-gray-700">{e.content}</p>
          </div>
        );
        })}
      </CardContent>
    </Card>
  );
}
