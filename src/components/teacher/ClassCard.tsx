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
  const normalized = schedule?.trim() || '';
  if (
    !normalized ||
    normalized === 'N/A' ||
    normalized.toLowerCase() === 'not scheduled'
  ) {
    return <span className="text-xs sm:text-sm text-gray-500">Not scheduled</span>;
  }
  const parts = schedule
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return <span className="text-xs sm:text-sm text-gray-700">{schedule}</span>;
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

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700 ring-indigo-200',
  'bg-violet-100 text-violet-700 ring-violet-200',
  'bg-sky-100 text-sky-700 ring-sky-200',
  'bg-teal-100 text-teal-700 ring-teal-200',
  'bg-amber-100 text-amber-800 ring-amber-200',
  'bg-rose-100 text-rose-700 ring-rose-200',
] as const;

function studentInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
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
        'group flex h-full flex-col rounded-xl border border-gray-100 bg-white p-4',
        'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]',
        'transition-all duration-200 ease-out',
        'hover:border-gray-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.08)]'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-bold leading-tight tracking-tight text-gray-900">
          {name}
        </h3>
        <Badge className="shrink-0 rounded-full border-0 bg-emerald-50 px-2 py-0.5 text-micro font-semibold text-emerald-700 ring-1 ring-emerald-100">
          Active
        </Badge>
      </div>

      <div className="mb-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50/70 p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
            Teaching aids
          </p>
        </div>
        <p className="text-sm font-medium leading-snug text-slate-800">
          {subject?.trim() || 'No teaching aids assigned'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Subjects you teach in this class — use these for lessons, worksheets, and Vidya AI tools.
        </p>
      </div>

      <div className="space-y-2.5 border-t border-gray-100 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/80">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
            </span>
            Students
          </span>
          <span className="font-semibold tabular-nums text-gray-900">{studentCount}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-gray-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 ring-1 ring-amber-200/80">
              <CalendarRange className="h-4 w-4" aria-hidden />
            </span>
            Schedule
          </span>
          <ScheduleChips schedule={schedule} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600 ring-1 ring-teal-200/80">
              <DoorOpen className="h-4 w-4 shrink-0" aria-hidden />
            </span>
            Room
          </span>
          <span className="font-medium text-gray-900">{room}</span>
        </div>
      </div>

      {expanded && students && students.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-indigo-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
            Students in this class
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-indigo-100/80 bg-gradient-to-br from-sky-50 via-indigo-50/80 to-violet-50 p-2.5">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-white/95 px-3 py-2.5 shadow-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    className={cn(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ring-1',
                      avatarTone(student.id || student.name || student.email)
                    )}
                    aria-hidden="true"
                  >
                    {studentInitials(student.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-indigo-950 sm:text-sm">
                      {student.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{student.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {onViewStudentAnalysis ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 rounded-lg border-indigo-300 bg-indigo-50/60 px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewStudentAnalysis(student.id);
                      }}
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                      Analysis
                    </Button>
                  ) : null}
                  <Badge className="border-0 bg-emerald-100 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    {student.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Button
          type="button"
          className={cn(
            'h-10 w-full rounded-xl text-sm font-semibold shadow-sm transition-all duration-200',
            'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
            'hover:from-indigo-700 hover:to-violet-700 hover:shadow-md',
            'active:scale-[0.99]'
          )}
          onClick={onToggleStudents}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-2 h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
              Hide Students
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
              View Students
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
