import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_STEP = 5;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseHhMm(raw: string): { h: number; m: number } | null {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return { h, m: min };
}

function formatHhMm(h: number, m: number): string {
  return `${pad2(h)}:${pad2(m)}`;
}

function buildMinuteOptions(currentMinute: number): string[] {
  const set = new Set<string>();
  for (let i = 0; i < 60; i += MINUTE_STEP) set.add(pad2(i));
  set.add(pad2(currentMinute));
  return [...set].sort((a, b) => Number(a) - Number(b));
}

type WheelColumnProps = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  'aria-label': string;
};

const ITEM_H = 36;

function WheelColumn({ options, value, onChange, 'aria-label': ariaLabel }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ignoreScroll = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const index = Math.max(0, options.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    ignoreScroll.current = true;
    el.scrollTop = index * ITEM_H;
    const t = setTimeout(() => {
      ignoreScroll.current = false;
    }, 80);
    return () => clearTimeout(t);
  }, [index, options]);

  const snapToNearest = useCallback(() => {
    const el = ref.current;
    if (!el || !options.length) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(options.length - 1, i));
    const next = options[clamped];
    ignoreScroll.current = true;
    el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
    if (next && next !== value) onChange(next);
    setTimeout(() => {
      ignoreScroll.current = false;
    }, 180);
  }, [onChange, options, value]);

  const onScroll = () => {
    if (ignoreScroll.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(snapToNearest, 90);
  };

  return (
    <div className="relative h-[108px] w-[4.25rem] overflow-hidden rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/80 via-white to-orange-50/80 shadow-inner">
      <div
        className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-9 -translate-y-1/2 rounded-lg border border-orange-300/70 bg-orange-100/35"
        aria-hidden
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const delta = e.key === 'ArrowUp' ? -1 : 1;
            const nextIdx = Math.max(0, Math.min(options.length - 1, index + delta));
            onChange(options[nextIdx]);
          }
        }}
        className="h-full overflow-y-auto scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}
      >
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                'flex h-9 w-full snap-center items-center justify-center text-sm tabular-nums transition-all duration-200',
                selected
                  ? 'scale-110 font-bold text-orange-900'
                  : 'scale-95 font-medium text-stone-400',
              )}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type ScrollTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
};

/** Scroll-wheel hour/minute picker with typed HH:MM entry. */
export function ScrollTimePicker({
  value,
  onChange,
  className,
  disabled,
  id,
}: ScrollTimePickerProps) {
  const parsed = parseHhMm(value) || { h: 9, m: 0 };
  const hour = pad2(parsed.h);
  const minute = pad2(parsed.m);
  const minuteOptions = useMemo(() => buildMinuteOptions(parsed.m), [parsed.m]);

  const [typed, setTyped] = useState(value || formatHhMm(parsed.h, parsed.m));

  useEffect(() => {
    setTyped(value || '');
  }, [value]);

  const emit = useCallback(
    (h: string, m: string) => {
      const next = `${h}:${m}`;
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  const commitTyped = () => {
    const p = parseHhMm(typed);
    if (!p) {
      setTyped(value || formatHhMm(9, 0));
      return;
    }
    const next = formatHhMm(p.h, p.m);
    setTyped(next);
    if (next !== value) onChange(next);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-1.5',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <WheelColumn
          aria-label="Hour"
          options={HOURS}
          value={hour}
          onChange={(h) => emit(h, minute)}
        />
        <span className="text-lg font-bold text-orange-800/70">:</span>
        <WheelColumn
          aria-label="Minute"
          options={minuteOptions}
          value={minute}
          onChange={(m) => emit(hour, m)}
        />
      </div>
      <Input
        id={id}
        disabled={disabled}
        inputMode="numeric"
        placeholder="HH:MM"
        aria-label="Type time"
        className="h-9 w-[5.5rem] rounded-lg border-orange-200 text-center text-sm tabular-nums"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={commitTyped}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitTyped();
          }
        }}
      />
    </div>
  );
}

/** Add minutes to HH:MM (wraps within day). */
export function addMinutesToHhMm(hhmm: string, mins: number): string {
  const p = parseHhMm(hhmm) || { h: 9, m: 0 };
  let total = p.h * 60 + p.m + mins;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return formatHhMm(Math.floor(total / 60), total % 60);
}
