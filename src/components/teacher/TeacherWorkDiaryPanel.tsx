import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/api-config';
import { BookMarked, Loader2, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiaryEntry = {
  _id: string;
  forDate: string;
  title?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

function formatDiaryDay(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function TeacherWorkDiaryPanel({ className }: { className?: string }) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/teacher/work-diary?limit=40`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEntries(data.data);
      } else {
        setEntries([]);
      }
    } catch {
      setError('Could not load diary');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/teacher/work-diary`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Save failed');
        return;
      }
      setTitle('');
      setContent('');
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this diary entry?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/teacher/work-diary/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      setError('Delete failed');
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm sm:p-6',
        className
      )}
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md ring-4 ring-indigo-600/15">
            <BookMarked className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
              Daily work diary
            </h3>
            <p className="text-sm text-gray-600">
              Log what you covered today — visible to your students and school admin.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-b border-indigo-100/80 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="diary-date">Date</Label>
            <Input
              id="diary-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-gray-200 bg-white"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="diary-title">Title (optional)</Label>
            <Input
              id="diary-title"
              placeholder="e.g. Algebra — quadratic equations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border-gray-200 bg-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="diary-content">Today&apos;s work</Label>
          <Textarea
            id="diary-content"
            placeholder="Topics taught, activities, homework given, notes for parents…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="rounded-xl border-gray-200 bg-white"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            disabled={saving || !content.trim()}
            onClick={handleSave}
            className="h-11 w-full rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700 sm:w-auto"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save entry
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="pt-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent entries
        </h4>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-8 text-center text-sm text-gray-500">
            No diary entries yet. Add one above — it will show for students linked to your classes and
            for your school administrator.
          </p>
        ) : (
          <ul className="max-h-[min(360px,50vh)] space-y-3 overflow-y-auto pr-1">
            {entries.map((e) => (
              <li
                key={e._id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      {formatDiaryDay(e.forDate)}
                    </p>
                    {e.title ? (
                      <p className="mt-1 font-semibold text-gray-900">{e.title}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{e.content}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(e._id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
