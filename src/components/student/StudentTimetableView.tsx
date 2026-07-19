import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTimetableEntries } from '@/hooks/useTimetable';
import type { TimetableEntry } from '@/types/timetable';
import { WeeklyTimetableGrid } from '@/components/timetable/WeeklyTimetableGrid';
import { buildWeekdayPlacements } from '@/lib/student-timetable-utils';

type Props = {
  entries?: TimetableEntry[];
  isLoading?: boolean;
  /** School label above "Class Timetable" (from admin / student profile) */
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
    return (
      String(stored?.assignedAdmin?.schoolName || stored?.schoolName || '').trim()
    );
  } catch {
    return '';
  }
}

export default function StudentTimetableView({
  entries: entriesProp,
  isLoading: isLoadingProp,
  schoolName: schoolNameProp,
}: Props) {
  const { data: fetchedEntries = [], isLoading: fetchLoading } = useTimetableEntries(
    {},
    { enabled: !entriesProp }
  );

  const rawEntries = entriesProp ?? fetchedEntries;
  const isLoading = isLoadingProp ?? (entriesProp ? false : fetchLoading);

  const placements = useMemo(() => buildWeekdayPlacements(rawEntries), [rawEntries]);
  const sessionCount = placements.length;
  const schoolLabel = useMemo(() => resolveSchoolLabel(schoolNameProp), [schoolNameProp]);

  return (
    <div className="space-y-4">
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-sky-50 via-white to-indigo-50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50"
              >
                <CalendarDays className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                {schoolLabel ? (
                  <p className="text-micro sm:text-xs font-semibold text-indigo-600 tracking-wide truncate max-w-[220px] sm:max-w-md">
                    {schoolLabel}
                  </p>
                ) : null}
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Class Timetable
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Monday – Saturday · same schedule every week
                </p>
              </div>
            </div>

            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 px-3 py-1 text-sm font-semibold">
              {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              {sessionCount === 0 && (
                <p className="text-center text-xs text-gray-500 mb-3 pb-2 border-b border-dashed border-gray-200">
                  No classes in your weekly timetable yet.
                </p>
              )}
              <WeeklyTimetableGrid entries={rawEntries} variant="student" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
