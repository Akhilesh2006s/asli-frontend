import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedScheduleEntry } from '@/components/teacher/schedule-types';
import { CalendarOff, Clock, MapPin, Plus, Trash2 } from 'lucide-react';

type TimetableSectionProps = {
  dateLabel: string;
  entries: UnifiedScheduleEntry[];
  onAddSlot: () => void;
  onRemoveSlot: (id: string) => void;
  canAdd: boolean;
  onEntryClick: (entry: UnifiedScheduleEntry) => void;
};

export function TimetableSection({
  dateLabel,
  entries,
  onAddSlot,
  onRemoveSlot,
  canAdd,
  onEntryClick,
}: TimetableSectionProps) {
  const getEventBadgeClasses = (eventType: UnifiedScheduleEntry['eventType']) => {
    if (eventType === 'exam') {
      return 'border-red-200 bg-red-50 text-red-700';
    }
    if (eventType === 'admin_event') {
      return 'border-violet-200 bg-violet-50 text-violet-700';
    }
    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  const getEventLabel = (eventType: UnifiedScheduleEntry['eventType']) => {
    if (eventType === 'exam') return 'Exam';
    if (eventType === 'admin_event') return 'Admin Event';
    return 'Class';
  };

  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5',
        'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]'
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-sm ring-4 ring-violet-600/10">
              <Clock className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div>
              <h4 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                Timetable
              </h4>
              <p className="truncate text-xs text-gray-500 sm:text-sm">{dateLabel}</p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!canAdd}
          className={cn(
            'h-11 w-full shrink-0 rounded-xl px-4 font-semibold shadow-sm transition-all duration-200 sm:h-10 sm:w-auto',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'disabled:opacity-50'
          )}
          onClick={onAddSlot}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Add Slot
        </Button>
      </div>

      {entries.length === 0 ? (
        <div
          className={cn(
            'flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center',
            'transition-colors duration-200'
          )}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <CalendarOff className="h-7 w-7" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="text-base font-semibold text-gray-900">No schedule for this day</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">Select another date or add a class slot</p>
        </div>
      ) : (
        <ul className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-0.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className={cn(
                'group flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4',
                'shadow-sm transition-all duration-200',
                'hover:border-indigo-100 hover:shadow-md'
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 space-y-2 text-left"
                onClick={() => onEntryClick(e)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {e.startTime} – {e.endTime}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-xs font-semibold',
                      getEventBadgeClasses(e.eventType)
                    )}
                  >
                    {getEventLabel(e.eventType)}
                  </span>
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{e.title}</p>
                </div>
                {e.subject ? <p className="text-sm text-gray-600">Subject: {e.subject}</p> : null}
                {e.classNumber ? <p className="text-sm text-gray-600">Class: {e.classNumber}</p> : null}
                {e.room ? (
                  <p className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                    {e.room}
                  </p>
                ) : null}
              </button>
              {e.removable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  onClick={() => onRemoveSlot(e.id)}
                  aria-label="Remove slot"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
