import { useMemo, useState } from 'react';
import { CheckCircle2, Link2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatMatchAnswerKey,
  normalizeMatchPairs,
  shuffleCopy,
  type MatchPair,
} from '@/lib/match-following';

type Props = {
  question?: string;
  matchPairs?: MatchPair[];
  /** Raw question object — used when matchPairs not passed directly. */
  raw?: Record<string, unknown>;
  showAnswer?: boolean;
  className?: string;
};

/**
 * Interactive Match-the-Following card:
 * Column A fixed; Column B chosen via dropdown per row; Check reveals score.
 */
export function MatchFollowingCard({
  question = 'Match Column A with Column B',
  matchPairs,
  raw,
  showAnswer = false,
  className,
}: Props) {
  const pairs = useMemo(() => {
    if (Array.isArray(matchPairs) && matchPairs.length >= 2) return matchPairs;
    return normalizeMatchPairs(raw || { matchPairs });
  }, [matchPairs, raw]);

  const rightOptions = useMemo(() => {
    const labelled = pairs.map((p, i) => ({
      key: p.rightKey || String.fromCharCode(97 + i),
      text: p.right,
    }));
    return shuffleCopy(labelled);
  }, [pairs]);

  const [selections, setSelections] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  if (pairs.length < 2) return null;

  const correctCount = pairs.reduce((n, p, i) => {
    const want = (p.rightKey || String.fromCharCode(97 + i)).toLowerCase();
    const got = String(selections[i] || '').toLowerCase();
    return n + (want && got && want === got ? 1 : 0);
  }, 0);

  const reveal = showAnswer || checked;

  return (
    <div
      className={cn(
        'rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/30 p-3.5 sm:p-4 space-y-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-indigo-600 text-white hover:bg-indigo-600">
          <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden />
          Match the Following
        </Badge>
        <span className="text-xs text-slate-500">{pairs.length} pairs</span>
      </div>

      <p className="text-sm font-medium text-slate-900 leading-relaxed">{question}</p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 w-[45%]">Column A</th>
              <th className="px-3 py-2">Column B (choose match)</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, i) => {
              const leftKey = pair.leftKey || String(i + 1);
              const correctKey = (pair.rightKey || String.fromCharCode(97 + i)).toLowerCase();
              const selected = String(selections[i] || '').toLowerCase();
              const isCorrect = reveal && selected && selected === correctKey;
              const isWrong = reveal && selected && selected !== correctKey;
              return (
                <tr key={`${leftKey}-${i}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 align-top">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-800">
                      {leftKey}
                    </span>
                    <span className="text-slate-800">{pair.left}</span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      className={cn(
                        'w-full rounded-lg border bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300',
                        isCorrect && 'border-emerald-400 bg-emerald-50',
                        isWrong && 'border-rose-300 bg-rose-50',
                        !selected && 'border-slate-200',
                      )}
                      value={selections[i] || ''}
                      onChange={(e) => {
                        setChecked(false);
                        setSelections((prev) => ({ ...prev, [i]: e.target.value }));
                      }}
                      disabled={showAnswer}
                    >
                      <option value="">Select…</option>
                      {rightOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.key.toUpperCase()}. {opt.text}
                        </option>
                      ))}
                    </select>
                    {reveal ? (
                      <p className="mt-1 text-xs text-emerald-800">
                        Correct: <strong>{correctKey.toUpperCase()}</strong> — {pair.right}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!showAnswer ? (
          <>
            <Button
              type="button"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setChecked(true)}
            >
              Check matches
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSelections({});
                setChecked(false);
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Reset
            </Button>
          </>
        ) : null}
        {reveal ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Score: {correctCount}/{pairs.length}
            <span className="text-slate-500 font-normal">
              ({formatMatchAnswerKey(pairs)})
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default MatchFollowingCard;
