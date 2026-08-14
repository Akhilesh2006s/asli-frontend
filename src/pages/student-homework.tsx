import StudentShell from '@/components/layout/StudentShell';
import { StudentHomeworkView } from '@/components/student/StudentHomeworkView';
import { SchoolOnlyGuard } from '@/components/student/SchoolOnlyGuard';

export default function StudentHomeworkPage() {
  return (
    <SchoolOnlyGuard>
      <StudentShell>
        <div className="mx-auto w-full max-w-4xl">
          <StudentHomeworkView />
        </div>
      </StudentShell>
    </SchoolOnlyGuard>
  );
}
