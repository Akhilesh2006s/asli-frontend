import { cn } from '@/lib/utils';
import { AI_V2, BLOOM_LEVEL_STYLES } from '@/lib/ai-tool-design-tokens';
import type { BloomDistributionRow } from '@/lib/parse-exam-question-paper';

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#34d399',
  Medium: '#fbbf24',
  Hard: '#f87171',
  Mixed: '#818cf8',
};

const BLOOM_DONUT_HEX: Record<string, string> = {
  Remember: '#8b5cf6',
  Understand: '#3b82f6',
  Apply: '#10b981',
  Analyze: '#f59e0b',
  Evaluate: '#f43f5e',
  Create: '#ec4899',
};

export function AiToolV2DistributionDonut({
  rows,
  title = 'Distribution',
  totalLabel = 'items',
}: {
  rows: Array<{ label: string; value: number; percent: number }>;
  title?: string;
  totalLabel?: string;
}) {
  const active = rows.filter((r) => r.value > 0);
  const total = active.reduce((s, r) => s + r.value, 0);
  if (!total) return null;

  let cursor = 0;
  const segments = active.map((row) => {
    const start = cursor;
    cursor += row.percent;
    const color = BLOOM_DONUT_HEX[row.label] || DIFFICULTY_COLORS[row.label] || '#6366f1';
    return `${color} ${start}% ${cursor}%`;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full shadow-inner"
        style={{
          background: `conic-gradient(${segments.join(', ')})`,
        }}
        role="img"
        aria-label={`${title}: ${active.map((r) => `${r.label} ${r.percent}%`).join(', ')}`}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-lg font-bold text-slate-900">{total}</span>
          <span className="text-[10px] font-medium uppercase text-slate-500">{totalLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={cn(AI_V2.typography.label, 'text-slate-600')}>{title}</p>
        {active.map((row) => {
          const style = BLOOM_LEVEL_STYLES[row.label];
          return (
            <div key={row.label} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  style?.bg || 'bg-indigo-100',
                  style?.border || 'border border-indigo-200',
                )}
              />
              <span className="flex-1 font-medium text-slate-800">{row.label}</span>
              <span className="text-slate-500">{row.percent}%</span>
              <span className="text-xs text-slate-400">({row.value})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function bloomRowsToDonutRows(rows: BloomDistributionRow[]) {
  return rows
    .filter((r) => r.marks > 0 || r.percent > 0)
    .map((r) => ({ label: r.level, value: r.marks, percent: r.percent }));
}

export function difficultyRowsFromTags(tags: string[]) {
  const counts: Record<string, number> = {};
  for (const tag of tags) {
    const t = String(tag || '').trim();
    if (!t) continue;
    const key =
      /easy/i.test(t) ? 'Easy' : /hard|difficult/i.test(t) ? 'Hard' : /medium/i.test(t) ? 'Medium' : t;
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(counts).map(([label, value]) => ({
    label,
    value,
    percent: Math.round((value / total) * 100),
  }));
}
