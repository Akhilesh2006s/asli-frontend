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

  const hasActive = selectedClass != null || selectedSubject != null;

  return (
    <div className="space-y-4 rounded-2xl border border-ink/10 bg-mist/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="w-full space-y-2 lg:w-auto lg:min-w-[180px]">
          <Label className="text-base text-muted-foreground">Select class</Label>
          <Select
            value={eduottClassToSelectValue(selectedClass)}
            onValueChange={(v) => setSelectedClass(eduottSelectValueToClass(v))}
          >
            <SelectTrigger className="h-12 w-full border-ink/10 bg-white text-base lg:w-[200px]">
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
        <div className="w-full space-y-2 lg:w-auto lg:min-w-[200px]">
          <Label className="text-base text-muted-foreground">Select subject</Label>
          <Select
            value={selectedSubject ?? SUBJECT_ALL}
            onValueChange={(v) => setSelectedSubject(v === SUBJECT_ALL ? null : v)}
          >
            <SelectTrigger className="h-12 w-full border-ink/10 bg-white text-base lg:w-[220px]">
              <Filter className="mr-2 h-5 w-5 shrink-0 text-teal-green-600" />
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
            className="h-12"
            disabled={!hasActive}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <div className={`flex min-h-[32px] flex-wrap items-center gap-2 ${hasActive ? '' : 'invisible'}`}>
        <span className="text-base font-medium text-muted-foreground">Active:</span>
        {selectedClass != null ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-green-50 px-3 py-1.5 text-[0.9375rem] font-semibold text-teal-green-800 ring-1 ring-teal-green-200"
            onClick={clearClass}
          >
            Class: {selectedClass}
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        {selectedSubject != null ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[0.9375rem] font-semibold text-amber-900 ring-1 ring-amber-200"
            onClick={clearSubject}
          >
            Subject: {selectedSubject}
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
