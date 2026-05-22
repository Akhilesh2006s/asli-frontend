import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api-config';
import {
  advancedAnalyticsMockData,
  type AdvancedAnalyticsPayload,
  chapterStrengthClass,
  difficultyLabel,
  formatSeconds,
  formatTimeBucketCell,
} from '@/utils/advancedAnalytics';

type Props = {
  examId: string;
};

const difficultyRows = ['easy', 'moderate', 'difficult', 'highly_difficult'] as const;

const C = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
    head: 'bg-green-600 text-white',
    chip: 'bg-green-100 text-green-800',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    head: 'bg-blue-600 text-white',
    chip: 'bg-blue-100 text-blue-800',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
    head: 'bg-orange-500 text-white',
    chip: 'bg-orange-100 text-orange-800',
  },
};

export default function AdvancedPerformanceDashboard({ examId }: Props) {
  const [data, setData] = useState<AdvancedAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/exam/${examId}/advanced-analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to load advanced analytics');
        }
        if (!cancelled) {
          setData(payload.data || advancedAnalyticsMockData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Advanced analytics unavailable');
          setData(advancedAnalyticsMockData);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const analytics = data || advancedAnalyticsMockData;

  const difficultyMap = useMemo(() => {
    const mapped = new Map(analytics.difficultyTimeIntelligence.map((row) => [row.difficulty, row]));
    return difficultyRows
      .map((row) => mapped.get(row))
      .filter(Boolean) as AdvancedAnalyticsPayload['difficultyTimeIntelligence'];
  }, [analytics]);

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center text-blue-700">Loading advanced intelligence…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 font-['Poppins',sans-serif]">
      <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Advanced Performance Intelligence Dashboard
            </h3>
            <p className="text-xs text-slate-600">
              Live data: time × difficulty × question type × chapter (orange · blue · green)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${C.blue.chip} border-0`}>
              Risk: {analytics.recommendation?.riskLevel || 'N/A'}
            </Badge>
            <Badge className={`${C.green.chip} border-0`}>
              Trend: {analytics.recommendation?.confidenceTrend || 'Stable'}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs sm:text-sm text-orange-800">
          {error}. Showing sample layout until live analytics loads.
        </div>
      )}

      {/* Question-type matrix — reference layout */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h4 className="font-bold text-slate-900">Question-Type Intelligence Matrix</h4>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs sm:text-sm border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-slate-200 bg-slate-100 px-3 py-2 text-left align-middle">
                  Type
                </th>
                <th colSpan={3} className={`border border-slate-200 px-2 py-2 ${C.green.head}`}>
                  ✓ Correct
                </th>
                <th colSpan={3} className={`border border-slate-200 px-2 py-2 ${C.orange.head}`}>
                  ✗ Wrong
                </th>
                <th colSpan={3} className={`border border-slate-200 px-2 py-2 ${C.blue.head}`}>
                  ○ Not Ans
                </th>
              </tr>
              <tr className="text-[10px] sm:text-xs">
                {['Correct', 'Wrong', 'Not Ans'].map((g) =>
                  ['Physics', 'Chemistry', 'Maths'].map((sub) => (
                    <th
                      key={`${g}-${sub}`}
                      className={`border border-slate-200 px-2 py-1 ${
                        g === 'Correct' ? 'bg-green-50 text-green-800' : g === 'Wrong' ? 'bg-orange-50 text-orange-800' : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {sub}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {analytics.questionTypeMatrix.map((row) => (
                <tr key={row.type} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800">{row.type}</td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-green-50/50">
                    {row.correct.physics}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-green-50/50">
                    {row.correct.chemistry}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-green-50/50">
                    {row.correct.maths}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-orange-50/50">
                    {row.wrong.physics}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-orange-50/50">
                    {row.wrong.chemistry}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-orange-50/50">
                    {row.wrong.maths}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-blue-50/50">
                    {row.notAnswered.physics}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-blue-50/50">
                    {row.notAnswered.chemistry}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-center bg-blue-50/50">
                    {row.notAnswered.maths}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Difficulty + time summary tables */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Difficulty + Time Intelligence</h4>
        </div>
        <CardContent className="space-y-6 overflow-x-auto pt-4">
          <div className={`rounded-lg border ${C.green.border} p-3`}>
            <p className={`mb-2 text-sm font-bold ${C.green.text}`}>Correct Answered</p>
            <table className="w-full min-w-[720px] text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2 pr-4">Difficulty</th>
                  <th className="pb-2 pr-4">Count + Avg</th>
                  <th className={`pb-2 pr-4 ${C.green.text}`}>In Time</th>
                  <th className={`pb-2 pr-4 ${C.blue.text}`}>Less Time</th>
                  <th className={`pb-2 pr-4 ${C.orange.text}`}>Over Time</th>
                  <th className="pb-2">Ideal</th>
                </tr>
              </thead>
              <tbody>
                {difficultyMap.map((row) => (
                  <tr key={`c-${row.difficulty}`} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{difficultyLabel(row.difficulty)}</td>
                    <td className="py-2">
                      {row.correctAnswered.count} ({formatSeconds(row.correctAnswered.avgTime)})
                    </td>
                    <td className="py-2 font-mono text-green-700">
                      {formatTimeBucketCell(row.correctAnswered.inTime, row.correctAnswered.inTimeAvg)}
                    </td>
                    <td className="py-2 font-mono text-blue-700">
                      {formatTimeBucketCell(row.correctAnswered.lessTime, row.correctAnswered.lessTimeAvg)}
                    </td>
                    <td className="py-2 font-mono text-orange-700">
                      {formatTimeBucketCell(row.correctAnswered.overTime, row.correctAnswered.overTimeAvg)}
                    </td>
                    <td className="py-2">{formatSeconds(row.idealTimeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`rounded-lg border ${C.orange.border} p-3`}>
            <p className={`mb-2 text-sm font-bold ${C.orange.text}`}>Wrong Answered</p>
            <table className="w-full min-w-[720px] text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2 pr-4">Difficulty</th>
                  <th className="pb-2 pr-4">Count + Avg</th>
                  <th className={`pb-2 pr-4 ${C.green.text}`}>In Time</th>
                  <th className={`pb-2 pr-4 ${C.blue.text}`}>Less Time</th>
                  <th className={`pb-2 pr-4 ${C.orange.text}`}>Over Time</th>
                  <th className="pb-2">Ideal</th>
                </tr>
              </thead>
              <tbody>
                {difficultyMap.map((row) => (
                  <tr key={`w-${row.difficulty}`} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{difficultyLabel(row.difficulty)}</td>
                    <td className="py-2">
                      {row.wrongAnswered.count} ({formatSeconds(row.wrongAnswered.avgTime)})
                    </td>
                    <td className="py-2 font-mono text-green-700">
                      {formatTimeBucketCell(row.wrongAnswered.inTime, row.wrongAnswered.inTimeAvg)}
                    </td>
                    <td className="py-2 font-mono text-blue-700">
                      {formatTimeBucketCell(row.wrongAnswered.lessTime, row.wrongAnswered.lessTimeAvg)}
                    </td>
                    <td className="py-2 font-mono text-orange-700">
                      {formatTimeBucketCell(row.wrongAnswered.overTime, row.wrongAnswered.overTimeAvg)}
                    </td>
                    <td className="py-2">{formatSeconds(row.idealTimeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Concept vs Application — marks-focused */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Concept vs Application Analysis</h4>
        </div>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full min-w-[760px] text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-200 px-3 py-2 text-left">Type</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.green.text}`}>Correct (marks)</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.orange.text}`}>Wrong</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.blue.text}`}>Not Answered</th>
                <th className="border border-slate-200 px-3 py-2">Total Time</th>
                <th className="border border-slate-200 px-3 py-2">Avg / Q</th>
              </tr>
            </thead>
            <tbody>
              {analytics.conceptVsApplication.map((row) => {
                const attempted = row.correct + row.wrong;
                return (
                  <tr key={row.type} className="border-t border-slate-200">
                    <td className="border border-slate-200 px-3 py-2 font-semibold">{row.type}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <span className={`rounded px-2 py-1 text-xs font-bold ${C.green.chip}`}>
                        {row.correct} correct
                      </span>
                      <span className="ml-2 text-slate-500 text-[10px]">
                        ({attempted > 0 ? Math.round((row.correct / attempted) * 100) : 0}% hit rate)
                      </span>
                    </td>
                    <td className={`border border-slate-200 px-3 py-2 font-semibold ${C.orange.text}`}>
                      {row.wrong}
                    </td>
                    <td className={`border border-slate-200 px-3 py-2 font-semibold ${C.blue.text}`}>
                      {row.notAnswered}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">{formatSeconds(row.totalTime)}</td>
                    <td className="border border-slate-200 px-3 py-2">{formatSeconds(row.avgTimePerQuestion)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Chapter weakness */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Chapter-wise Weakness Detection</h4>
        </div>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full min-w-[720px] text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">Chapter</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Subject</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.green.text}`}>Correct</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.orange.text}`}>Errors</th>
                <th className={`border border-slate-200 px-3 py-2 ${C.blue.text}`}>Not Answered</th>
              </tr>
            </thead>
            <tbody>
              {analytics.chapterWeakness.map((row) => (
                <tr key={`${row.subject}-${row.chapter}`} className="border-t border-slate-200">
                  <td className="border border-slate-200 px-3 py-2 font-medium">{row.chapter}</td>
                  <td className="border border-slate-200 px-3 py-2 capitalize text-blue-700">{row.subject}</td>
                  <td className="border border-slate-200 px-3 py-2">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${chapterStrengthClass(row.accuracy)}`}>
                      {row.correct} / {row.correct + row.errors + row.notAnswered}
                    </span>
                  </td>
                  <td className={`border border-slate-200 px-3 py-2 font-semibold ${C.orange.text}`}>
                    {row.errors}
                  </td>
                  <td className={`border border-slate-200 px-3 py-2 font-semibold ${C.blue.text}`}>
                    {row.notAnswered}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Time efficiency footer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={`border ${C.blue.border} shadow-sm`}>
          <CardContent className="p-4 space-y-2 text-xs sm:text-sm">
            <p className="font-bold text-blue-800">Time Efficiency</p>
            {analytics.timeEfficiency.avgTimePerSubject.map((item) => (
              <div
                key={item.subject}
                className="flex justify-between rounded border border-blue-100 bg-blue-50/50 px-3 py-2"
              >
                <span className="capitalize font-medium text-slate-800">{item.subject}</span>
                <span className="text-blue-700">
                  {formatSeconds(item.avgTime)} · {item.totalQuestions} Q
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className={`border ${C.green.border} shadow-sm`}>
          <CardContent className="p-4 text-xs sm:text-sm text-slate-700 space-y-1">
            <p className="font-bold text-green-800">Summary</p>
            <p>
              Slowest: <span className="font-semibold capitalize text-orange-700">{analytics.timeEfficiency.slowestSubject}</span>
            </p>
            <p>
              Fastest: <span className="font-semibold capitalize text-green-700">{analytics.timeEfficiency.fastestSubject}</span>
            </p>
            <p>
              Time on wrong:{' '}
              <span className="font-semibold text-orange-700">
                {formatSeconds(analytics.timeEfficiency.timeWastedOnWrongQuestions)}
              </span>
            </p>
            <p>
              Questions analysed:{' '}
              <span className="font-semibold text-blue-700">{analytics.metadata.totalQuestionsAnalyzed}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
