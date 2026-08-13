import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';
import { useTimetablePhoto } from '@/hooks/useTimetable';

type Props = {
  entries?: unknown;
  isLoading?: boolean;
  schoolName?: string;
};

function resolveSchoolLabel(explicit?: string): string {
  const trimmed = String(explicit || '').trim();
  if (trimmed) return trimmed;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const stored = JSON.parse(raw) as {
      schoolName?: string;
      assignedAdmin?: { schoolName?: string };
    };
    return String(stored?.assignedAdmin?.schoolName || stored?.schoolName || '').trim();
  } catch {
    return '';
  }
}

export default function StudentTimetableView({
  isLoading: isLoadingProp,
  schoolName: schoolNameProp,
}: Props) {
  const { data: photo, isLoading: fetchLoading } = useTimetablePhoto(undefined, {
    enabled: true,
  });
  const isLoading = isLoadingProp ?? fetchLoading;
  const schoolLabel = useMemo(() => resolveSchoolLabel(schoolNameProp), [schoolNameProp]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setImageFailed(false);
    setImageUrl('');

    if (!photo?.imageUrl) {
      setImageLoading(false);
      return;
    }

    setImageLoading(true);
    (async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/timetable/photo/file`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (!String(blob.type || '').startsWith('image/')) {
          throw new Error('Response was not an image');
        }
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        if (!cancelled) setImageFailed(true);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo?.imageUrl, photo?.updatedAt]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-sky-50 via-white to-teal-50 pb-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-lg shadow-sky-200/50"
            >
              <CalendarDays className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              {schoolLabel ? (
                <p className="max-w-[220px] truncate text-micro font-semibold tracking-wide text-sky-700 sm:max-w-md sm:text-xs">
                  {schoolLabel}
                </p>
              ) : null}
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Class Timetable
                {photo?.label ? (
                  <span className="ml-2 text-base font-semibold text-sky-600 sm:text-lg">
                    · {photo.label}
                  </span>
                ) : null}
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                Photo uploaded by your school · pinch / zoom to read
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {isLoading || imageLoading ? (
            <div className="h-56 animate-pulse rounded-xl bg-sky-50" />
          ) : imageUrl && !imageFailed ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-sky-100 bg-slate-50"
            >
              <img
                src={imageUrl}
                alt={photo?.label ? `${photo.label} timetable` : 'Class timetable'}
                className="mx-auto max-h-[min(75vh,900px)] w-full object-contain"
              />
            </motion.div>
          ) : photo?.imageUrl || imageFailed ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-4 py-12 text-center">
              <ImageOff className="h-8 w-8 text-amber-400" />
              <p className="text-sm font-medium text-slate-700">Timetable photo file missing</p>
              <p className="max-w-sm text-xs text-slate-500">
                The school uploaded a timetable record, but the image file is not on the server.
                Ask admin to open Timetable and upload the class photo again.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 px-4 py-12 text-center">
              <ImageOff className="h-8 w-8 text-sky-300" />
              <p className="text-sm font-medium text-slate-700">No timetable photo yet</p>
              <p className="text-xs text-slate-500">
                Ask your school admin or teacher to upload the class timetable photo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
