import { useMemo, type ReactNode } from 'react';
import { Clock } from 'lucide-react';

type SubjectScore = { correct: number; total: number; marks: number };

export type AiReportExamResult = {
  examTitle?: string;
  attemptNumber?: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
  subjectWiseScore: Record<string, SubjectScore>;
};

export type AiReportAnalysis = {
  summary?: string;
  strengths?: string[];
  rootCauses?: string[];
  motivation?: string;
  actionPlan?: {
    today?: string[];
    thisWeek?: string[];
    beforeNextExam?: string[];
  };
  questionInsights?: Array<{
    index?: number;
    subject?: string;
    conceptGap?: string;
    insight?: string;
    fixStrategy?: string;
    status?: string;
    geminiExplanation?: string;
  }>;
  focusAreas?: Array<{
    subject: string;
    issue: string;
    whatToDo: string;
  }>;
};

export type AiReportTabProps = {
  result: AiReportExamResult;
  examTitle: string;
  studentName: string;
  examDateLabel: string;
  aiAnalysis: AiReportAnalysis | null;
  aiLoading: boolean;
  aiError: string;
  animatedMarks: number;
  animatedCorrect: number;
  animatedWrong: number;
  animatedSkipped: number;
  gradeLetter: string;
  marksPercent: number;
  accuracyRate: number;
  completionRate: number;
  attemptedCount: number;
  totalQuestionCount: number;
  mistakeTaxonomy: {
    careless: number;
    conceptual: number;
    procedural: number;
    time: number;
    reading: number;
  };
  wrongQuickCount: number;
  marksPerWrong: number;
  scoreReconciliation?: {
    marksEarned: number;
    negativePenalty: number;
    net: number;
    marksNotEarnedOnWrong: number;
    costPerWrong: number;
  };
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function getStudentMeta(): { classLabel: string; stream: string } {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { classLabel: '', stream: 'JEE' };
    const u = JSON.parse(raw);
    const cls = u?.classNumber ? `Class ${u.classNumber}` : '';
    const stream = u?.educationStream || 'JEE';
    return { classLabel: cls, stream };
  } catch {
    return { classLabel: '', stream: 'JEE' };
  }
}

const QUOTED = String.raw`[“"'']([^”"']+)[”"']`;

function extractConceptTitle(gap: string, questionIndex?: number): string {
  const text = String(gap || '').trim();
  if (!text) return questionIndex != null ? `Question ${questionIndex}` : 'Concept review';

  const reject = (value: string) => {
    const t = value.trim();
    if (t.length < 2) return true;
    if (/^but expected$/i.test(t)) return true;
    if (/^selected$/i.test(t)) return true;
    return false;
  };

  // Backend wrong-line format: Q5 (“Acids, Bases and Salts”, chemistry mcq)—…
  const topicFromQLine = text.match(new RegExp(`Q\\d+\\s*\\(\\s*${QUOTED}\\s*,`, 'i'));
  if (topicFromQLine?.[1] && !reject(topicFromQLine[1])) {
    return topicFromQLine[1].trim();
  }

  const syllabusUnit = text.match(new RegExp(`Syllabus unit\\s*${QUOTED}`, 'i'));
  if (syllabusUnit?.[1] && !reject(syllabusUnit[1])) {
    return syllabusUnit[1].trim();
  }

  const topicOnExecution = text.match(
    new RegExp(`(?:execution|drill|item)s? on\\s*${QUOTED}`, 'i')
  );
  if (topicOnExecution?.[1] && !reject(topicOnExecution[1])) {
    return topicOnExecution[1].trim();
  }

  const stemStart = text.match(new RegExp(`starts:\\s*${QUOTED}`, 'i'));
  if (stemStart?.[1] && !reject(stemStart[1])) {
    const stem = stemStart[1].trim();
    return stem.length > 72 ? `${stem.slice(0, 69)}…` : stem;
  }

  const beforeSelected = text.split(/\s+Selected\s+/i)[0]?.trim();
  if (beforeSelected) {
    const topicInBody = beforeSelected.match(new RegExp(`Q\\d+\\s*\\(\\s*${QUOTED}`, 'i'));
    if (topicInBody?.[1] && !reject(topicInBody[1])) {
      return topicInBody[1].trim();
    }
  }

  if (questionIndex != null) return `Question ${questionIndex}`;
  return 'Concept review';
}

function isWrongQuestionInsight(status: string | undefined): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'wrong' || s === 'incorrect';
}

function strongAttemptLabel(marksPercent: number): string {
  if (marksPercent >= 85) return '★ Strong Attempt';
  if (marksPercent >= 70) return '★ Solid Attempt';
  if (marksPercent >= 50) return '◆ Room to Grow';
  return '◇ Keep Building';
}

function ReportCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full bg-white rounded-xl sm:rounded-[20px] p-4 sm:p-6 lg:p-[26px] shadow-[0_10px_30px_-20px_rgba(30,41,59,0.35),0_0_0_1px_#e9edf3] ${className}`}
    >
      <h3 className="text-base font-bold text-slate-800 mb-[18px] flex items-center gap-2">
        <span className="w-[26px] h-[26px] rounded-lg grid place-items-center bg-violet-50 text-violet-600 text-sm">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AiReportTab({
  result,
  examTitle,
  studentName,
  examDateLabel,
  aiAnalysis,
  aiLoading,
  aiError,
  animatedMarks,
  animatedCorrect,
  animatedWrong,
  animatedSkipped,
  gradeLetter,
  marksPercent,
  accuracyRate,
  completionRate,
  attemptedCount,
  totalQuestionCount,
  mistakeTaxonomy,
  wrongQuickCount,
  marksPerWrong,
  scoreReconciliation: scoreReconciliationProp,
}: AiReportTabProps) {
  const { classLabel, stream } = getStudentMeta();
  const attemptLabel =
    Number(result.attemptNumber) >= 1 ? `Attempt ${Number(result.attemptNumber)}` : 'Attempt 1';

  const ringPct = Math.min(100, Math.max(0, marksPercent));
  const ringStyle = {
    background: `conic-gradient(from -90deg, #9333ea 0%, #ec4899 ${ringPct}%, #eceef3 ${ringPct}% 100%)`,
  };

  const reconciliation = useMemo(() => {
    const net = Math.round(Number(result.obtainedMarks) || 0);
    const total = Math.max(1, Math.round(Number(result.totalMarks) || 0));
    const earned = Math.round(scoreReconciliationProp?.marksEarned ?? net);
    const neg = Math.round(scoreReconciliationProp?.negativePenalty ?? 0);
    const maxBar = Math.max(earned, total, 1);
    return {
      earned,
      neg,
      net: Math.round(scoreReconciliationProp?.net ?? net),
      earnedPct: (earned / maxBar) * 100,
      negPct: Math.max(neg > 0 ? 4 : 0, (neg / maxBar) * 100),
      netPct: (net / maxBar) * 100,
      costPerWrong: Math.round(
        scoreReconciliationProp?.costPerWrong ?? marksPerWrong
      ),
      marksNotEarnedOnWrong: Math.round(
        scoreReconciliationProp?.marksNotEarnedOnWrong ?? 0
      ),
    };
  }, [result, marksPerWrong, scoreReconciliationProp]);

  const subjectRows = useMemo(() => {
    return Object.entries(result.subjectWiseScore || {}).map(([subject, score]) => {
      const pct = score.total > 0 ? (score.correct / score.total) * 100 : 0;
      return {
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        pct,
        correct: score.correct,
        total: score.total,
        marks: score.marks,
      };
    });
  }, [result.subjectWiseScore]);

  const conceptCards = useMemo(() => {
    const wrongInsights =
      aiAnalysis?.questionInsights?.filter((q) => isWrongQuestionInsight(q.status)) || [];
    if (wrongInsights.length > 0) {
      return wrongInsights.slice(0, 3).map((q) => {
        const qNum = Number(q.index) > 0 ? Number(q.index) : undefined;
        const gapText = q.conceptGap || q.insight || '';
        const title = extractConceptTitle(gapText, qNum);
        return {
          tag: (q.subject || 'General').charAt(0).toUpperCase() + (q.subject || 'general').slice(1),
          name: title,
          meta: qNum ? `Wrong · Q${qNum} · review working` : 'Review this concept',
        };
      });
    }
    return (aiAnalysis?.focusAreas || []).slice(0, 3).map((f) => ({
      tag: f.subject,
      name: f.issue,
      meta: f.whatToDo,
    }));
  }, [aiAnalysis]);

  const planSteps = useMemo(() => {
    const steps = [
      ...(aiAnalysis?.actionPlan?.today || []),
      ...(aiAnalysis?.actionPlan?.thisWeek || []),
      ...(aiAnalysis?.actionPlan?.beforeNextExam || []),
    ].filter(Boolean);
    if (steps.length > 0) return steps.slice(0, 4);
    return [
      'Recall drill on your weakest chapters — definitions and one-line facts.',
      'Slow down on answers under 30s; re-check before locking.',
      'Redo each wrong question blind, then one variation.',
      'Take a timed mixed set with a real per-question timer.',
    ];
  }, [aiAnalysis]);

  const geminiParagraphs = useMemo(() => {
    const name = studentName.split(' ')[0] || studentName;
    const marksPctDisplay =
      (result.totalMarks || 0) > 0
        ? ((animatedMarks / (result.totalMarks || 1)) * 100).toFixed(1)
        : marksPercent.toFixed(1);
    const lead = [
      `${name}, you scored ${animatedMarks} / ${result.totalMarks} marks on this attempt (${marksPctDisplay}% of total marks).`,
      `${attemptedCount} of ${totalQuestionCount} questions attempted (${completionRate.toFixed(0)}% completion): ${animatedCorrect} correct, ${animatedWrong} wrong, ${animatedSkipped} skipped.`,
      `Accuracy on attempted questions was ${accuracyRate.toFixed(1)}% (${animatedCorrect} correct out of ${attemptedCount} attempted).`,
    ];

    if (aiAnalysis?.summary) {
      const parts = aiAnalysis.summary
        .split(/\n\n+/)
        .map((block) => block.replace(/\s+/g, ' ').trim())
        .filter((s) => s.length > 20)
        .filter(
          (s) =>
            !/scored about \d/i.test(s) &&
            !/^Attempt pattern:/i.test(s) &&
            !/^When you did attempt a question, accuracy was/i.test(s) &&
            !lead.some((line) => line.replace(/\s+/g, ' ').trim() === s)
        );
      return [...lead, ...parts].slice(0, 6);
    }

    return [
      ...lead,
      result.unattempted === 0
        ? 'Coverage is strong — you attempted every question. Focus on turning wrong answers into net gains.'
        : `You left ${result.unattempted} question(s) unattempted — completing the paper is the fastest mark gain.`,
      (aiAnalysis?.strengths?.[0] ||
        aiAnalysis?.motivation ||
        'Deep, consistent practice beats intensity spikes—small daily wins compound into a much stronger next attempt.') as string,
    ];
  }, [
    aiAnalysis,
    studentName,
    marksPercent,
    animatedMarks,
    animatedCorrect,
    animatedWrong,
    animatedSkipped,
    result,
    accuracyRate,
    attemptedCount,
    totalQuestionCount,
    completionRate,
  ]);

  const avgTimePerQuestion =
    totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 0;
  const idealPerQuestion = Math.max(60, avgTimePerQuestion * 1.4);
  const showTimeIntegrity = totalQuestionCount >= 10 && avgTimePerQuestion < 15;

  const costPerWrong = reconciliation.costPerWrong;

  const potentialMetrics = useMemo(() => {
    const net = reconciliation.net;
    const total = Math.max(0, Math.round(Number(result.totalMarks) || 0));
    const wrong = result.wrongAnswers || 0;
    let swing = 0;
    if (wrong > 0) {
      swing = Math.round(reconciliation.marksNotEarnedOnWrong + reconciliation.neg);
      if (swing <= 0) {
        swing = Math.round(Math.max(0, total - net));
      }
    }
    const ceiling = Math.min(total, net + swing);
    return { net, total, wrong, swing, ceiling };
  }, [reconciliation, result.totalMarks, result.wrongAnswers]);

  return (
    <div className="font-['Poppins',sans-serif] text-slate-600 text-sm w-full pb-8 sm:pb-12 space-y-4 sm:space-y-[18px]">
      {/* Hero */}
      <div className="w-full rounded-xl sm:rounded-[22px] px-4 sm:px-8 py-6 sm:py-[30px] text-white relative overflow-hidden bg-gradient-to-br from-[#9333ea] via-[#a21caf] to-[#db2777] shadow-[0_20px_45px_-22px_rgba(147,51,234,0.6)]">
        <div
          className="absolute right-[-30px] top-[-50px] w-[180px] sm:w-[230px] h-[180px] sm:h-[230px] rounded-full bg-white/10 pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col gap-3 sm:block">
          <span className="self-start sm:absolute sm:right-7 sm:top-[30px] bg-white/20 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold max-w-full truncate">
            {examTitle || result.examTitle || 'Exam'} · {totalQuestionCount} Questions
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-[30px] font-extrabold tracking-tight">
              Performance Analysis
            </h1>
            <p className="opacity-90 mt-1.5 text-xs sm:text-[14.5px] font-normal leading-relaxed">
              {studentName}
              {classLabel ? ` · ${classLabel}` : ''} · {examDateLabel}
              {stream ? ` · ${stream}` : ''}
            </p>
            <div className="mt-2 sm:mt-3 font-semibold text-xs sm:text-[13px] opacity-95">{attemptLabel}</div>
          </div>
        </div>
      </div>

      {/* Score card */}
      <div className="w-full bg-white rounded-xl sm:rounded-[20px] shadow-[0_10px_30px_-20px_rgba(30,41,59,0.35),0_0_0_1px_#e9edf3] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,auto)_minmax(0,1.1fr)_minmax(0,1.2fr)] gap-5 sm:gap-6 items-center p-4 sm:p-6 lg:p-[26px]">
          <div className="flex flex-col items-center gap-3 justify-self-center">
            <div
              className="w-[150px] h-[150px] rounded-full grid place-items-center"
              style={ringStyle}
            >
              <div className="w-[118px] h-[118px] bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0_0_0_1px_#f1f5f9] px-1">
                <span className="text-[28px] sm:text-[30px] font-extrabold text-slate-800 leading-none">
                  {animatedMarks}
                </span>
                <span className="text-sm font-bold text-slate-500 mt-0.5">
                  / {result.totalMarks}
                </span>
                <span className="text-[13px] font-bold text-violet-600 mt-1">
                  Grade {gradeLetter}
                </span>
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-600 font-bold text-[13px] px-4 py-1.5 rounded-full flex items-center gap-1.5">
              {strongAttemptLabel(marksPercent)}
            </div>
          </div>

          <div className="text-center w-full min-w-0">
            <div className="text-4xl sm:text-[46px] font-extrabold text-slate-800 leading-none">{animatedMarks}</div>
            <div className="text-slate-500 text-xs sm:text-[13px] mb-3 sm:mb-3.5">out of {result.totalMarks} marks (net)</div>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-md mx-auto">
              <div className="rounded-[14px] py-3 px-1.5 text-center border border-emerald-200 bg-emerald-50">
                <div className="text-xl font-extrabold text-emerald-600">{animatedCorrect}</div>
                <div className="text-mini text-slate-500 font-medium">Correct</div>
              </div>
              <div className="rounded-[14px] py-3 px-1.5 text-center border border-red-200 bg-red-50">
                <div className="text-xl font-extrabold text-red-500">{animatedWrong}</div>
                <div className="text-mini text-slate-500 font-medium">Wrong</div>
              </div>
              <div className="rounded-[14px] py-3 px-1.5 text-center border border-slate-200 bg-slate-50">
                <div className="text-xl font-extrabold text-slate-500">{animatedSkipped}</div>
                <div className="text-mini text-slate-500 font-medium">Skipped</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 w-full">
            <div>
              <div className="flex justify-between text-[13px] font-semibold mb-1.5">
                <span>Accuracy Rate</span>
                <span className="text-violet-600">{accuracyRate.toFixed(1)}%</span>
              </div>
              <div className="h-[9px] bg-[#eef0f4] rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-[#9333ea] to-pink-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, accuracyRate)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] font-semibold mb-1.5">
                <span>Completion Rate</span>
                <span className="text-violet-600">{completionRate.toFixed(0)}%</span>
              </div>
              <div className="h-[9px] bg-[#eef0f4] rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-pink-500 to-[#9333ea] transition-all duration-1000"
                  style={{ width: `${Math.min(100, completionRate)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-[14px] px-4 py-3 justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-2 text-blue-500 text-[13px]">
                <Clock className="w-4 h-4" />
                Time Taken
              </span>
              <span>{formatTime(result.timeTaken)}</span>
            </div>
          </div>
        </div>
      </div>

      {aiError && (
        <p className="text-red-600 text-sm p-4 rounded-xl bg-red-50 border border-red-200">{aiError}</p>
      )}

      {/* Snapshot */}
      <ReportCard title="AI Performance Snapshot" icon="▦">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Attempted', v: attemptedCount, c: 'g' },
            { l: 'Unattempted', v: result.unattempted, c: 'b' },
            { l: 'Wrong', v: result.wrongAnswers, c: 'r' },
            { l: 'Accuracy', v: `${accuracyRate.toFixed(0)}%`, c: 'v' },
          ].map((cell) => (
            <div
              key={cell.l}
              className={`rounded-[14px] px-4 py-3.5 border ${
                cell.c === 'g'
                  ? 'bg-emerald-50 border-emerald-200'
                  : cell.c === 'b'
                    ? 'bg-blue-50 border-blue-200'
                    : cell.c === 'r'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-violet-50 border-violet-200'
              }`}
            >
              <div className="text-xs font-semibold text-slate-500">{cell.l}</div>
              <div
                className={`text-2xl font-extrabold mt-0.5 ${
                  cell.c === 'g'
                    ? 'text-emerald-600'
                    : cell.c === 'b'
                      ? 'text-blue-500'
                      : cell.c === 'r'
                        ? 'text-red-500'
                        : 'text-violet-600'
                }`}
              >
                {cell.v}
              </div>
            </div>
          ))}
        </div>
      </ReportCard>

      {/* Reconciliation */}
      <ReportCard title="Score Reconciliation" icon="⚖">
        <div className="flex flex-col gap-3">
          {[
            { lab: 'Marks earned', pct: reconciliation.earnedPct, val: `+${reconciliation.earned}`, color: 'bg-emerald-600', tc: 'text-emerald-600' },
            { lab: 'Negative penalty', pct: reconciliation.negPct, val: `−${reconciliation.neg}`, color: 'bg-red-500', tc: 'text-red-500' },
            { lab: 'Final score (net)', pct: reconciliation.netPct, val: String(reconciliation.net), color: 'bg-gradient-to-r from-[#9333ea] to-pink-500', tc: 'text-violet-600', bold: true },
          ].map((row) => (
            <div key={row.lab} className="grid grid-cols-[minmax(0,88px)_1fr_48px] sm:grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-2 sm:gap-3 text-xs sm:text-[13px]">
              <span className={`font-medium text-slate-800 ${row.bold ? 'font-bold' : ''}`}>{row.lab}</span>
              <div className="h-[13px] rounded-[5px] bg-[#eef0f4] overflow-hidden">
                <div className={`h-full rounded-[5px] ${row.color}`} style={{ width: `${Math.min(100, row.pct)}%` }} />
              </div>
              <span className={`text-right font-bold ${row.tc}`}>{row.val}</span>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-slate-500 mt-3.5">
          Net <b className="text-slate-800">{reconciliation.net}</b> of {result.totalMarks}:{' '}
          <b className="text-slate-800">{reconciliation.earned}</b> from correct answers minus{' '}
          <b className="text-red-500">{reconciliation.neg}</b> negative marking
          {result.wrongAnswers > 0 ? (
            <>
              {' '}
              (~<b className="text-red-500">{costPerWrong}</b> marks impact per wrong answer).
            </>
          ) : null}
          .
        </p>
      </ReportCard>

      {/* Potential */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-[18px] rounded-xl sm:rounded-[20px] p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 shadow-[0_10px_30px_-20px_rgba(30,41,59,0.35)]">
        <div className="text-[42px] font-extrabold leading-none bg-gradient-to-br from-blue-600 to-green-600 bg-clip-text text-transparent shrink-0">
          {potentialMetrics.wrong > 0 ? `+${potentialMetrics.swing}` : potentialMetrics.net}
        </div>
        <p className="text-[13.5px] text-slate-600">
          <b className="text-slate-800">
            You scored {potentialMetrics.net}/{potentialMetrics.total} marks.
          </b>{' '}
          {potentialMetrics.wrong > 0 ? (
            <>
              Fixing your {potentialMetrics.wrong} wrong answer
              {potentialMetrics.wrong === 1 ? '' : 's'} can add up to{' '}
              <b className="text-green-700">+{potentialMetrics.swing}</b> marks (potential{' '}
              <b className="text-slate-800">
                {potentialMetrics.ceiling}/{potentialMetrics.total}
              </b>
              ) — precision beats rushing.
            </>
          ) : (
            <>No marks left on the table from wrong answers on this attempt.</>
          )}
        </p>
      </div>

      {/* Subject mastery */}
      {subjectRows.length > 0 && (
        <ReportCard title="Subject Mastery" icon="◆">
          <div className="flex flex-col gap-4">
            {subjectRows.map((row) => (
              <div key={row.subject} className="grid grid-cols-[minmax(0,72px)_1fr_52px] sm:grid-cols-[92px_1fr_60px] items-center gap-2 sm:gap-3.5">
                <span className="font-semibold text-slate-800 text-[13.5px]">{row.subject}</span>
                <div className="h-[22px] bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg flex items-center justify-end pr-2 text-white text-mini font-bold ${
                      row.pct >= 99 ? 'bg-green-600' : 'bg-gradient-to-r from-[#9333ea] to-pink-500'
                    }`}
                    style={{ width: `${Math.max(8, row.pct)}%` }}
                  >
                    {row.pct >= 15 ? `${row.pct.toFixed(0)}%` : ''}
                  </div>
                </div>
                <span className="text-right text-xs text-slate-500">
                  <b className="text-slate-800">{row.correct}</b>/{row.total}
                </span>
              </div>
            ))}
          </div>
        </ReportCard>
      )}

      {/* Concept pressure */}
      {conceptCards.length > 0 && (
        <ReportCard title="Concept Pressure Points" icon="◎">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {conceptCards.map((c, i) => (
              <div key={i} className="border border-slate-200 rounded-[14px] p-4 border-t-[3px] border-t-violet-600">
                <div className="text-[10.5px] uppercase tracking-wider font-bold text-violet-600">{c.tag}</div>
                <div className="font-semibold text-slate-800 mt-1.5 text-sm">{c.name}</div>
                <div className="text-[11.5px] text-slate-500 mt-1.5 line-clamp-2">{c.meta}</div>
              </div>
            ))}
          </div>
        </ReportCard>
      )}

      {/* Marks lost */}
      <ReportCard title="Marks-Lost Analysis" icon="▼">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[14px] py-4 px-2 text-center border border-emerald-200 bg-emerald-50">
            <div className="text-[28px] font-extrabold text-emerald-600 leading-none">{mistakeTaxonomy.careless}</div>
            <div className="text-[11.5px] text-slate-500 font-semibold mt-1.5">Silly slips</div>
          </div>
          <div className="rounded-[14px] py-4 px-2 text-center border border-emerald-200 bg-emerald-50">
            <div className="text-[28px] font-extrabold text-emerald-600 leading-none">{mistakeTaxonomy.conceptual}</div>
            <div className="text-[11.5px] text-slate-500 font-semibold mt-1.5">Conceptual gaps</div>
          </div>
          <div className="rounded-[14px] py-4 px-2 text-center border border-orange-200 bg-orange-50">
            <div className="text-[28px] font-extrabold text-orange-600 leading-none">{wrongQuickCount}</div>
            <div className="text-[11.5px] text-slate-500 font-semibold mt-1.5">Likely guesses</div>
          </div>
          <div className="rounded-[14px] py-4 px-2 text-center border border-red-200 bg-red-50">
            <div className="text-[28px] font-extrabold text-red-500 leading-none">
              −{Math.round(result.wrongAnswers * (marksPerWrong > 0 ? marksPerWrong / 2 : 1))}
            </div>
            <div className="text-[11.5px] text-slate-500 font-semibold mt-1.5">Negative incurred</div>
          </div>
        </div>
      </ReportCard>

      {/* Time management */}
      <ReportCard title="Time Management" icon="⏱">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-[14px] py-3.5 text-center">
            <div className="text-[22px] font-extrabold text-slate-800">{formatTime(result.timeTaken)}</div>
            <div className="text-mini text-slate-500 font-semibold mt-1">Total time</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-[14px] py-3.5 text-center">
            <div className="text-[22px] font-extrabold text-slate-800">{avgTimePerQuestion}s</div>
            <div className="text-mini text-slate-500 font-semibold mt-1">Per question (avg)</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-[14px] py-3.5 text-center">
            <div className="text-[22px] font-extrabold text-slate-800">~{Math.round(idealPerQuestion)}s</div>
            <div className="text-mini text-slate-500 font-semibold mt-1">Ideal / question</div>
          </div>
        </div>
        {showTimeIntegrity && (
          <div className="flex gap-3.5 bg-orange-50 border border-dashed border-orange-300 rounded-[14px] px-4 py-4">
            <span className="w-[30px] h-[30px] rounded-lg bg-orange-200 text-orange-800 font-extrabold grid place-items-center shrink-0">
              !
            </span>
            <p className="text-[13px] text-orange-900">
              <b>Integrity check:</b> {totalQuestionCount} questions in {formatTime(result.timeTaken)} is ~
              {avgTimePerQuestion}s each — unusually fast. Verify the timer captured true elapsed time before treating
              this as a pacing strength.
            </p>
          </div>
        )}
      </ReportCard>

      {/* Plan */}
      <ReportCard title="Personalised Improvement Plan" icon="✦">
        <div className="flex flex-col">
          {planSteps.map((step, i) => (
            <div
              key={i}
              className="grid grid-cols-[34px_1fr] gap-3.5 py-3.5 border-b border-dashed border-slate-200 last:border-0"
            >
              <span className="w-[30px] h-[30px] rounded-lg text-white font-extrabold grid place-items-center bg-gradient-to-br from-[#9333ea] to-pink-500 text-sm">
                {i + 1}
              </span>
              <p className="text-[13.5px] text-slate-600">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center bg-violet-50 border border-violet-200 rounded-xl py-3 font-semibold text-violet-600 text-[13.5px]">
          Weekly loop → Revise → Short drill → Timed mixed set
        </div>
      </ReportCard>

      {/* Vidya report */}
      <ReportCard title="Vidya Performance Report" icon="✺" className="[&_h3]:mb-4">
        <div className="space-y-3">
          {geminiParagraphs.map((p, i) => (
            <p key={i} className="text-[13.5px] text-slate-600 leading-relaxed">
              {p}
            </p>
          ))}
          {aiLoading && !aiAnalysis?.summary ? (
            <p className="text-[12px] text-slate-400" aria-live="polite">
              Loading personalised insights…
            </p>
          ) : null}
        </div>
        <div className="mt-4 rounded-[14px] px-4 py-3.5 bg-violet-50 border border-violet-200 text-violet-600 font-semibold text-[13.5px]">
          {aiAnalysis?.motivation ||
            'Deep, consistent practice beats intensity spikes — small daily wins compound into a much stronger next attempt.'}
        </div>
      </ReportCard>
    </div>
  );
}
