import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  GENERATION_RECORD_COUNT_MAX,
  GENERATION_RECORD_COUNT_MIN,
  sanitizeGenerationRecordCountInput,
} from "@/lib/generation-record-count";

type GenerationRecordCountFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
};

export function GenerationRecordCountField({
  id = "generation-record-count",
  value,
  onChange,
  disabled = false,
  className,
  labelClassName,
}: GenerationRecordCountFieldProps) {
  return (
    <div className={cn("max-w-xs space-y-2", className)}>
      <Label htmlFor={id} className={labelClassName}>
        Records to generate
      </Label>
      <Input
        id={id}
        type="number"
        min={GENERATION_RECORD_COUNT_MIN}
        max={GENERATION_RECORD_COUNT_MAX}
        placeholder={`${GENERATION_RECORD_COUNT_MIN}–${GENERATION_RECORD_COUNT_MAX}`}
        value={value}
        onChange={(e) => {
          const next = sanitizeGenerationRecordCountInput(e.target.value);
          if (next !== null) onChange(next);
        }}
        disabled={disabled}
        className="bg-white"
      />
      <p className="text-xs text-slate-600">
        Only {GENERATION_RECORD_COUNT_MIN}–{GENERATION_RECORD_COUNT_MAX} allowed. Other values are not accepted.
      </p>
    </div>
  );
}
