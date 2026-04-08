import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-config';
import { BookMarked, Loader2 } from 'lucide-react';

type Entry = {
  _id: string;
  forDate: string;
  title?: string;
  content: string;
  teacherId?: { fullName?: string; email?: string };
};

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

export function AdminTeacherDiaryFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/api/admin/teacher-work-diary?limit=25`, {
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
      <Card className="border-indigo-100 bg-white/90">
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-white/90 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BookMarked className="h-4 w-4" />
          </span>
          Teacher daily diaries
        </CardTitle>
        <p className="text-sm text-gray-600">
          Recent class updates from teachers in your school (newest first).
        </p>
      </CardHeader>
      <CardContent className="max-h-[min(400px,50vh)] space-y-3 overflow-y-auto">
        {entries.map((e) => (
          <div key={e._id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {formatDay(e.forDate)}
              {e.teacherId && typeof e.teacherId === 'object' && e.teacherId.fullName ? (
                <span className="ml-2 font-normal normal-case text-gray-600">
                  · {e.teacherId.fullName}
                </span>
              ) : null}
            </p>
            {e.title ? <p className="mt-1 font-semibold text-gray-900">{e.title}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{e.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
