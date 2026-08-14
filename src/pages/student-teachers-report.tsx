import StudentShell from '@/components/layout/StudentShell';
import { StudentTeacherDiaryFeed } from '@/components/student/StudentTeacherDiaryFeed';
import { SchoolOnlyGuard } from '@/components/student/SchoolOnlyGuard';

export default function StudentTeachersReportPage() {
  return (
    <SchoolOnlyGuard>
      <StudentShell>
        <div className="mx-auto w-full max-w-4xl">
          <StudentTeacherDiaryFeed />
        </div>
      </StudentShell>
    </SchoolOnlyGuard>
  );
}
