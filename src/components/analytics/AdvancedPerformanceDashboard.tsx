import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { API_BASE_URL } from '@/lib/api-config';
import {
  advancedAnalyticsMockData,
  type AdvancedAnalyticsPayload,
  difficultyLabel,
  formatSeconds,
} from '@/utils/advancedAnalytics';

type Props = {
  examId: string;
};

const difficultyRows = ['easy', 'moderate', 'difficult', 'highly_difficult'] as const;

const COLORS = {
  correct: '#22c55e',
  wrong: '#f97316',
  notAnswered: '#3b82f6',
  inTime: '#22c55e',
  lessTime: '#3b82f6',
  overTime: '#f97316',
  ideal: '#94a3b8',
  physics: '#8b5cf6',
  chemistry: '#06b6d4',
  maths: '#ec4899',
};

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

const questionTypeChartConfig = {
  correct: { label: 'Correct', color: COLORS.correct },
  wrong: { label: 'Wrong', color: COLORS.wrong },
  notAnswered: { label: 'Not Answered', color: COLORS.notAnswered },
};

const difficultyOutcomeConfig = {
  correct: { label: 'Correct', color: COLORS.correct },
  wrong: { label: 'Wrong', color: COLORS.wrong },
};

const timeBucketConfig = {
  inTime: { label: 'In Time', color: COLORS.inTime },
  lessTime: { label: 'Less Time', color: COLORS.lessTime },
  overTime: { label: 'Over Time', color: COLORS.overTime },
};

const conceptChartConfig = {
  correct: { label: 'Correct', color: COLORS.correct },
  wrong: { label: 'Wrong', color: COLORS.wrong },
  notAnswered: { label: 'Not Answered', color: COLORS.notAnswered },
};

const chapterChartConfig = {
  correct: { label: 'Correct', color: COLORS.correct },
  errors: { label: 'Errors', color: COLORS.wrong },
  notAnswered: { label: 'Not Answered', color: COLORS.notAnswered },
};

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
      {message}
    </div>
  );
}

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

  const questionTypeChartData = useMemo(
    () =>
      analytics.questionTypeMatrix.map((row) => ({
        type: row.type,
        correct:
          row.correct.physics + row.correct.chemistry + row.correct.maths,
        wrong: row.wrong.physics + row.wrong.chemistry + row.wrong.maths,
        notAnswered:
          row.notAnswered.physics + row.notAnswered.chemistry + row.notAnswered.maths,
        correctPhysics: row.correct.physics,
        correctChemistry: row.correct.chemistry,
        correctMaths: row.correct.maths,
        wrongPhysics: row.wrong.physics,
        wrongChemistry: row.wrong.chemistry,
        wrongMaths: row.wrong.maths,
        notAnsweredPhysics: row.notAnswered.physics,
        notAnsweredChemistry: row.notAnswered.chemistry,
        notAnsweredMaths: row.notAnswered.maths,
      })),
    [analytics.questionTypeMatrix]
  );

  const questionTypeHasData = questionTypeChartData.some(
    (r) => r.correct + r.wrong + r.notAnswered > 0
  );

  const difficultyOutcomeData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        difficulty: difficultyLabel(row.difficulty),
        correct: row.correctAnswered.count,
        wrong: row.wrongAnswered.count,
        correctAvg: row.correctAnswered.avgTime,
        wrongAvg: row.wrongAnswered.avgTime,
        idealTime: row.idealTimeSec,
      })),
    [difficultyMap]
  );

  const correctTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        difficulty: difficultyLabel(row.difficulty),
        inTime: row.correctAnswered.inTime,
        lessTime: row.correctAnswered.lessTime,
        overTime: row.correctAnswered.overTime,
        count: row.correctAnswered.count,
        avgTime: row.correctAnswered.avgTime,
        idealTime: row.idealTimeSec,
      })),
    [difficultyMap]
  );

  const wrongTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        difficulty: difficultyLabel(row.difficulty),
        inTime: row.wrongAnswered.inTime,
        lessTime: row.wrongAnswered.lessTime,
        overTime: row.wrongAnswered.overTime,
        count: row.wrongAnswered.count,
        avgTime: row.wrongAnswered.avgTime,
        idealTime: row.idealTimeSec,
      })),
    [difficultyMap]
  );

  const conceptChartData = useMemo(
    () =>
      analytics.conceptVsApplication.map((row) => {
        const attempted = row.correct + row.wrong;
        return {
          type: row.type,
          correct: row.correct,
          wrong: row.wrong,
          notAnswered: row.notAnswered,
          hitRate: attempted > 0 ? Math.round((row.correct / attempted) * 100) : 0,
          totalTime: row.totalTime,
          avgTime: row.avgTimePerQuestion,
        };
      }),
    [analytics.conceptVsApplication]
  );

  const conceptHasData = conceptChartData.some(
    (r) => r.correct + r.wrong + r.notAnswered > 0
  );

  const chapterChartData = useMemo(
    () =>
      analytics.chapterWeakness.map((row) => ({
        subject: row.subject.charAt(0).toUpperCase() + row.subject.slice(1),
        chapter: row.chapter,
        correct: row.correct,
        errors: row.errors,
        notAnswered: row.notAnswered,
        total: row.correct + row.errors + row.notAnswered,
        accuracy: row.accuracy,
      })),
    [analytics.chapterWeakness]
  );

  const chapterHasData = chapterChartData.some((r) => r.total > 0);

  const chapterPieData = useMemo(() => {
    const totals = { correct: 0, errors: 0, notAnswered: 0 };
    chapterChartData.forEach((r) => {
      totals.correct += r.correct;
      totals.errors += r.errors;
      totals.notAnswered += r.notAnswered;
    });
    return [
      { name: 'Correct', value: totals.correct, fill: COLORS.correct },
      { name: 'Errors', value: totals.errors, fill: COLORS.wrong },
      { name: 'Not Answered', value: totals.notAnswered, fill: COLORS.notAnswered },
    ].filter((d) => d.value > 0);
  }, [chapterChartData]);

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

      {/* Question-type matrix */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h4 className="font-bold text-slate-900">Question-Type Intelligence Matrix</h4>
          <p className="text-xs text-slate-500 mt-0.5">Outcome counts by question type (all subjects combined)</p>
        </div>
        <CardContent className="pt-4 pb-2">
          {!questionTypeHasData ? (
            <ChartEmpty message="No question-type data for this exam yet." />
          ) : (
            <ChartContainer config={questionTypeChartConfig} className="h-[320px] w-full">
              <BarChart data={questionTypeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis
                  dataKey="type"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  angle={-28}
                  textAnchor="end"
                  height={72}
                  interval={0}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => {
                        const row = item?.payload as (typeof questionTypeChartData)[0] | undefined;
                        if (!row) return [value, name];
                        const subjectBreakdown: Record<string, string> = {
                          correct: `Phy ${row.correctPhysics} · Chem ${row.correctChemistry} · Math ${row.correctMaths}`,
                          wrong: `Phy ${row.wrongPhysics} · Chem ${row.wrongChemistry} · Math ${row.wrongMaths}`,
                          notAnswered: `Phy ${row.notAnsweredPhysics} · Chem ${row.notAnsweredChemistry} · Math ${row.notAnsweredMaths}`,
                        };
                        const extra = subjectBreakdown[String(name)];
                        return [
                          <span key="v" className="font-semibold">
                            {value}
                            {extra ? (
                              <span className="block text-micro font-normal text-muted-foreground">{extra}</span>
                            ) : null}
                          </span>,
                          questionTypeChartConfig[name as keyof typeof questionTypeChartConfig]?.label || name,
                        ];
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="correct" fill={COLORS.correct} radius={[4, 4, 0, 0]} />
                <Bar dataKey="wrong" fill={COLORS.wrong} radius={[4, 4, 0, 0]} />
                <Bar dataKey="notAnswered" fill={COLORS.notAnswered} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Difficulty + time */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Difficulty + Time Intelligence</h4>
          <p className="text-xs text-slate-500 mt-0.5">Correct vs wrong counts, time buckets, and ideal benchmarks</p>
        </div>
        <CardContent className="space-y-6 pt-4">
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">Correct vs wrong by difficulty</p>
            <ChartContainer config={difficultyOutcomeConfig} className="h-[260px] w-full">
              <BarChart data={difficultyOutcomeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="difficulty" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => {
                        const row = item?.payload as (typeof difficultyOutcomeData)[0] | undefined;
                        const avg = name === 'correct' ? row?.correctAvg : row?.wrongAvg;
                        return [
                          `${value} (avg ${formatSeconds(avg ?? 0)})`,
                          difficultyOutcomeConfig[name as keyof typeof difficultyOutcomeConfig]?.label || name,
                        ];
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="correct" fill={COLORS.correct} radius={[4, 4, 0, 0]} />
                <Bar dataKey="wrong" fill={COLORS.wrong} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-lg border ${C.green.border} p-3`}>
              <p className={`mb-2 text-sm font-bold ${C.green.text}`}>Correct — time buckets</p>
              <ChartContainer config={timeBucketConfig} className="h-[240px] w-full">
                <ComposedChart data={correctTimeBucketData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="difficulty" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} unit="s" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const row = item?.payload as (typeof correctTimeBucketData)[0] | undefined;
                          if (name === 'idealTime') {
                            return [formatSeconds(Number(value)), 'Ideal time'];
                          }
                          if (name === 'avgTime') {
                            return [formatSeconds(Number(value)), 'Avg time'];
                          }
                          return [value, timeBucketConfig[name as keyof typeof timeBucketConfig]?.label || name];
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="inTime" stackId="t" fill={COLORS.inTime} />
                  <Bar yAxisId="left" dataKey="lessTime" stackId="t" fill={COLORS.lessTime} />
                  <Bar yAxisId="left" dataKey="overTime" stackId="t" fill={COLORS.overTime} radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="idealTime"
                    stroke={COLORS.ideal}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Ideal"
                  />
                </ComposedChart>
              </ChartContainer>
            </div>

            <div className={`rounded-lg border ${C.orange.border} p-3`}>
              <p className={`mb-2 text-sm font-bold ${C.orange.text}`}>Wrong — time buckets</p>
              <ChartContainer config={timeBucketConfig} className="h-[240px] w-full">
                <ComposedChart data={wrongTimeBucketData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="difficulty" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} unit="s" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === 'idealTime') {
                            return [formatSeconds(Number(value)), 'Ideal time'];
                          }
                          return [value, timeBucketConfig[name as keyof typeof timeBucketConfig]?.label || name];
                        }}
                      />
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="inTime" stackId="t" fill={COLORS.inTime} />
                  <Bar yAxisId="left" dataKey="lessTime" stackId="t" fill={COLORS.lessTime} />
                  <Bar yAxisId="left" dataKey="overTime" stackId="t" fill={COLORS.overTime} radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="idealTime"
                    stroke={COLORS.ideal}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Ideal"
                  />
                </ComposedChart>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concept vs Application */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Concept vs Application Analysis</h4>
        </div>
        <CardContent className="pt-4">
          {!conceptHasData ? (
            <ChartEmpty message="No concept vs application data for this exam yet." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartContainer config={conceptChartConfig} className="h-[280px] w-full">
                <BarChart data={conceptChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => {
                          const row = item?.payload as (typeof conceptChartData)[0] | undefined;
                          if (name === 'correct' && row) {
                            return [`${value} (${row.hitRate}% hit rate)`, 'Correct'];
                          }
                          return [value, conceptChartConfig[name as keyof typeof conceptChartConfig]?.label || name];
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="correct" fill={COLORS.correct} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wrong" fill={COLORS.wrong} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="notAnswered" fill={COLORS.notAnswered} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>

              <div className="flex flex-col justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
                {conceptChartData.map((row) => (
                  <div key={row.type} className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <p className="font-semibold text-slate-800">{row.type}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Hit rate: <span className="font-semibold text-green-700">{row.hitRate}%</span>
                      {' · '}
                      Total time: <span className="font-medium">{formatSeconds(row.totalTime)}</span>
                      {' · '}
                      Avg/Q: <span className="font-medium">{formatSeconds(row.avgTime)}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapter weakness */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h4 className="font-bold text-slate-900">Chapter-wise Weakness Detection</h4>
        </div>
        <CardContent className="pt-4">
          {!chapterHasData ? (
            <ChartEmpty message="No chapter weakness data for this exam yet." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ChartContainer config={chapterChartConfig} className="h-[300px] w-full">
                  <BarChart
                    data={chapterChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      width={72}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => {
                            const row = item?.payload as (typeof chapterChartData)[0] | undefined;
                            if (name === 'correct' && row) {
                              return [`${value} / ${row.total}`, 'Correct'];
                            }
                            return [value, chapterChartConfig[name as keyof typeof chapterChartConfig]?.label || name];
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="correct" stackId="ch" fill={COLORS.correct} />
                    <Bar dataKey="errors" stackId="ch" fill={COLORS.wrong} />
                    <Bar dataKey="notAnswered" stackId="ch" fill={COLORS.notAnswered} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {chapterPieData.length > 0 && (
                <ChartContainer
                  config={{
                    Correct: { label: 'Correct', color: COLORS.correct },
                    Errors: { label: 'Errors', color: COLORS.wrong },
                    'Not Answered': { label: 'Not Answered', color: COLORS.notAnswered },
                  }}
                  className="h-[300px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={chapterPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={2}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {chapterPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time efficiency footer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={`border ${C.blue.border} shadow-sm`}>
          <CardContent className="p-4 space-y-2 text-xs sm:text-sm">
            <p className="font-bold text-blue-800">Time Efficiency</p>
            {analytics.timeEfficiency.avgTimePerSubject.length > 0 ? (
              <ChartContainer
                config={{
                  avgTime: { label: 'Avg time', color: COLORS.notAnswered },
                }}
                className="h-[200px] w-full mt-2"
              >
                <BarChart
                  data={analytics.timeEfficiency.avgTimePerSubject.map((item) => ({
                    subject: item.subject.charAt(0).toUpperCase() + item.subject.slice(1),
                    avgTime: item.avgTime,
                    totalQuestions: item.totalQuestions,
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="s" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => {
                          const row = item?.payload as { totalQuestions?: number };
                          return [
                            `${formatSeconds(Number(value))} · ${row?.totalQuestions ?? 0} Q`,
                            'Avg time',
                          ];
                        }}
                      />
                    }
                  />
                  <Bar dataKey="avgTime" fill={COLORS.notAnswered} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-slate-500">No subject timing data.</p>
            )}
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
