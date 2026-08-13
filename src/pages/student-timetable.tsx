import StudentShell from '@/components/layout/StudentShell';
import StudentTimetableView from '@/components/student/StudentTimetableView';

/** Student timetable page — shows the class+section photo uploaded by admin/teacher. */
export default function StudentTimetablePage() {
  return (
    <StudentShell>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <StudentTimetableView />
      </div>
    </StudentShell>
  );
}
