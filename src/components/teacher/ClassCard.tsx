import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Users,
} from 'lucide-react';

export type ClassCardStudent = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export type ClassCardProps = {
  name: string;
  subject: string;
  studentCount: number;
  schedule: string;
  room: string;
  expanded: boolean;
  onToggleStudents: () => void;
  students?: ClassCardStudent[];
  /** Opens teacher Students → Track Progress filtered to this student */
  onViewStudentAnalysis?: (studentId: string) => void;
};

/** Split schedule like "Mon, Wed, Fri" into chips */
function ScheduleChips({ schedule }: { schedule: string }) {
  if (!schedule?.trim()) {
    return <span className="text-sm text-gray-500">—</span>;
  }
  const parts = schedule
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return <span className="text-sm text-gray-700">{schedule}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Schedule days">
      {parts.map((day, i) => (
        <span
          key={`${day}-${i}`}
          className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-100"
        >
          {day.length <= 4 ? day : day.slice(0, 3)}
        </span>
      ))}
    </div>
  );
}

export function ClassCard({
  name,
  subject,
  studentCount,
  schedule,
  room,
  expanded,
  onToggleStudents,
  students,
  onViewStudentAnalysis,
}: ClassCardProps) {
  return (
    <article
      className={cn(
        'group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 sm:p-6',
        'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]',
        'transition-all duration-200 ease-out',
        'hover:border-gray-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.08)]'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight tracking-tight text-gray-900 sm:text-2xl">
            {name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <BookOpen className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <span className="truncate">{subject}</span>
          </p>
        </div>
        <Badge className="shrink-0 rounded-full border-0 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          Active
        </Badge>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            Students
          </span>
          <span className="font-semibold tabular-nums text-gray-900">{studentCount}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="flex shrink-0 items-center gap-2 text-sm text-gray-500">
            <CalendarRange className="h-4 w-4 text-gray-400" aria-hidden />
            Schedule
          </span>
          <div className="min-w-0 sm:text-right">
            <ScheduleChips schedule={schedule} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-500">
            <DoorOpen className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            Room
          </span>
          <span className="truncate font-medium text-gray-900">{room}</span>
        </div>
      </div>

      {expanded && students && students.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Students
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-gray-50/80 p-2">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-gray-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{student.name}</p>
                  <p className="truncate text-xs text-gray-500">{student.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {onViewStudentAnalysis ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-lg border-indigo-200 px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewStudentAnalysis(student.id);
                      }}
                    >
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                      Analysis
                    </Button>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="border-emerald-200 text-xs text-emerald-700"
                  >
                    {student.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <Button
          type="button"
          className={cn(
            'h-11 w-full rounded-xl text-[15px] font-semibold shadow-sm transition-all duration-200',
            'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
            'hover:from-indigo-700 hover:to-violet-700 hover:shadow-md',
            'active:scale-[0.99]'
          )}
          onClick={onToggleStudents}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" aria-hidden />
              Hide Students
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" aria-hidden />
              View Students
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
