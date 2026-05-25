import { useMemo } from 'react';
import StudentTimetableView from '@/components/student/StudentTimetableView';
import { studentTimetableSampleWeek } from '@/data/student-timetable-sample';
import type { TimetableEntry } from '@/types/timetable';

export type StudentTimetableDashboardProps = {
  entries?: TimetableEntry[];
  isLoading?: boolean;
  studentName?: string;
  studentClass?: string;
  attendancePercent?: number;
  /** Use demo data when API returns no sessions */
  fallbackToDummy?: boolean;
  onAskAi?: () => void;
};

function sampleSessionsToEntries(): TimetableEntry[] {
  return studentTimetableSampleWeek.sessions.map((s) => ({
    _id: s._id,
    date: s.date,
    day: s.day,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: 60,
    classId: 'sample-class',
    sectionId: 'A',
    subjectId: { _id: `sub-${s._id}`, name: s.subject },
    teacherId: { _id: `tch-${s._id}`, fullName: s.teacher, email: '' },
    room: s.room,
    repeatRule: 'none' as const,
    sessionType: s.sessionType as TimetableEntry['sessionType'],
    attendanceRequired: s.attendanceRequired,
    status: s.status as TimetableEntry['status'],
    createdAt: s.date,
    updatedAt: s.date,
  }));
}

/**
 * Student weekly timetable — delegates to {@link StudentTimetableView}.
 * Keeps this export for routes/imports that reference the dashboard module.
 */
export default function StudentTimetableDashboard({
  entries = [],
  isLoading = false,
  fallbackToDummy = false,
}: StudentTimetableDashboardProps) {
  const displayEntries = useMemo(() => {
    if (entries.length > 0) return entries;
    if (fallbackToDummy && !isLoading) return sampleSessionsToEntries();
    return entries;
  }, [entries, fallbackToDummy, isLoading]);

  return <StudentTimetableView entries={displayEntries} isLoading={isLoading} />;
}
