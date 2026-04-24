import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api-config';
import {
  advancedAnalyticsMockData,
  type AdvancedAnalyticsPayload,
  chapterStrengthClass,
  difficultyLabel,
  formatSeconds,
  heatmapCellClass,
} from '@/utils/advancedAnalytics';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Props = {
  examId: string;
};

const difficultyRows = ['easy', 'moderate', 'difficult', 'highly_difficult'];

const sectionCard = 'border-slate-200 shadow-sm';

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
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Advanced analytics unavailable');
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
    return difficultyRows.map((row) => mapped.get(row)).filter(Boolean) as AdvancedAnalyticsPayload['difficultyTimeIntelligence'];
  }, [analytics]);

  if (isLoading) {
    return (
      <Card className={sectionCard}>
        <CardContent className="p-8 text-center text-slate-600">Loading advanced intelligence...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-2 z-10 rounded-xl border border-sky-100 bg-white/95 backdrop-blur p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Advanced Performance Intelligence Dashboard</h3>
            <p className="text-xs text-slate-600">
              Deep exam analytics with time, concept, chapter and AI strategy intelligence.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-100 text-sky-700 border-sky-200">
              Risk: {analytics.recommendation?.riskLevel || 'N/A'}
            </Badge>
            <Badge className="bg-violet-100 text-violet-700 border-violet-200">
              Confidence Trend: {analytics.recommendation?.confidenceTrend || 'Stable'}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {error}. Showing fallback mock analytics snapshot.
        </div>
      )}

      <Card className={sectionCard}>
        <CardHeader>
          <CardTitle>Difficulty + Time Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Correct Answered</p>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2">Difficulty</th>
                  <th className="pb-2">Correct + Avg Time</th>
                  <th className="pb-2">In Time</th>
                  <th className="pb-2">Less Time</th>
                  <th className="pb-2">Over Time</th>
                  <th className="pb-2">Ideal Time</th>
                </tr>
              </thead>
              <tbody>
                {difficultyMap.map((row) => (
                  <tr key={`correct-${row.difficulty}`} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{difficultyLabel(row.difficulty)}</td>
                    <td className="py-2">{row.correctAnswered.count} ({formatSeconds(row.correctAnswered.avgTime)})</td>
                    <td className="py-2">{row.correctAnswered.inTime}</td>
                    <td className="py-2">{row.correctAnswered.lessTime}</td>
                    <td className="py-2">{row.correctAnswered.overTime}</td>
                    <td className="py-2">{formatSeconds(row.idealTimeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Wrong Answered</p>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2">Difficulty</th>
                  <th className="pb-2">Wrong + Avg Time</th>
                  <th className="pb-2">In Time</th>
                  <th className="pb-2">Less Time</th>
                  <th className="pb-2">Over Time</th>
                  <th className="pb-2">Ideal Time</th>
                </tr>
              </thead>
              <tbody>
                {difficultyMap.map((row) => (
                  <tr key={`wrong-${row.difficulty}`} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{difficultyLabel(row.difficulty)}</td>
                    <td className="py-2">{row.wrongAnswered.count} ({formatSeconds(row.wrongAnswered.avgTime)})</td>
                    <td className="py-2">{row.wrongAnswered.inTime}</td>
                    <td className="py-2">{row.wrongAnswered.lessTime}</td>
                    <td className="py-2">{row.wrongAnswered.overTime}</td>
                    <td className="py-2">{formatSeconds(row.idealTimeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCard}>
        <CardHeader>
          <CardTitle>Question-Type Intelligence Matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="pb-2">Type</th>
                <th className="pb-2">Correct (P/C/M)</th>
                <th className="pb-2">Wrong (P/C/M)</th>
                <th className="pb-2">Not Answered (P/C/M)</th>
              </tr>
            </thead>
            <tbody>
              {analytics.questionTypeMatrix.map((row) => (
                <tr key={row.type} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{row.type}</td>
                  <td className="py-2">{row.correct.physics}/{row.correct.chemistry}/{row.correct.maths}</td>
                  <td className="py-2">{row.wrong.physics}/{row.wrong.chemistry}/{row.wrong.maths}</td>
                  <td className="py-2">{row.notAnswered.physics}/{row.notAnswered.chemistry}/{row.notAnswered.maths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className={sectionCard}>
        <CardHeader>
          <CardTitle>Concept vs Application Analysis</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="pb-2">Type</th>
                <th className="pb-2">Accuracy %</th>
                <th className="pb-2">Correct</th>
                <th className="pb-2">Wrong</th>
                <th className="pb-2">Not Answered</th>
                <th className="pb-2">Total Time</th>
                <th className="pb-2">Avg Time / Q</th>
              </tr>
            </thead>
            <tbody>
              {analytics.conceptVsApplication.map((row) => (
                <tr key={row.type} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{row.type}</td>
                  <td className="py-2">{row.accuracy}%</td>
                  <td className="py-2">{row.correct}</td>
                  <td className="py-2">{row.wrong}</td>
                  <td className="py-2">{row.notAnswered}</td>
                  <td className="py-2">{formatSeconds(row.totalTime)}</td>
                  <td className="py-2">{formatSeconds(row.avgTimePerQuestion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className={sectionCard}>
        <CardHeader>
          <CardTitle>Chapter-wise Weakness Detection</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="pb-2">Chapter</th>
                <th className="pb-2">Subject</th>
                <th className="pb-2">Accuracy %</th>
                <th className="pb-2">Correct</th>
                <th className="pb-2">Errors</th>
                <th className="pb-2">Not Answered</th>
              </tr>
            </thead>
            <tbody>
              {analytics.chapterWeakness.map((row) => (
                <tr key={`${row.subject}-${row.chapter}`} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{row.chapter}</td>
                  <td className="py-2 capitalize">{row.subject}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${chapterStrengthClass(row.accuracy)}`}>
                      {row.accuracy}%
                    </span>
                  </td>
                  <td className="py-2">{row.correct}</td>
                  <td className="py-2">{row.errors}</td>
                  <td className="py-2">{row.notAnswered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>AI Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              {analytics.aiObservations.map((item, idx) => (
                <li key={`${idx}-${item}`} className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>Time Efficiency Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {analytics.timeEfficiency.avgTimePerSubject.map((item) => (
              <div key={item.subject} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                <span className="capitalize font-medium">{item.subject}</span>
                <span>{formatSeconds(item.avgTime)} avg</span>
              </div>
            ))}
            <div className="pt-2 text-xs text-slate-600 space-y-1">
              <p>Slowest subject: <span className="font-semibold capitalize">{analytics.timeEfficiency.slowestSubject}</span></p>
              <p>Fastest subject: <span className="font-semibold capitalize">{analytics.timeEfficiency.fastestSubject}</span></p>
              <p>Time wasted on wrong questions: <span className="font-semibold">{formatSeconds(analytics.timeEfficiency.timeWastedOnWrongQuestions)}</span></p>
              <p>Efficiency score: <span className="font-semibold">{analytics.timeEfficiency.efficiencyScore}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>Heatmap (Chapter vs Accuracy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {analytics.visuals.chapterHeatmap.slice(0, 18).map((cell, idx) => (
                <div key={`${cell.chapter}-${idx}`} className={`rounded p-2 text-xs ${heatmapCellClass(cell.accuracy)}`}>
                  <p className="font-semibold truncate">{cell.chapter}</p>
                  <p className="capitalize">{cell.subject}</p>
                  <p>{cell.accuracy}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>Subject Performance Bars</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.visuals.subjectPerformanceBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="accuracy" fill="#0ea5e9" name="Accuracy %" />
                <Bar dataKey="avgTime" fill="#f97316" name="Avg Time (s)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>Outcome Pie</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.visuals.outcomePie}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  fill="#38bdf8"
                  label
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle>Time vs Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.visuals.timeVsAccuracy}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="#22c55e" name="Accuracy %" />
                <Line type="monotone" dataKey="avgTime" stroke="#f97316" name="Avg Time (s)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className={sectionCard}>
        <CardHeader>
          <CardTitle>AI Recommendation Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-rose-100 text-rose-700 border-rose-200">
              Risk Level: {analytics.recommendation?.riskLevel || 'N/A'}
            </Badge>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
              Trend: {analytics.recommendation?.confidenceTrend || 'Stable'}
            </Badge>
          </div>
          <p className="text-slate-700">
            <span className="font-semibold">Strategy:</span> {analytics.recommendation?.strategy || 'N/A'}
          </p>
          <div>
            <p className="font-semibold text-slate-800 mb-1">Focus Areas</p>
            <div className="flex flex-wrap gap-2">
              {(analytics.recommendation?.focusAreas || []).map((area) => (
                <Badge key={area} className="bg-sky-100 text-sky-700 border-sky-200">{area}</Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Today</p>
              <ul className="list-disc pl-4 space-y-1">
                {(analytics.recommendation?.actionPlan?.today || []).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">This Week</p>
              <ul className="list-disc pl-4 space-y-1">
                {(analytics.recommendation?.actionPlan?.thisWeek || []).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Before Next Exam</p>
              <ul className="list-disc pl-4 space-y-1">
                {(analytics.recommendation?.actionPlan?.beforeNextExam || []).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
