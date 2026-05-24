import { useEffect } from 'react';
import { useLocation } from 'wouter';

/** Redirect legacy /admin/timetable URL to dashboard tab (keeps admin sidebar). */
export default function AdminTimetablePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/admin/dashboard?tab=timetable');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <p className="text-sm text-gray-600">Opening timetable…</p>
    </div>
  );
}
