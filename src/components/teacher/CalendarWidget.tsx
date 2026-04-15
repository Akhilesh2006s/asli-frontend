import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import 'react-day-picker/dist/style.css';

type CalendarWidgetProps = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  /** Highlight days that have timetable entries */
  hasScheduleOnDate: (date: Date) => boolean;
  hasExamOnDate: (date: Date) => boolean;
  hasAdminEventOnDate: (date: Date) => boolean;
};

export function CalendarWidget({
  selected,
  onSelect,
  hasScheduleOnDate,
  hasExamOnDate,
  hasAdminEventOnDate,
}: CalendarWidgetProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5',
        'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]'
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm ring-4 ring-indigo-600/10">
          <CalendarDays className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div>
          <h4 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
            Calendar
          </h4>
          <p className="text-xs text-gray-500 sm:text-sm">Select a day to view your timetable</p>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto rounded-xl border border-gray-100 bg-gray-50/50 px-1 py-3 sm:px-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          className="rounded-lg border-0 bg-transparent p-0"
          modifiers={{
            hasSchedule: hasScheduleOnDate,
            hasExam: hasExamOnDate,
            hasAdminEvent: hasAdminEventOnDate,
          }}
          modifiersClassNames={{
            hasSchedule: cn('font-semibold text-indigo-700 bg-indigo-50'),
            hasExam: cn(
              'relative',
              'before:absolute before:right-1 before:top-1 before:h-1.5 before:w-1.5 before:rounded-full before:bg-red-500'
            ),
            hasAdminEvent: cn(
              'relative',
              'after:absolute after:left-1 after:top-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-violet-500'
            ),
          }}
          classNames={{
            months: 'flex flex-col space-y-4',
            month: 'space-y-4',
            caption: 'relative flex items-center justify-center px-1 pt-1',
            caption_label: 'text-sm font-semibold text-gray-900',
            nav: 'flex items-center gap-1',
            nav_button: cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white',
              'text-gray-700 transition-colors duration-200 hover:bg-gray-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'
            ),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse',
            head_row: 'flex w-full',
            head_cell: 'w-9 text-[0.7rem] font-medium uppercase text-gray-400',
            row: 'mt-2 flex w-full',
            cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
            day: cn(
              'h-9 w-9 rounded-lg p-0 font-normal text-gray-800',
              'transition-colors duration-200 ease-out',
              'hover:bg-gray-100',
              'aria-selected:opacity-100'
            ),
            day_selected: cn(
              '!bg-indigo-600 !text-white shadow-sm',
              'hover:!bg-indigo-600 hover:!text-white',
              'focus:!bg-indigo-600 focus:!text-white',
              'rounded-lg'
            ),
            day_today: cn(
              'bg-indigo-50 font-semibold text-indigo-900',
              'ring-2 ring-indigo-200 ring-offset-1',
              '[&:not([data-selected])]:hover:bg-indigo-100'
            ),
            day_outside: 'text-gray-300 aria-selected:text-white',
            day_disabled: 'text-gray-300 opacity-40',
            day_hidden: 'invisible',
          }}
        />
      </div>
    </div>
  );
}
