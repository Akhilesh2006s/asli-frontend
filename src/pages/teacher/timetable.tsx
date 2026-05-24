import { useEffect } from 'react';
import { useLocation } from 'wouter';

/** Redirect legacy /teacher/timetable URL to dashboard timetable tab. */
export default function TeacherTimetablePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/teacher/dashboard?tab=timetable');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-600">Opening your timetable…</p>
    </div>
  );
}
