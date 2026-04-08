import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  eduottClassToSelectValue,
  eduottSelectValueToClass,
  useEduOTTFilters,
} from '@/contexts/edu-ott-filter-context';
import { Filter, X } from 'lucide-react';

const SUBJECT_ALL = '__all__';

type EduOTTGlobalFilterBarProps = {
  classOptions: string[];
  subjectOptions: string[];
};

export function EduOTTGlobalFilterBar({
  classOptions,
  subjectOptions,
}: EduOTTGlobalFilterBarProps) {
  const {
    selectedClass,
    selectedSubject,
    setSelectedClass,
    setSelectedSubject,
    clearFilters,
    clearClass,
    clearSubject,
  } = useEduOTTFilters();

  const hasActive =
    selectedClass != null ||
    selectedSubject != null;

  return (
    <div className="space-y-3 rounded-xl border border-sky-200/80 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="space-y-1.5 w-full sm:w-auto min-w-[180px]">
          <Label className="text-xs text-gray-500">Select class</Label>
          <Select
            value={eduottClassToSelectValue(selectedClass)}
            onValueChange={(v) => setSelectedClass(eduottSelectValueToClass(v))}
          >
            <SelectTrigger className="w-full md:w-[200px] bg-white">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={eduottClassToSelectValue(null)}>All classes</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 w-full sm:w-auto min-w-[200px]">
          <Label className="text-xs text-gray-500">Select subject</Label>
          <Select
            value={selectedSubject ?? SUBJECT_ALL}
            onValueChange={(v) =>
              setSelectedSubject(v === SUBJECT_ALL ? null : v)
            }
          >
            <SelectTrigger className="w-full md:w-[220px] bg-white">
              <Filter className="w-4 h-4 mr-2 shrink-0 text-gray-500" />
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SUBJECT_ALL}>All subjects</SelectItem>
              {subjectOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!hasActive}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {hasActive ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Active:</span>
          {selectedClass != null ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100"
              onClick={clearClass}
            >
              Class: {selectedClass}
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          {selectedSubject != null ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-100"
              onClick={clearSubject}
            >
              Subject: {selectedSubject}
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
