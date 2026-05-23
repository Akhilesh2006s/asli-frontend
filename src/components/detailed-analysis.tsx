import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { API_BASE_URL } from '@/lib/api-config';
import { normalizeAndFormatExamDisplayText } from '@/lib/exam-text-normalize';
import AdvancedPerformanceDashboard from '@/components/analytics/AdvancedPerformanceDashboard';
import AiReportTab from '@/components/exam-analysis/AiReportTab';
import {
  WeakSubjectResourcesCard,
  type WeakSubjectContentMap,
} from '@/components/weak-subject-resources-card';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BookOpen,
  Calculator,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  PieChart,
  LineChart,
  Brain,
  Zap,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Flame,
  Crown,
  Sparkles,
  Eye,
  Play,
  FlaskConical,
  Atom,
  ChevronRight,
  RefreshCw,
  Timer,
  Gem,
} from 'lucide-react';

interface Question {
  _id: string;
  questionText: string;
  questionImage?: string;
  questionType: 'mcq' | 'multiple' | 'integer';
  options?: Array<{ text: string; isCorrect: boolean; _id?: string }> | string[];
  correctAnswer: string | string[] | { text: string; isCorrect: boolean; _id?: string };
  marks: number;
  negativeMarks: number;
  explanation?: string;
  subject: 'maths' | 'physics' | 'chemistry' | 'biology';
}

interface ExamResult {
  _id?: string;
  resultId?: string;
  examId: string;
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
  subjectWiseScore: {
    maths: { correct: number; total: number; marks: number };
    physics: { correct: number; total: number; marks: number };
    chemistry: { correct: number; total: number; marks: number };
    biology?: { correct: number; total: number; marks: number };
  };
  answers?: Record<string, any>;
  questions?: Question[];
  questionAnalytics?: Array<{
    questionId?: string;
    index?: number;
    timeTaken?: number;
    timeBucket?: string;
    difficulty?: string;
    status?: string;
  }>;
}

type QuestionFilterId =
  | 'all'
  | 'correct'
  | 'wrong'
  | 'skipped'
  | 'wrong-quick'
  | 'hard-wrong'
  | 'time-pressure';

interface DetailedAnalysisProps {
  result: ExamResult;
  examTitle: string;
  onBack: () => void;
}

type WeakTopicRow = { subject: string; topic: string };

type AnalysisMeta = {
  weakTopics?: WeakTopicRow[];
  weakSubjects?: string[];
};

interface AiExamAnalysis {
  riskLevel?: 'high' | 'medium' | 'low' | string;
  riskScore?: number;
  summary?: string;
  strengths?: string[];
  rootCauses?: string[];
  predictions?: {
    nextExamPrediction?: number;
    confidence?: number;
    trend?: 'declining' | 'stable' | 'improving' | string;
  };
  interventions?: Array<{
    priority?: 'high' | 'medium' | 'low' | string;
    action?: string;
    reasoning?: string;
    expectedImpact?: string;
  }>;
  focusAreas?: Array<{
    subject: string;
    issue: string;
    whatToDo: string;
    priority: 'high' | 'medium' | 'low' | string;
  }>;
  actionPlan?: {
    today?: string[];
    thisWeek?: string[];
    beforeNextExam?: string[];
  };
  recommendedAiTools?: Array<{
    toolType: string;
    why: string;
    howToUse: string;
  }>;
  videoRecommendations?: Array<{
    title: string;
    subject?: string;
    topic?: string;
    url: string;
    why?: string;
  }>;
  questionInsights?: Array<{
    index?: number;
    questionId?: string;
    subject?: string;
    questionType?: string;
    status?: 'correct' | 'wrong' | 'unattempted' | string;
    conceptGap?: string;
    fixStrategy?: string;
    practiceTask?: string;
    geminiExplanation?: string;
    insight?: string;
    priority?: 'high' | 'medium' | 'low' | string;
  }>;
  motivation?: string;
}

type ErrorType = 'careless' | 'conceptual' | 'time-pressure' | 'reading' | null;

type PlanTopic = {
  topicNum: number;
  title: string;
  subtitle: string;
  duration: string;
};

function getAnswerTimeSeconds(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { timeTaken?: number; time?: number; duration?: number };
    if (typeof o.timeTaken === 'number') return o.timeTaken;
    if (typeof o.time === 'number') return o.time;
    if (typeof o.duration === 'number') return o.duration;
  }
  return null;
}

function getQuestionDifficulty(q: Question): 'easy' | 'medium' | 'hard' {
  const marks = q.marks ?? 4;
  if (marks <= 2) return 'easy';
  if (marks <= 3) return 'medium';
  return 'hard';
}

function resolveQuestionDifficulty(q: Question): 'easy' | 'medium' | 'hard' {
  const raw = String((q as { difficulty?: string }).difficulty || '').trim().toLowerCase();
  if (raw.includes('high') || raw.includes('difficult') || raw === 'hard') return 'hard';
  if (raw.includes('moderate') || raw === 'medium') return 'medium';
  if (raw.includes('easy')) return 'easy';
  return getQuestionDifficulty(q);
}

function getIdealTimeSeconds(difficulty: 'easy' | 'medium' | 'hard'): number {
  if (difficulty === 'easy') return 30;
  if (difficulty === 'medium') return 60;
  return 90;
}

function isTimePressureWrong(
  timeSeconds: number | null,
  avgTime: number,
  difficulty: 'easy' | 'medium' | 'hard',
  timeBucket?: string
): boolean {
  if (timeBucket === 'over_time') return true;
  if (timeSeconds == null) return false;
  const ideal = getIdealTimeSeconds(difficulty);
  return timeSeconds > ideal * 1.25 || (avgTime > 0 && timeSeconds >= avgTime * 1.2);
}

function matchesQuestionFilter(
  filter: QuestionFilterId,
  status: {
    attempted: boolean;
    correct: boolean;
    isWrongQuick: boolean;
    isHardWrong: boolean;
    isTimePressure: boolean;
  }
): boolean {
  if (filter === 'all') return true;
  if (filter === 'correct') return status.correct;
  if (filter === 'wrong') return status.attempted && !status.correct;
  if (filter === 'skipped') return !status.attempted;
  if (filter === 'wrong-quick') return status.isWrongQuick;
  if (filter === 'hard-wrong') return status.isHardWrong;
  if (filter === 'time-pressure') return status.isTimePressure;
  return true;
}

function classifyErrorType(
  question: Question,
  userAnswer: unknown,
  timeTaken: number | null,
  opts: {
    isCorrect: boolean;
    isAttempted: boolean;
    avgTime: number;
    totalExamTime: number;
    aiInsight?: string;
  }
): ErrorType {
  if (!opts.isAttempted || opts.isCorrect) return null;
  if (opts.aiInsight && /not|except|incorrectly read/i.test(opts.aiInsight)) return 'reading';
  if (
    timeTaken != null &&
    opts.avgTime > 0 &&
    timeTaken >= opts.avgTime * 1.2
  ) {
    return 'time-pressure';
  }
  if (timeTaken != null && timeTaken < 30) return 'careless';
  const diff = getQuestionDifficulty(question);
  if (timeTaken != null && timeTaken >= opts.avgTime && diff === 'hard') return 'conceptual';
  if (timeTaken != null && timeTaken >= opts.avgTime * 1.2) return 'conceptual';
  return 'careless';
}

function getTimeXAccuracyQuadrant(
  questions: Question[],
  getUserAnswer: (q: Question, i: number) => unknown,
  compare: (q: Question, ua: unknown, ca: unknown) => boolean,
  totalTime: number
): { fastWrong: number; fastRight: number; slowWrong: number; slowRight: number } {
  const out = { fastWrong: 0, fastRight: 0, slowWrong: 0, slowRight: 0 };
  if (!questions.length) return out;
  const avgTime = totalTime / Math.max(questions.length, 1);
  let hasPerQuestionTime = false;
  const classified: Array<{ fast: boolean; right: boolean }> = [];

  questions.forEach((q, i) => {
    const ua = getUserAnswer(q, i);
    const attempted = ua !== undefined && ua !== null && ua !== '';
    if (!attempted) return;
    const t = getAnswerTimeSeconds(ua);
    if (t != null) hasPerQuestionTime = true;
    const right = compare(q, ua, q.correctAnswer);
    const fast = (t ?? avgTime) < avgTime;
    classified.push({ fast, right });
  });

  if (!classified.length) {
    const wrong = questions.filter((q, i) => {
      const ua = getUserAnswer(q, i);
      return ua != null && ua !== '' && !compare(q, ua, q.correctAnswer);
    }).length;
    const correct = questions.filter((q, i) => {
      const ua = getUserAnswer(q, i);
      return ua != null && ua !== '' && compare(q, ua, q.correctAnswer);
    }).length;
    out.fastWrong = Math.round(wrong * 0.4);
    out.slowWrong = wrong - out.fastWrong;
    out.fastRight = Math.round(correct * 0.35);
    out.slowRight = correct - out.fastRight;
    return out;
  }

  classified.forEach(({ fast, right }) => {
    if (fast && right) out.fastRight += 1;
    else if (fast && !right) out.fastWrong += 1;
    else if (!fast && right) out.slowRight += 1;
    else out.slowWrong += 1;
  });
  void hasPerQuestionTime;
  return out;
}

function getDNAScores(
  result: ExamResult,
  aiAnalysis: AiExamAnalysis | null
): { accuracy: number; speed: number; concept: number; difficulty: number; consistency: number } {
  const attempted = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const total = result.totalQuestions || attempted + (result.unattempted || 0);
  const accuracy = total > 0 ? (result.correctAnswers / total) * 100 : 0;
  const avgTime = total > 0 ? result.timeTaken / total : 120;
  const speed = Math.max(0, Math.min(100, 100 - (avgTime / 180) * 100));
  const concept =
    aiAnalysis?.strengths?.length && aiAnalysis.strengths.length > 0
      ? Math.min(100, 40 + aiAnalysis.strengths.length * 15)
      : accuracy * 0.6;
  const difficulty = Math.min(
    100,
    ((result.obtainedMarks || 0) / Math.max(result.totalMarks || 1, 1)) * 100 + 20
  );
  const completion = total > 0 ? (attempted / total) * 100 : 0;
  const consistency = Math.min(100, (accuracy + completion) / 2);
  return { accuracy, speed, concept, difficulty, consistency };
}

function getDNAProfileLabel(
  dna: ReturnType<typeof getDNAScores>,
  accuracyPct: number,
  avgTimePerQ: number
): string {
  if (accuracyPct < 30 && avgTimePerQ < 60) return '⚡ Rushed Reader';
  if (dna.accuracy >= 70) return '🎯 Precision Player';
  if (dna.speed < 40) return '🐢 Deep Thinker';
  if (dna.concept < 40) return '🧩 Concept Builder';
  return '📊 Balanced Learner';
}

function generatePlanTopics(
  _result: ExamResult,
  aiAnalysis: AiExamAnalysis | null
): PlanTopic[] {
  const weekActions = aiAnalysis?.actionPlan?.thisWeek || [];
  const focus = aiAnalysis?.focusAreas || [];
  const topics = focus.map((f) => {
    const m = String(f.issue || '').match(/in\s+(.+?)(?:\s*\(|$)/i);
    return m?.[1]?.trim() || f.subject;
  });
  const defaults = [
    'Rotation',
    'Slow-Mode Read',
    'Friction',
    'Pacing Drill',
    'Calorimetry',
    'Calculus',
    'Mock Retake',
  ];
  const subtitles = [
    'Concept + 10 Qs',
    'Read twice',
    'Build on prior topic',
    'Timed 15-Q drill',
    'Concept + 10 Q',
    'Core maths practice',
    'Full mock retake',
  ];
  const durations = ['25 min', '15 min', '25 min', '20 min', '25 min', '30 min', '35 min'];

  return Array.from({ length: 7 }, (_, i) => ({
    topicNum: i + 1,
    title: topics[i] || weekActions[i]?.slice(0, 48) || defaults[i],
    subtitle: subtitles[i],
    duration: durations[i],
  }));
}

type PlanQueueItem = { id: string; minutes: number; title: string; tier: 'warmup' | 'core' | 'stretch' };

function generatePlanQueueItems(topicTitle: string, topicIndex: number): {
  warmup: PlanQueueItem[];
  core: PlanQueueItem[];
  stretch: PlanQueueItem[];
} {
  const concept = topicTitle || 'Focus';
  const warmup: PlanQueueItem[] = [
    { id: 'w1', minutes: 1, title: `${concept}: quick recall`, tier: 'warmup' },
    { id: 'w2', minutes: 1, title: `${concept}: formula check`, tier: 'warmup' },
    { id: 'w3', minutes: 1, title: `${concept}: easy starter`, tier: 'warmup' },
  ];
  const core: PlanQueueItem[] = [
    { id: 'c1', minutes: 2, title: `${concept}: standard problem`, tier: 'core' },
    { id: 'c2', minutes: 2, title: `${concept}: mixed practice`, tier: 'core' },
    { id: 'c3', minutes: 2, title: `${concept}: exam-style Q`, tier: 'core' },
    { id: 'c4', minutes: 2, title: `${concept}: timed drill`, tier: 'core' },
    { id: 'c5', minutes: 2, title: `${concept}: error review`, tier: 'core' },
    { id: 'c6', minutes: 2, title: `${concept}: checkpoint`, tier: 'core' },
    { id: 'c7', minutes: 2, title: `${concept}: consolidation`, tier: 'core' },
  ];
  const stretch: PlanQueueItem[] =
    topicIndex >= 5
      ? [
          { id: 's1', minutes: 3, title: `${concept}: challenge set A`, tier: 'stretch' },
          { id: 's2', minutes: 3, title: `${concept}: challenge set B`, tier: 'stretch' },
        ]
      : [{ id: 's1', minutes: 3, title: `${concept}: optional hard Q`, tier: 'stretch' }];
  return { warmup, core, stretch };
}

function getGradeRingColor(gradeLetter: string): string {
  if (gradeLetter.startsWith('A')) return '#10b981';
  if (gradeLetter.startsWith('B')) return '#10b981';
  if (gradeLetter.startsWith('C')) return '#f59e0b';
  return '#ef4444';
}

function getGradePillClass(gradeLetter: string): string {
  if (gradeLetter.startsWith('A') || gradeLetter.startsWith('B')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (gradeLetter.startsWith('C')) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function PerformanceDNARadar({ scores }: { scores: ReturnType<typeof getDNAScores> }) {
  const axes = [
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'speed', label: 'Speed' },
    { key: 'concept', label: 'Concept' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'consistency', label: 'Consistency' },
  ] as const;
  const cx = 120;
  const cy = 120;
  const r = 80;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const valueAt = (i: number) => {
    const k = axes[i].key;
    return (scores[k] / 100) * r;
  };
  const point = (i: number, radius: number) => {
    const a = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };
  const dataPoints = axes.map((_, i) => point(i, valueAt(i)));
  const poly = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          key={level}
          points={axes.map((_, i) => {
            const p = point(i, r * level);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {axes.map((ax, i) => {
        const p = point(i, r);
        const lp = point(i, r + 18);
        return (
          <g key={ax.key}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={lp.x} y={lp.y} textAnchor="middle" fontSize="9" fill="#6b7280">
              {ax.label}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill="rgba(124,58,237,0.25)" stroke="#7C3AED" strokeWidth="2" />
    </svg>
  );
}

function getStudentDisplayName(): string {
  if (typeof window === 'undefined') return 'Student';
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'Student';
    const u = JSON.parse(raw);
    return u?.fullName || u?.name || u?.email?.split('@')[0] || 'Student';
  } catch {
    return 'Student';
  }
}

type WeakArea = {
  subject: string;
  percentage: number;
  correct: number;
  total: number;
  color: string;
  bgColor: string;
};

/** Handles string ids and populated / extended JSON shapes so /review URLs stay valid. */
function normalizeMongoId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object' && value !== null) {
    const o = value as { _id?: unknown; $oid?: unknown };
    if (typeof o.$oid === 'string') return o.$oid.trim();
    if (o.$oid != null) return String(o.$oid).trim();
    if (typeof o._id === 'string') return o._id.trim();
    if (o._id != null) return normalizeMongoId(o._id);
  }
  return '';
}

export default function DetailedAnalysis({ result, examTitle, onBack }: DetailedAnalysisProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [questionFilter, setQuestionFilter] = useState<QuestionFilterId>('all');
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null);
  const [showAllQuestionsList, setShowAllQuestionsList] = useState(false);
  const [selectedPlanDayIndex, setSelectedPlanDayIndex] = useState(0);
  const planQueueRef = useRef<HTMLDivElement>(null);
  const [mobileQuestionIndex, setMobileQuestionIndex] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [animDirection, setAnimDirection] = useState<'up' | 'down'>('up');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AiExamAnalysis | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisMeta | null>(null);
  /** Merges in questions/answers from /review when the parent result has no question list (e.g. right after submit). */
  const [displayResult, setDisplayResult] = useState<ExamResult>(result);

  useEffect(() => {
    setDisplayResult((prev) => ({
      ...prev,
      ...result,
      answers:
        result.answers && typeof result.answers === 'object' && Object.keys(result.answers).length > 0
          ? result.answers
          : prev.answers,
      questions:
        Array.isArray(result.questions) && result.questions.length > 0
          ? result.questions
          : prev.questions,
    }));
  }, [result]);

  const normalizeLegacyExamText = (value: unknown, subject?: string): string =>
    normalizeAndFormatExamDisplayText(value, subject);
  const normalizeExamText = (value: unknown, subject?: string): string =>
    normalizeLegacyExamText(value, subject);
  const [animatedValues, setAnimatedValues] = useState({
    percentage: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unattempted: 0,
    obtainedMarks: 0
  });

  // Helper function to extract text from option objects
  const getOptionText = (option: any, subject?: string): string => {
    console.log('getOptionText called with:', option, 'type:', typeof option);
    
    if (option === null || option === undefined) {
      console.log('Option is null/undefined, returning empty string');
      return '';
    }
    
    if (typeof option === 'string') {
      console.log('Option is string:', option);
      return normalizeLegacyExamText(option, subject);
    }
    
    if (typeof option === 'number') {
      console.log('Option is number:', option);
      return normalizeLegacyExamText(String(option), subject);
    }
    
    if (typeof option === 'boolean') {
      console.log('Option is boolean:', option);
      return normalizeLegacyExamText(String(option), subject);
    }
    
    if (typeof option === 'object' && option !== null) {
      console.log('Option is object:', option);
      
      // Try different possible text properties
      if (option.text !== undefined && option.text !== null) {
        console.log('Found text property:', option.text);
        return normalizeLegacyExamText(String(option.text), subject);
      }
      if (option.label !== undefined && option.label !== null) {
        console.log('Found label property:', option.label);
        return normalizeLegacyExamText(String(option.label), subject);
      }
      if (option.value !== undefined && option.value !== null) {
        console.log('Found value property:', option.value);
        return normalizeLegacyExamText(String(option.value), subject);
      }
      if (option.answer !== undefined && option.answer !== null) {
        console.log('Found answer property:', option.answer);
        return normalizeLegacyExamText(String(option.answer), subject);
      }
      if (option._id !== undefined && option._id !== null) {
        console.log('Found _id property:', option._id);
        return normalizeLegacyExamText(String(option._id), subject);
      }
      
      // If it's an array, join the elements
      if (Array.isArray(option)) {
        console.log('Option is array:', option);
        return option.map((o) => getOptionText(o, subject)).join(', ');
      }
      
      // Last resort: stringify the object
      console.log('Using JSON.stringify as last resort:', JSON.stringify(option));
      return normalizeLegacyExamText(JSON.stringify(option), subject);
    }
    
    console.log('Fallback to String():', String(option));
    return normalizeLegacyExamText(String(option), subject);
  };

  // Helper function to check if an option is correct
  const isOptionCorrect = (option: any): boolean => {
    if (typeof option === 'object' && option !== null) {
      return option.isCorrect === true;
    }
    return false;
  };

  // Helper function to compare answers properly
  const getQuestionOptions = (question?: Question) => {
    if (!question?.options || !Array.isArray(question.options)) return [];
    const subj = question?.subject;
    return question.options.map((option, index) => {
      if (typeof option === 'string') {
        return {
          text: normalizeExamText(option, subj),
          rawText: String(option),
          id: '',
          index,
          letter: String.fromCharCode(65 + index),
        };
      }
      return {
        text: normalizeExamText(option?.text || option?._id || '', subj),
        rawText: String(option?.text || ''),
        id: String(option?._id || ''),
        index,
        letter: String.fromCharCode(65 + index),
      };
    });
  };

  const resolveSingleAnswerText = (question: Question, rawAnswer: any): string => {
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') return '';

    const options = getQuestionOptions(question);
    const rawText = String(rawAnswer).trim();
    const normalizedRaw = normalizeExamText(rawText, question.subject);

    if (!options.length || question.questionType === 'integer') {
      return normalizedRaw;
    }

    // Numeric index (supports 0-based and 1-based legacy data).
    if (/^-?\d+$/.test(rawText)) {
      const idx = Number(rawText);
      if (idx >= 0 && idx < options.length) return options[idx].text;
      if (idx >= 1 && idx <= options.length) return options[idx - 1].text;
    }

    // Letter option (A/B/C/D style).
    if (/^[a-z]$/i.test(rawText)) {
      const letter = rawText.toUpperCase();
      const byLetter = options.find((o) => o.letter === letter);
      if (byLetter) return byLetter.text;
    }

    // ObjectId/text matching fallback.
    const byId = options.find((o) => o.id && o.id === rawText);
    if (byId) return byId.text;
    const byRaw = options.find((o) => o.rawText && o.rawText === rawText);
    if (byRaw) return byRaw.text;
    const byNormalized = options.find((o) => o.text === normalizedRaw);
    if (byNormalized) return byNormalized.text;

    return normalizedRaw;
  };

  const resolveAnswerTexts = (question: Question, rawAnswer: any): string[] => {
    const list = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
    return list
      .map((item) => resolveSingleAnswerText(question, item))
      .filter((text) => !!text);
  };

  const compareAnswers = (question: Question, userAnswer: any, correctAnswer: any): boolean => {
    const userTexts = resolveAnswerTexts(question, userAnswer).sort();
    const correctTexts = resolveAnswerTexts(question, correctAnswer).sort();
    if (userTexts.length === 0 || correctTexts.length === 0) return false;
    if (userTexts.length !== correctTexts.length) return false;
    return JSON.stringify(userTexts) === JSON.stringify(correctTexts);
  };

  const normalizeAnswerKey = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim().toLowerCase();
    if (typeof value === 'object') {
      const obj = value as any;
      if (obj.$oid) return String(obj.$oid).trim().toLowerCase();
      if (obj._id) return String(obj._id).trim().toLowerCase();
      if (obj.id) return String(obj.id).trim().toLowerCase();
    }
    return String(value).trim().toLowerCase();
  };

  const getUserAnswerForQuestion = (question: Question, questionIndex: number): any => {
    const baseAnswers = result.answers && typeof result.answers === 'object' && !Array.isArray(result.answers) ? result.answers : {};
    const extraAnswers =
      displayResult.answers && typeof displayResult.answers === 'object' && !Array.isArray(displayResult.answers)
        ? displayResult.answers
        : {};
    const answerMap = { ...baseAnswers, ...extraAnswers };
    const questionId = normalizeAnswerKey((question as any)?._id);
    const candidateKeys = [
      (question as any)?._id,
      (question as any)?.id,
      (question as any)?.questionId,
      questionId,
      String(questionIndex),
      String(questionIndex + 1),
    ]
      .map((k) => normalizeAnswerKey(k))
      .filter(Boolean);

    for (const key of candidateKeys) {
      const direct = (answerMap as any)[key];
      if (direct !== undefined) return direct;
    }

    if (!questionId) return undefined;

    for (const [rawKey, rawValue] of Object.entries(answerMap)) {
      if (normalizeAnswerKey(rawKey) === questionId) {
        return rawValue;
      }
    }

    return undefined;
  };

  const getAnalyticsForQuestion = useCallback(
    (question: Question, questionIndex: number) => {
      const rows =
        (displayResult as ExamResult).questionAnalytics ??
        result.questionAnalytics;
      if (!Array.isArray(rows) || !rows.length) return undefined;
      const qid = normalizeAnswerKey((question as { _id?: string })._id);
      return rows.find(
        (row) =>
          row.index === questionIndex ||
          row.index === questionIndex + 1 ||
          (row.questionId && normalizeAnswerKey(row.questionId) === qid)
      );
    },
    [displayResult, result.questionAnalytics]
  );

  const getQuestionTimeForIndex = useCallback(
    (question: Question, questionIndex: number, userAnswer: unknown) => {
      const fromAnswer = getAnswerTimeSeconds(userAnswer);
      if (fromAnswer != null) return fromAnswer;
      const row = getAnalyticsForQuestion(question, questionIndex);
      if (row?.timeTaken != null && row.timeTaken > 0) return row.timeTaken;
      return null;
    },
    [getAnalyticsForQuestion]
  );

  // Animate values on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    
    const animateValue = (start: number, end: number, callback: (value: number) => void) => {
      let current = start;
      const increment = (end - start) / steps;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          current = end;
          clearInterval(timer);
        }
        callback(Math.round(current));
      }, stepDuration);
    };

    const animateFloatValue = (start: number, end: number, callback: (value: number) => void) => {
      let current = start;
      const increment = (end - start) / steps;

      const timer = setInterval(() => {
        current += increment;
        if ((increment >= 0 && current >= end) || (increment < 0 && current <= end)) {
          current = end;
          clearInterval(timer);
        }
        callback(Number(current.toFixed(1)));
      }, stepDuration);
    };

    // Add a small delay before starting animations
    setTimeout(() => {
      const attempted = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
      const totalQuestionCount = Number(result.totalQuestions || 0)
        || (attempted + (result.unattempted || 0));
      const derivedPercentage = totalQuestionCount > 0
        ? (result.correctAnswers / totalQuestionCount) * 100
        : 0;
      animateFloatValue(0, derivedPercentage, (value) => setAnimatedValues(prev => ({ ...prev, percentage: value })));
      animateValue(0, result.correctAnswers, (value) => setAnimatedValues(prev => ({ ...prev, correctAnswers: value })));
      animateValue(0, result.wrongAnswers, (value) => setAnimatedValues(prev => ({ ...prev, wrongAnswers: value })));
      animateValue(0, result.unattempted, (value) => setAnimatedValues(prev => ({ ...prev, unattempted: value })));
      animateValue(0, result.obtainedMarks, (value) => setAnimatedValues(prev => ({ ...prev, obtainedMarks: value })));
    }, 300);
  }, [result]);

  // Merge parent `result` updates without wiping questions we loaded via /review (parent often passes a new object each render).
  useEffect(() => {
    setDisplayResult((dr) => {
      const parentHasQuestions = Array.isArray(result.questions) && result.questions.length > 0;
      if (parentHasQuestions) {
        return { ...result, questions: result.questions };
      }
      const mergedAnswers = (() => {
        const fromParent =
          result.answers && typeof result.answers === 'object' && !Array.isArray(result.answers)
            ? (result.answers as Record<string, unknown>)
            : {};
        const fromDisplay =
          dr.answers && typeof dr.answers === 'object' && !Array.isArray(dr.answers)
            ? (dr.answers as Record<string, unknown>)
            : {};
        return { ...fromDisplay, ...fromParent };
      })();
      return {
        ...result,
        questions: dr.questions?.length ? dr.questions : result.questions,
        answers: mergedAnswers,
      };
    });
  }, [
    normalizeMongoId((result as ExamResult & { _id?: unknown })._id),
    normalizeMongoId(result.examId),
    result.attemptNumber,
    result.correctAnswers,
    result.wrongAnswers,
    result.unattempted,
    result.totalQuestions,
    result.obtainedMarks,
    result.totalMarks,
    result.percentage,
    result.timeTaken,
    result.examTitle,
    result.questions?.length,
  ]);

  const [reviewHydrated, setReviewHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrateFromReview = async () => {
      const examIdStr = normalizeMongoId(result.examId);
      if (!examIdStr) {
        setReviewHydrated(true);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const resultRowId = normalizeMongoId((result as ExamResult & { _id?: unknown })._id);
        const rid =
          resultRowId !== '' ? `?resultId=${encodeURIComponent(resultRowId)}` : '';
        const res = await fetch(`${API_BASE_URL}/api/student/exam-results/${examIdStr}/review${rid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setReviewHydrated(true);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const qs = json?.data?.questions;
        const srv = json?.data?.result as ExamResult | undefined;
        if (!srv || cancelled) {
          if (!cancelled) setReviewHydrated(true);
          return;
        }

        setDisplayResult((prev) => {
          const prevAnswers =
            prev.answers && typeof prev.answers === 'object' && !Array.isArray(prev.answers)
              ? (prev.answers as Record<string, unknown>)
              : {};
          const serverAnswers =
            srv.answers && typeof srv.answers === 'object' && !Array.isArray(srv.answers)
              ? srv.answers
              : {};
          return {
            ...prev,
            ...srv,
            _id: srv._id != null ? String(srv._id) : prev._id,
            examId: String(srv.examId || prev.examId || examIdStr),
            questions:
              Array.isArray(qs) && qs.length > 0
                ? (qs as ExamResult['questions'])
                : prev.questions?.length
                  ? prev.questions
                  : (srv.questions as ExamResult['questions']),
            answers:
              Object.keys(serverAnswers).length > 0
                ? { ...prevAnswers, ...serverAnswers }
                : prev.answers,
          };
        });
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setReviewHydrated(true);
      }
    };

    setReviewHydrated(false);
    void hydrateFromReview();
    return () => {
      cancelled = true;
    };
  }, [normalizeMongoId(result.examId), normalizeMongoId((result as ExamResult & { _id?: unknown })._id), result.attemptNumber]);

  useEffect(() => {
    if (!reviewHydrated) return;
    let cancelled = false;
    const fetchAiReport = async () => {
      setAiLoading(true);
      setAiError('');
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/exam-results/ai-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ result: displayResult, examTitle }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to generate AI report');
        }
        if (!cancelled) {
          setAiAnalysis(payload?.data?.analysis || null);
          setAnalysisMeta((payload?.data?.meta as AnalysisMeta) || null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setAiError(error?.message || 'AI report unavailable');
        }
      } finally {
        if (!cancelled) {
          setAiLoading(false);
        }
      }
    };

    fetchAiReport();
    return () => {
      cancelled = true;
    };
  }, [
    displayResult.examId,
    displayResult.correctAnswers,
    displayResult.wrongAnswers,
    displayResult.unattempted,
    displayResult.obtainedMarks,
    displayResult.percentage,
    displayResult.attemptNumber,
    displayResult.answers,
    displayResult._id,
    examTitle,
    reviewHydrated,
  ]);

  const getGrade = (percentage: number) => {
    if (percentage >= 95) return { grade: 'A+', color: 'text-purple-600', bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100', icon: Crown };
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-gradient-to-r from-green-100 to-emerald-100', icon: Trophy };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-gradient-to-r from-green-100 to-emerald-100', icon: Award };
    if (percentage >= 70) return { grade: 'B+', color: 'text-blue-600', bgColor: 'bg-gradient-to-r from-blue-100 to-cyan-100', icon: Star };
    if (percentage >= 60) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-gradient-to-r from-blue-100 to-cyan-100', icon: Target };
    if (percentage >= 50) return { grade: 'C+', color: 'text-yellow-600', bgColor: 'bg-gradient-to-r from-yellow-100 to-orange-100', icon: TrendingUp };
    if (percentage >= 40) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-gradient-to-r from-yellow-100 to-orange-100', icon: AlertCircle };
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-gradient-to-r from-red-100 to-pink-100', icon: Flame };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };

  const attemptedCount = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const totalQuestionCount = Number(result.totalQuestions || 0)
    || (attemptedCount + (result.unattempted || 0));
  const displayPercentage = totalQuestionCount > 0
    ? (result.correctAnswers / totalQuestionCount) * 100
    : 0;
  const accuracyRate = attemptedCount > 0
    ? (result.correctAnswers / attemptedCount) * 100
    : 0;
  const completionRate = totalQuestionCount > 0
    ? ((result.correctAnswers + result.wrongAnswers) / totalQuestionCount) * 100
    : 0;

  const marksPercentForGrade =
    (result.totalMarks || 0) > 0
      ? ((result.obtainedMarks || 0) / (result.totalMarks || 1)) * 100
      : displayPercentage;
  const grade = getGrade(marksPercentForGrade);
  const GradeIcon = grade.icon;
  const marksPercent =
    (result.totalMarks || 0) > 0
      ? ((result.obtainedMarks || 0) / (result.totalMarks || 1)) * 100
      : displayPercentage;

  const normalizedRiskLevel = String(aiAnalysis?.riskLevel || '').toLowerCase();
  const riskBadgeClass =
    normalizedRiskLevel === 'high'
      ? 'bg-red-100 text-red-800 border-red-200'
      : normalizedRiskLevel === 'medium'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : 'bg-green-100 text-green-800 border-green-200';

  const getPerformanceInsights = () => {
    const insights = [];
    
    if (displayPercentage >= 90) {
      insights.push({
        icon: Crown,
        title: "Outstanding Performance!",
        description: "You've achieved exceptional results. You're among the top performers!",
        color: "text-purple-600",
        bgColor: "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
      });
    }
    
    if (result.correctAnswers / result.totalQuestions >= 0.8) {
      insights.push({
        icon: Zap,
        title: "High Accuracy",
        description: "Your accuracy rate is excellent! Keep up the precision.",
        color: "text-green-600",
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
      });
    }
    
    if (result.timeTaken < result.totalQuestions * 60) {
      insights.push({
        icon: Clock,
        title: "Speed Master",
        description: "You completed the exam efficiently. Great time management!",
        color: "text-blue-600",
        bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
      });
    }
    
    if (result.unattempted === 0) {
      insights.push({
        icon: Target,
        title: "Complete Attempt",
        description: "You attempted all questions. Excellent completion rate!",
        color: "text-indigo-600",
        bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 border-l-4"
      });
    }

    const attemptRate = totalQuestionCount > 0 ? attemptedCount / totalQuestionCount : 0;
    if (attemptRate > 0.9) {
      insights.push({
        icon: CheckCircle,
        title: 'High Attempt Rate',
        description: `You attempted ${(attemptRate * 100).toFixed(0)}% of questions — strong completion discipline.`,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50 border-indigo-200 border-l-4',
      });
    }

    const subjects = Object.entries(result.subjectWiseScore);
    if (subjects.length > 0) {
      const best = subjects.reduce((a, b) => {
        const pa = a[1].total > 0 ? a[1].correct / a[1].total : 0;
        const pb = b[1].total > 0 ? b[1].correct / b[1].total : 0;
        return pb > pa ? b : a;
      });
      const bestPct = best[1].total > 0 ? (best[1].correct / best[1].total) * 100 : 0;
      if (bestPct >= 50) {
        insights.push({
          icon: Crown,
          title: 'Anchor Subject',
          description: `${best[0].charAt(0).toUpperCase() + best[0].slice(1)} is your anchor at ${bestPct.toFixed(0)}% mastery.`,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50 border-teal-200 border-l-4',
        });
      }
    }

    const trend = String(aiAnalysis?.predictions?.trend || '').toLowerCase();
    if (trend === 'improving') {
      insights.push({
        icon: TrendingUp,
        title: 'Trend Improvement',
        description: 'Your marks trend is improving versus recent attempts — momentum is building.',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200 border-l-4',
      });
    }
    
    return insights;
  };

  const getWeakAreas = () => {
    const weakAreas: WeakArea[] = [];
    const subjects = Object.entries(result.subjectWiseScore);
    
    subjects.forEach(([subject, score]) => {
      const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
      if (percentage < 60) {
        weakAreas.push({
          subject: subject.charAt(0).toUpperCase() + subject.slice(1),
          percentage: percentage,
          correct: score.correct,
          total: score.total,
          color: percentage < 40 ? 'text-red-600' : 'text-yellow-600',
          bgColor: percentage < 40 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        });
      }
    });
    
    return weakAreas;
  };

  const insights = getPerformanceInsights();
  const weakAreas = useMemo(() => getWeakAreas(), [result.subjectWiseScore]);
  const [weakSubjectContent, setWeakSubjectContent] = useState<WeakSubjectContentMap | null>(null);
  const [loadingWeakContent, setLoadingWeakContent] = useState(false);

  useEffect(() => {
    if (weakAreas.length === 0) {
      setWeakSubjectContent(null);
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const controller = new AbortController();

    async function fetchWeakContent() {
      setLoadingWeakContent(true);
      try {
        let topicRows: WeakTopicRow[] = Array.isArray(analysisMeta?.weakTopics)
          ? analysisMeta.weakTopics.filter((r) => r?.topic)
          : [];

        if (topicRows.length === 0 && aiAnalysis) {
          const fallback: WeakTopicRow[] = [];
          if (Array.isArray(aiAnalysis.focusAreas)) {
            aiAnalysis.focusAreas.forEach((fa) => {
              const issue = String(fa?.issue || '');
              const match = issue.match(/in\s+(.+?)(?:\s*\(|$)/i);
              const subject = String(fa?.subject || '').toLowerCase().trim();
              if (match?.[1]) {
                fallback.push({ subject, topic: match[1].trim() });
              }
            });
          }
          if (Array.isArray(aiAnalysis.questionInsights)) {
            aiAnalysis.questionInsights
              .filter((q) => q?.status === 'wrong' || q?.status === 'unattempted')
              .forEach((q) => {
                const gap = String(q?.conceptGap || '');
                const topicMatch =
                  gap.match(/[“"]([^”"]+)[”"]/) ||
                  gap.match(/\(\s*[“"]?([^"”)]+)[”"]?\s*,/);
                const subject = String(q?.subject || '').toLowerCase().trim();
                if (topicMatch?.[1]) {
                  fallback.push({ subject, topic: topicMatch[1].trim() });
                }
              });
          }
          topicRows = fallback;
        }

        const subjectsFromTopics = Array.from(
          new Set(topicRows.map((r) => r.subject).filter(Boolean))
        );
        const subjectNames =
          subjectsFromTopics.length > 0
            ? subjectsFromTopics.join(',')
            : weakAreas.map((w) => w.subject.toLowerCase()).join(',');

        const topicRowsParam = topicRows
          .slice(0, 10)
          .map((r) => `${r.subject || ''}|${r.topic}`)
          .join(',');

        const url = topicRowsParam
          ? `${API_BASE_URL}/api/student/weak-subject-content?subjects=${encodeURIComponent(subjectNames)}&topicRows=${encodeURIComponent(topicRowsParam)}`
          : `${API_BASE_URL}/api/student/weak-subject-content?subjects=${encodeURIComponent(subjectNames)}`;

        const res = await fetch(
          url,
          {
            signal: controller.signal,
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json',
            },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (data?.success && data.data && !controller.signal.aborted) {
          setWeakSubjectContent(data.data as WeakSubjectContentMap);
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.error(e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingWeakContent(false);
        }
      }
    }

    void fetchWeakContent();
    return () => controller.abort();
  }, [weakAreas, aiAnalysis, analysisMeta]);

  const advancedExamId = normalizeMongoId(result.examId);

  const analysisQuestions =
    displayResult.questions && displayResult.questions.length > 0
      ? displayResult.questions
      : result.questions && result.questions.length > 0
        ? result.questions
        : [];

  const studentName = getStudentDisplayName();
  const examDateLabel = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const avgTimePerQuestion =
    totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 0;
  const speedRatingLabel =
    result.timeTaken < totalQuestionCount * 60 ? 'Sharp' : avgTimePerQuestion < 90 ? 'Balanced' : 'Rushed';

  const dnaScores = useMemo(() => getDNAScores(result, aiAnalysis), [result, aiAnalysis]);
  const dnaProfileLabel = useMemo(
    () => getDNAProfileLabel(dnaScores, displayPercentage, avgTimePerQuestion),
    [dnaScores, displayPercentage, avgTimePerQuestion]
  );
  const timeQuadrant = useMemo(
    () =>
      getTimeXAccuracyQuadrant(
        analysisQuestions,
        getUserAnswerForQuestion,
        compareAnswers,
        result.timeTaken
      ),
    [analysisQuestions, result.timeTaken, displayResult.answers, result.answers]
  );
  const planTopics = useMemo(() => generatePlanTopics(result, aiAnalysis), [result, aiAnalysis]);

  const activePlanTopic = planTopics[selectedPlanDayIndex] ?? planTopics[0];
  const planQueue = useMemo(
    () => generatePlanQueueItems(activePlanTopic?.title || 'Focus', selectedPlanDayIndex),
    [activePlanTopic?.title, selectedPlanDayIndex]
  );

  const scrollToPlanQueue = useCallback(() => {
    setSelectedPlanDayIndex(0);
    requestAnimationFrame(() => {
      planQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const carelessMistakeCount = useMemo(() => {
    let n = 0;
    analysisQuestions.forEach((q, i) => {
      const ua = getUserAnswerForQuestion(q, i);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      if (!attempted || compareAnswers(q, ua, q.correctAnswer)) return;
      const t = getAnswerTimeSeconds(ua);
      if (t != null && t < 30) n += 1;
    });
    if (n === 0 && result.wrongAnswers > 0) {
      n = Math.max(1, Math.round(result.wrongAnswers * 0.35));
    }
    return n;
  }, [analysisQuestions, result.wrongAnswers, displayResult.answers, result.answers]);

  const mistakeTaxonomy = useMemo(() => {
    const counts = { careless: 0, conceptual: 0, procedural: 0, time: 0, reading: 0 };
    analysisQuestions.forEach((q, i) => {
      const ua = getUserAnswerForQuestion(q, i);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      const correct = compareAnswers(q, ua, q.correctAnswer);
      if (!attempted || correct) return;
      const t = getAnswerTimeSeconds(ua);
      const qi = aiAnalysis?.questionInsights?.find(
        (x) => x.index === i + 1 || x.index === i
      );
      const insight = qi?.insight || qi?.fixStrategy || qi?.conceptGap;
      const err = classifyErrorType(q, ua, t, {
        isCorrect: correct,
        isAttempted: attempted,
        avgTime: avgTimePerQuestion || 60,
        totalExamTime: result.timeTaken,
        aiInsight: insight,
      });
      if (err === 'careless') counts.careless += 1;
      else if (err === 'conceptual') counts.conceptual += 1;
      else if (err === 'time-pressure') counts.time += 1;
      else if (err === 'reading') counts.reading += 1;
      else counts.procedural += 1;
    });
    if (result.wrongAnswers > 0 && counts.careless + counts.conceptual + counts.procedural + counts.time + counts.reading === 0) {
      counts.careless = Math.round(result.wrongAnswers * 0.35);
      counts.conceptual = Math.round(result.wrongAnswers * 0.25);
      counts.procedural = Math.round(result.wrongAnswers * 0.2);
      counts.time = Math.round(result.wrongAnswers * 0.12);
      counts.reading = result.wrongAnswers - counts.careless - counts.conceptual - counts.procedural - counts.time;
    }
    return counts;
  }, [analysisQuestions, result.wrongAnswers, result.timeTaken, avgTimePerQuestion, aiAnalysis, displayResult.answers, result.answers]);

  const marksPerWrong = useMemo(() => {
    const wrong = result.wrongAnswers || 1;
    const lost = Math.max(0, (result.totalMarks || 0) - (result.obtainedMarks || 0));
    return lost / wrong;
  }, [result]);

  const scoreReconciliation = useMemo(() => {
    let marksEarned = 0;
    let negativePenalty = 0;
    let marksNotEarnedOnWrong = 0;
    const wrongN = result.wrongAnswers || 0;
    const net = Math.round(Number(result.obtainedMarks) || 0);

    analysisQuestions.forEach((q, i) => {
      const ua = getUserAnswerForQuestion(q, i);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      const qMarks = Number(q.marks ?? 4) || 4;
      const qNeg = Number(q.negativeMarks ?? 1) || 0;
      if (!attempted) return;
      if (compareAnswers(q, ua, q.correctAnswer)) {
        marksEarned += qMarks;
      } else {
        negativePenalty += qNeg;
        marksNotEarnedOnWrong += qMarks;
      }
    });

    if (analysisQuestions.length === 0 && wrongN > 0) {
      const avgQMarks = (result.totalMarks || 0) / Math.max(totalQuestionCount, 1);
      marksNotEarnedOnWrong = Math.round(wrongN * avgQMarks);
      negativePenalty = Math.max(0, Math.round(net + marksNotEarnedOnWrong - (result.totalMarks || 0) + wrongN * avgQMarks));
      if (negativePenalty <= 0) {
        negativePenalty = Math.round(wrongN * 1);
      }
      marksEarned = net + negativePenalty;
    }

    marksEarned = Math.round(marksEarned);
    negativePenalty = Math.round(negativePenalty);
    marksNotEarnedOnWrong = Math.round(marksNotEarnedOnWrong);
    const totalImpact = marksNotEarnedOnWrong + negativePenalty;
    const costPerWrong =
      wrongN > 0 ? Math.round(totalImpact / wrongN) : Math.round(marksPerWrong);

    return {
      marksEarned,
      negativePenalty,
      net,
      marksNotEarnedOnWrong,
      costPerWrong,
    };
  }, [
    analysisQuestions,
    result.obtainedMarks,
    result.wrongAnswers,
    result.totalMarks,
    totalQuestionCount,
    marksPerWrong,
    displayResult.answers,
    result.answers,
  ]);

  const chapterHeatmap = useMemo(() => {
    const bySubject: Record<string, Array<{ name: string; pct: number }>> = {
      physics: [],
      maths: [],
      chemistry: [],
    };
    const topicAcc = new Map<string, { correct: number; total: number; subject: string }>();

    analysisQuestions.forEach((q, i) => {
      const ua = getUserAnswerForQuestion(q, i);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      const subj = (q.subject || 'physics').toLowerCase();
      const qi = aiAnalysis?.questionInsights?.find((x) => x.index === i + 1 || x.index === i);
      const gap = qi?.conceptGap || '';
      const topicMatch =
        gap.match(/[“"]([^”"]+)[”"]/) || gap.match(/\(\s*[“"]?([^"`)]+)/);
      const topic = topicMatch?.[1]?.trim() || subj;
      const key = `${subj}::${topic}`;
      const cur = topicAcc.get(key) || { correct: 0, total: 0, subject: subj };
      cur.total += 1;
      if (attempted && compareAnswers(q, ua, q.correctAnswer)) cur.correct += 1;
      topicAcc.set(key, cur);
    });

    topicAcc.forEach((v, key) => {
      const [, topic] = key.split('::');
      const pct = v.total > 0 ? (v.correct / v.total) * 100 : 0;
      const subj = v.subject in bySubject ? v.subject : 'physics';
      bySubject[subj].push({ name: topic, pct });
    });

    Object.keys(bySubject).forEach((subj) => {
      if (bySubject[subj].length === 0) {
        const score = result.subjectWiseScore[subj as keyof typeof result.subjectWiseScore];
        if (score && score.total > 0) {
          const pct = (score.correct / score.total) * 100;
          bySubject[subj].push({
            name: subj.charAt(0).toUpperCase() + subj.slice(1),
            pct,
          });
        }
      }
      bySubject[subj].sort((a, b) => a.pct - b.pct);
    });

    return bySubject;
  }, [analysisQuestions, aiAnalysis, result.subjectWiseScore, displayResult.answers, result.answers]);

  const planVideoCards = useMemo(() => {
    const fromChapters: Array<{ subj: string; bg: string; title: string; min: number; mastery: number }> = [];
    (['physics', 'maths', 'chemistry'] as const).forEach((subj) => {
      (chapterHeatmap[subj] || []).forEach((ch) => {
        fromChapters.push({
          subj: subj.toUpperCase(),
          bg: subj === 'physics' ? 'bg-orange-50' : subj === 'maths' ? 'bg-purple-50' : 'bg-yellow-50',
          title: ch.name,
          min: 8 + Math.min(4, Math.floor(ch.pct / 25)),
          mastery: ch.pct,
        });
      });
    });
    fromChapters.sort((a, b) => a.mastery - b.mastery);
    if (fromChapters.length >= 3) return fromChapters.slice(0, 3);
    const subjScore = result.subjectWiseScore;
    return (['physics', 'maths', 'chemistry'] as const).map((subj) => {
      const sc = subjScore[subj];
      const pct = sc && sc.total > 0 ? (sc.correct / sc.total) * 100 : 0;
      return {
        subj: subj.toUpperCase(),
        bg: subj === 'physics' ? 'bg-orange-50' : subj === 'maths' ? 'bg-purple-50' : 'bg-yellow-50',
        title: `${subj.charAt(0).toUpperCase() + subj.slice(1)} fundamentals`,
        min: 10,
        mastery: pct,
      };
    });
  }, [chapterHeatmap, result.subjectWiseScore]);

  const questionRowStatuses = useMemo(() => {
    const avgT = avgTimePerQuestion || 60;
    return analysisQuestions.map((q, i) => {
      const ua = getUserAnswerForQuestion(q, i);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      const correct = attempted && compareAnswers(q, ua, q.correctAnswer);
      const analyticsRow = getAnalyticsForQuestion(q, i);
      const timeSeconds = getQuestionTimeForIndex(q, i, ua);
      const difficulty = resolveQuestionDifficulty(q);
      const isWrongQuick = attempted && !correct && timeSeconds != null && timeSeconds < 30;
      const isHardWrong = attempted && !correct && difficulty === 'hard';
      const isTimePressure =
          attempted &&
          !correct &&
        isTimePressureWrong(timeSeconds, avgT, difficulty, analyticsRow?.timeBucket);
      return { attempted, correct, isWrongQuick, isHardWrong, isTimePressure };
    });
  }, [
    analysisQuestions,
    avgTimePerQuestion,
    displayResult.answers,
    result.answers,
    getAnalyticsForQuestion,
    getQuestionTimeForIndex,
  ]);

  const questionFilterCounts = useMemo(() => {
    const counts = {
      all: analysisQuestions.length,
      correct: 0,
      wrong: 0,
      skipped: 0,
      wrongQuick: 0,
      hardWrong: 0,
      timePressure: 0,
    };
    questionRowStatuses.forEach((s) => {
      if (s.correct) counts.correct += 1;
      if (s.attempted && !s.correct) counts.wrong += 1;
      if (!s.attempted) counts.skipped += 1;
      if (s.isWrongQuick) counts.wrongQuick += 1;
      if (s.isHardWrong) counts.hardWrong += 1;
      if (s.isTimePressure) counts.timePressure += 1;
    });
    return counts;
  }, [analysisQuestions.length, questionRowStatuses]);

  const filteredQuestionIndices = useMemo(
    () =>
      analysisQuestions
        .map((_, i) => i)
        .filter((i) => matchesQuestionFilter(questionFilter, questionRowStatuses[i])),
    [analysisQuestions, questionFilter, questionRowStatuses]
  );

  const navigableIndices = useMemo(
    () =>
      questionFilter === 'all'
        ? analysisQuestions.map((_, i) => i)
        : filteredQuestionIndices,
    [questionFilter, filteredQuestionIndices, analysisQuestions.length]
  );

  const filteredPosition =
    navigableIndices.indexOf(mobileQuestionIndex) >= 0
      ? navigableIndices.indexOf(mobileQuestionIndex) + 1
      : navigableIndices.length > 0
        ? 1
        : 0;

  const tabBtnClass = (tab: string) =>
    `px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px ${
      activeTab === tab
        ? 'text-[#7C3AED] border-[#7C3AED]'
        : 'text-gray-500 border-transparent hover:text-gray-700'
    }`;

  const goToPrev = () => {
    if (!navigableIndices.length) return;
    const pos = navigableIndices.indexOf(mobileQuestionIndex);
    if (pos <= 0) return;
    setAnimDirection('down');
    setMobileQuestionIndex(navigableIndices[pos - 1]);
  };

  const goToNext = () => {
    if (!navigableIndices.length) return;
    const pos = navigableIndices.indexOf(mobileQuestionIndex);
    if (pos < 0 || pos >= navigableIndices.length - 1) return;
    setAnimDirection('up');
    setMobileQuestionIndex(navigableIndices[pos + 1]);
  };

  useEffect(() => {
    const n = analysisQuestions.length;
    if (n === 0) return;
    setMobileQuestionIndex((idx) => Math.min(idx, n - 1));
  }, [analysisQuestions.length]);

  useEffect(() => {
    if (!analysisQuestions.length) return;
    setMobileQuestionIndex((idx) => {
      if (!navigableIndices.length) return 0;
      return navigableIndices.includes(idx) ? idx : navigableIndices[0];
    });
  }, [questionFilter, navigableIndices.join(',')]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.deltaY > 10) {
      goToNext();
    } else if (e.deltaY < -10) {
      goToPrev();
    }
  };

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartY === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY;
    if (delta < -30) {
      goToNext();
    } else if (delta > 30) {
      goToPrev();
    }
    setTouchStartY(null);
  };

  const questionDistributionBars = (
    <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center text-lg sm:text-xl">
          <PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#7C3AED]" />
          Question Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {[
          { label: 'Correct Answers', count: result.correctAnswers, color: 'bg-emerald-500', bar: 'bg-emerald-500' },
          { label: 'Wrong Answers', count: result.wrongAnswers, color: 'bg-red-500', bar: 'bg-red-500' },
          { label: 'Unattempted', count: result.unattempted, color: 'bg-gray-400', bar: 'bg-gray-400' },
        ].map((row) => {
          const pct = totalQuestionCount > 0 ? (row.count / totalQuestionCount) * 100 : 0;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
              <span className="text-xs sm:text-sm font-medium text-gray-700 w-32 shrink-0">{row.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
                <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 w-8 text-right">{row.count}</span>
              <span className="text-xs sm:text-sm text-gray-500 w-12 text-right">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  const performanceAnalyticsSection = (
    <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:p-4 lg:p-6">
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#7C3AED]" />
                    Performance DNA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceDNARadar scores={dnaScores} />
                  <Badge className="mt-4 bg-amber-100 text-amber-800 border-amber-200">{dnaProfileLabel}</Badge>
                  <p className="text-xs sm:text-sm text-gray-600 mt-3">
                    Your DNA says: you knew more than your marks show — fix pacing and careless slips to unlock hidden potential.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#7C3AED]" />
                    Time Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <Clock className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#7C3AED] mx-auto mb-2" />
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(result.timeTaken)}</p>
                    <p className="text-xs sm:text-sm text-gray-600">Total Time Taken</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl border bg-gray-50">
                      <p className="text-base sm:text-lg font-bold">{formatTime(avgTimePerQuestion)}</p>
                      <p className="text-xs text-gray-500">Avg per Question</p>
                    </div>
                    <div className="p-3 rounded-xl border bg-gray-50">
                      <p className="text-base sm:text-lg font-bold">{speedRatingLabel}</p>
                      <p className="text-xs text-gray-500">Speed Rating</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time × Accuracy Quadrant</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center text-xs sm:text-sm">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="font-bold text-red-700">{timeQuadrant.fastWrong}</p>
                      <p className="text-xs text-gray-600">Fast + Wrong · Careless</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="font-bold text-emerald-700">{timeQuadrant.fastRight}</p>
                      <p className="text-xs text-gray-600">Fast + Right · Sharp</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <p className="font-bold text-orange-700">{timeQuadrant.slowWrong}</p>
                      <p className="text-xs text-gray-600">Slow + Wrong · Stuck</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="font-bold text-blue-700">{timeQuadrant.slowRight}</p>
                      <p className="text-xs text-gray-600">Slow + Right · Effortful</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {questionDistributionBars}
    </>
  );

  const subjectWisePerformanceCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
      {Object.entries(result.subjectWiseScore).map(([subject, score]) => {
        const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
        const subjectColors = {
          maths: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-500' },
          physics: { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-600', icon: 'text-green-500' },
          chemistry: { bg: 'from-purple-50 to-pink-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-500' },
          biology: { bg: 'from-emerald-50 to-lime-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'text-emerald-500' },
        };

        const colors = subjectColors[subject as keyof typeof subjectColors] || {
          bg: 'from-gray-50 to-slate-50',
          border: 'border-gray-200',
          text: 'text-gray-600',
          icon: 'text-gray-500',
        };

        return (
          <Card key={subject} className={`border-0 shadow-xl bg-gradient-to-br ${colors.bg} ${colors.border}`}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${colors.bg} ${colors.border} border-2`}
                >
                  {subject === 'maths' && <Calculator className={`w-10 h-10 ${colors.icon}`} />}
                  {subject === 'physics' && <Atom className={`w-10 h-10 ${colors.icon}`} />}
                  {subject === 'chemistry' && <FlaskConical className={`w-10 h-10 ${colors.icon}`} />}
                  {subject !== 'maths' && subject !== 'physics' && subject !== 'chemistry' && (
                    <BookOpen className={`w-10 h-10 ${colors.icon}`} />
                  )}
          </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize mb-2">{subject}</h3>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-gray-900">
                  {percentage.toFixed(1)}%
                </div>
                <div className="text-base sm:text-lg text-gray-600 mb-4">
                  {score.correct}/{score.total} correct
                </div>
                <div className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">{score.marks} marks</div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Accuracy</span>
                    <span className={`font-semibold ${colors.text}`}>{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2 bg-gray-200" />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200/80 text-left text-xs">
                  {percentage >= 70 ? (
                    <p className="font-semibold text-teal-700">✓ STRONGEST · ANCHOR</p>
                  ) : (
                    <>
                      <p className="font-bold text-red-600 uppercase tracking-wide">Weak Chapters</p>
                      <p className="text-red-600 mt-1">
                        {(chapterHeatmap[subject] || [])
                          .filter((c) => c.pct < 50)
                          .map((c) => c.name)
                          .join(', ') || 'Review chapter-wise mocks'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const getQuestionInsightByIndex = (questionIndex: number) =>
    aiAnalysis?.questionInsights?.find(
      (x) => Number(x.index) === questionIndex + 1 || Number(x.index) === questionIndex
    );

  const extractExplanationHintFromFix = (fixStrategy?: string) => {
    const match = String(fixStrategy || '').match(/Review explanation hint:\s*"([^"]*)"/i);
    return match?.[1]?.trim() || '';
  };

  const getQuestionExplanationText = (questionIndex: number) => {
    const item = getQuestionInsightByIndex(questionIndex);
    const question = analysisQuestions[questionIndex];
    const fromGemini = String(item?.geminiExplanation || '').trim();
    if (fromGemini) return fromGemini;
    const fromQuestion = String(question?.explanation || '').trim();
    if (fromQuestion) return fromQuestion;
    return extractExplanationHintFromFix(item?.fixStrategy);
  };

  const renderQuestionAnalysisSection = (questionIndex: number) => {
    const item = getQuestionInsightByIndex(questionIndex);
    const explanationText = getQuestionExplanationText(questionIndex);
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Question Analysis</h4>
        {item ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-900">Q{questionIndex + 1}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase text-[10px]">
                  {String(item.status || 'unattempted')}
                </Badge>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {String(item.priority || 'medium')}
                </Badge>
              </div>
            </div>
            {aiLoading && !explanationText ? (
              <div className="mt-2 space-y-2 animate-pulse" aria-busy="true" aria-label="Loading explanation">
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-[92%]" />
                <div className="h-3 bg-slate-200 rounded w-[78%]" />
              </div>
            ) : explanationText ? (
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mt-2">
                {explanationText}
              </p>
            ) : (
              <p className="text-gray-500 text-xs sm:text-sm mt-2">
                No explanation available for this question.
              </p>
            )}
          </>
        ) : aiLoading ? (
          <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading question analysis">
            <div className="h-3 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-full" />
          </div>
        ) : (
          <p className="text-gray-500 text-xs sm:text-sm">
            Open this question after the report finishes loading.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-4 sm:px-6 py-2 bg-white text-gray-800 hover:text-gray-900 hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 shadow-sm font-semibold"
        >
          <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-0 overflow-x-auto">
        <div className="flex gap-1 sm:gap-4 min-w-max">
          <button type="button" onClick={() => setActiveTab('ai')} className={tabBtnClass('ai')}>AI Report</button>
          <button type="button" onClick={() => setActiveTab('questions')} className={tabBtnClass('questions')}>Questions</button>
          <button type="button" onClick={() => setActiveTab('advanced')} className={tabBtnClass('advanced')}>Advanced</button>
          <button type="button" onClick={() => setActiveTab('insights')} className={tabBtnClass('insights')}>Insights</button>
          <button type="button" onClick={() => setActiveTab('plan')} className={`${tabBtnClass('plan')} flex items-center gap-2`}>
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
            Plan
          </button>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tab Content */}

        {/* AI Report Tab */}
        {activeTab === 'ai' && (
            <AiReportTab
              result={result}
              examTitle={examTitle}
              studentName={studentName}
              examDateLabel={examDateLabel}
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              aiError={aiError}
              animatedMarks={animatedValues.obtainedMarks}
              animatedCorrect={animatedValues.correctAnswers}
              animatedWrong={animatedValues.wrongAnswers}
              animatedSkipped={animatedValues.unattempted}
              gradeLetter={grade.grade}
              marksPercent={marksPercent}
              accuracyRate={accuracyRate}
              completionRate={completionRate}
              attemptedCount={attemptedCount}
              totalQuestionCount={totalQuestionCount}
              mistakeTaxonomy={mistakeTaxonomy}
              wrongQuickCount={questionFilterCounts.wrongQuick}
              marksPerWrong={marksPerWrong}
              scoreReconciliation={scoreReconciliation}
            />
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <motion.div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all' as const, label: `All · ${questionFilterCounts.all}` },
                { id: 'correct' as const, label: `Correct · ${questionFilterCounts.correct}` },
                { id: 'wrong' as const, label: `Wrong · ${questionFilterCounts.wrong}` },
                { id: 'skipped' as const, label: `Skipped · ${questionFilterCounts.skipped}` },
                { id: 'wrong-quick' as const, label: `⚡ Wrong-quick · ${questionFilterCounts.wrongQuick}` },
                { id: 'hard-wrong' as const, label: `Hard + Wrong · ${questionFilterCounts.hardWrong}` },
                { id: 'time-pressure' as const, label: `⏱ Time-pressure · ${questionFilterCounts.timePressure}` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setQuestionFilter(pill.id);
                    setShowAllQuestionsList(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    questionFilter === pill.id
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#7C3AED]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            {analysisQuestions.length > 0 && (
              <div className="space-y-2 lg:hidden">
                {(showAllQuestionsList ? filteredQuestionIndices : filteredQuestionIndices.slice(0, 5)).map((index) => {
                  const question = analysisQuestions[index];
                  const userAnswer = getUserAnswerForQuestion(question, index);
                  const isCorrect = compareAnswers(question, userAnswer, question.correctAnswer);
                  const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                  const t = getQuestionTimeForIndex(question, index, userAnswer);
                  const qi = aiAnalysis?.questionInsights?.find((x) => x.index === index + 1 || x.index === index);
                  const err = classifyErrorType(question, userAnswer, t, {
                    isCorrect,
                    isAttempted,
                    avgTime: avgTimePerQuestion || 60,
                    totalExamTime: result.timeTaken,
                    aiInsight: qi?.insight || qi?.fixStrategy,
                  });
                  const border = isCorrect ? 'border-l-emerald-500' : isAttempted ? 'border-l-red-500' : 'border-l-gray-400';
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setExpandedQuestionIndex(expandedQuestionIndex === index ? null : index);
                        setMobileQuestionIndex(index);
                      }}
                      className={`w-full text-left rounded-xl border border-gray-100 bg-white shadow-sm p-3 border-l-4 ${border}`}
                    >
                      <div className="flex gap-2 items-start">
                        <span className="font-bold text-xs sm:text-sm">Q{index + 1}</span>
                        {isCorrect ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" /> : isAttempted ? <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" /> : <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />}
                        <span className="text-xs sm:text-sm text-gray-800 line-clamp-2 flex-1">{normalizeExamText(question.questionText, question.subject)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{question.subject}</Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase">{getQuestionDifficulty(question)}</Badge>
                        {err === 'careless' && <Badge className="text-[10px] bg-amber-100 text-amber-800">⚡ CARELESS{t != null ? ` · ${t}s` : ''}</Badge>}
                        {err === 'conceptual' && <Badge className="text-[10px] bg-purple-100 text-purple-800">💎 CONCEPTUAL</Badge>}
                        {err === 'time-pressure' && <Badge className="text-[10px] bg-blue-100 text-blue-800">⏱ TIME-PRESSURE</Badge>}
                        {err === 'reading' && <Badge className="text-[10px] bg-indigo-100 text-indigo-800">👁 READING</Badge>}
                      </div>
                    </button>
                  );
                })}
                {filteredQuestionIndices.length > 5 && !showAllQuestionsList && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowAllQuestionsList(true)}>
                    Show all {filteredQuestionIndices.length} questions
                  </Button>
                )}
              </div>
            )}
              {analysisQuestions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:p-4 lg:p-6">
                
                {/* Question Navigation Sidebar - Modern Grid Layout */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-24">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                        Questions
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        {questionFilter === 'all'
                          ? `${analysisQuestions.length} questions`
                          : `${navigableIndices.length} of ${analysisQuestions.length} shown`}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Question Numbers Grid - 5 columns, 5-6 rows */}
                      <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl p-4 border border-gray-200">
                        {navigableIndices.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-6">
                            No questions match this filter.
                          </p>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          {navigableIndices.map((index) => {
                            const question = analysisQuestions[index];
                            const userAnswer = getUserAnswerForQuestion(question, index);
                            const isCorrect = compareAnswers(question, userAnswer, question.correctAnswer);
                            const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                            const isCurrent = index === mobileQuestionIndex;
                            
                            return (
                              <button
                                key={index}
                                onClick={() => setMobileQuestionIndex(index)}
                                className={`
                                  group relative
                                  w-11 h-11 rounded-xl font-bold text-xs sm:text-sm
                                  transition-all duration-300 ease-out
                                  flex items-center justify-center
                                  border-2
                                  ${
                                    isCurrent
                                      ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-purple-400 shadow-xl shadow-purple-500/50 scale-110 z-10 ring-2 ring-purple-300'
                                      : isCorrect
                                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-400/30 hover:scale-105'
                                      : isAttempted && !isCorrect
                                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400 shadow-lg shadow-red-400/30 hover:scale-105'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md'
                                  }
                                `}
                                title={`Question ${index + 1}${isCorrect ? ' ✓ Correct' : isAttempted ? ' ✗ Incorrect' : ' ○ Not attempted'}`}
                              >
                                <span className="relative z-10">{index + 1}</span>
                                {isCorrect && (
                                  <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-white bg-emerald-600 rounded-full" />
                                )}
                                {isAttempted && !isCorrect && (
                                  <XCircle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-white bg-red-600 rounded-full" />
                                )}
                                {isCurrent && (
                                  <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        )}
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-3">Status Legend</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-2 border-purple-400 ring-2 ring-purple-300"></div>
                            <span className="text-xs text-gray-600">Current</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-emerald-400 relative">
                              <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 text-white" />
                            </div>
                            <span className="text-xs text-gray-600">Correct</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-lg bg-gradient-to-br from-red-500 to-red-600 border-2 border-red-400 relative">
                              <XCircle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 text-white" />
                            </div>
                            <span className="text-xs text-gray-600">Incorrect</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-lg bg-white border-2 border-gray-300"></div>
                            <span className="text-xs text-gray-600">Not Attempted</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Question Area */}
                <div className="lg:col-span-3">
                {/* Question Container */}
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    {analysisQuestions.length > 0 && navigableIndices.length === 0 && (
                      <div className="py-16 text-center text-gray-500">
                        <p className="text-sm font-medium">No questions match this filter.</p>
                        <p className="text-xs mt-1">Try another category above.</p>
                      </div>
                    )}
                    {analysisQuestions.length > 0 && navigableIndices.length > 0 && (
                      <>
                        {/* Question Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="capitalize">
                              {analysisQuestions[mobileQuestionIndex]?.subject || 'Unknown'}
                            </Badge>
                            <Badge variant="secondary">
                              {analysisQuestions[mobileQuestionIndex]?.marks || 0} marks
                            </Badge>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="mb-8">
                          <div className="flex items-start space-x-3 mb-4">
                            <span className="text-base sm:text-lg font-semibold text-gray-900">
                              Q{mobileQuestionIndex + 1}.
                            </span>
                            <div className="flex-1">
                              {analysisQuestions[mobileQuestionIndex]?.questionText && (
                                <p className="text-base sm:text-lg text-gray-900 mb-4">
                                  {normalizeExamText(
                                    analysisQuestions[mobileQuestionIndex].questionText,
                                    analysisQuestions[mobileQuestionIndex]?.subject
                                  )}
                                </p>
                              )}
                              
                              {analysisQuestions[mobileQuestionIndex]?.questionImage && (
                                <div className="mb-4">
                                  <img 
                                    src={analysisQuestions[mobileQuestionIndex].questionImage.startsWith('http') 
                                      ? analysisQuestions[mobileQuestionIndex].questionImage 
                                      : `${API_BASE_URL}${analysisQuestions[mobileQuestionIndex].questionImage}`}
                                    alt="Question" 
                                    className="max-w-full h-auto rounded-lg border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Answer Options */}
                          {analysisQuestions[mobileQuestionIndex]?.questionType === 'mcq' && analysisQuestions[mobileQuestionIndex]?.options && (
                            <div className="space-y-3">
                              {analysisQuestions[mobileQuestionIndex].options.map((option: any, index: number) => {
                                const activeQuestion = analysisQuestions[mobileQuestionIndex];
                                const optionText = getOptionText(option, activeQuestion.subject);
                                const userAnswer = getUserAnswerForQuestion(activeQuestion, mobileQuestionIndex);
                                const userAnswerTexts = resolveAnswerTexts(activeQuestion, userAnswer);
                                const correctAnswerTexts = resolveAnswerTexts(activeQuestion, activeQuestion.correctAnswer);
                                const isUser = userAnswerTexts.includes(optionText);
                                const isRight = correctAnswerTexts.includes(optionText);
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${
                                      isRight 
                                        ? 'border-green-400 bg-green-50' 
                                        : isUser && !isRight 
                                        ? 'border-red-400 bg-red-50' 
                                        : 'border-gray-200 bg-gray-50'
                                    }`}
                                  >
                                    <span className="text-xs sm:text-sm font-medium text-gray-600 w-6">{String.fromCharCode(65 + index)}.</span>
                                    <span className={`flex-1 ${
                                      isRight ? 'text-green-800 font-medium' : isUser && !isRight ? 'text-red-800 font-medium' : 'text-gray-700'
                                    }`}>
                                      {optionText}
                                    </span>
                                    {isRight && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                                    {isUser && !isRight && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Answer Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                              <div className="text-xs font-semibold text-purple-800 mb-2">Your Answer</div>
                              <div className="text-xs sm:text-sm text-purple-900">
                                {(() => {
                                  const activeQuestion = analysisQuestions[mobileQuestionIndex];
                                  const userAnswer = getUserAnswerForQuestion(activeQuestion, mobileQuestionIndex);
                                  const userAnswerTexts = resolveAnswerTexts(activeQuestion, userAnswer);
                                  const isAttempted = userAnswerTexts.length > 0;
                                  return isAttempted 
                                    ? userAnswerTexts.join(', ')
                                    : 'Not attempted';
                                })()}
                              </div>
                            </div>
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                              <div className="text-xs font-semibold text-green-800 mb-2">Correct Answer</div>
                              <div className="text-xs sm:text-sm text-green-900">
                                {(() => {
                                  const activeQuestion = analysisQuestions[mobileQuestionIndex];
                                  const correctAnswerTexts = resolveAnswerTexts(activeQuestion, activeQuestion.correctAnswer);
                                  return correctAnswerTexts.length > 0 ? correctAnswerTexts.join(', ') : 'N/A';
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Full Solution */}
                          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div className="text-xs font-semibold text-blue-800 mb-2">Solution</div>
                            <div className="text-xs sm:text-sm text-blue-900 whitespace-pre-wrap">
                              {normalizeExamText(
                                analysisQuestions[mobileQuestionIndex]?.explanation,
                                analysisQuestions[mobileQuestionIndex]?.subject
                              ) || 'Solution not provided for this question.'}
                            </div>
                          </div>

                          {renderQuestionAnalysisSection(mobileQuestionIndex)}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-6 pt-6 border-t">
                          <Button
                            variant="outline"
                            onClick={goToPrev}
                            disabled={
                              navigableIndices.length === 0 ||
                              navigableIndices.indexOf(mobileQuestionIndex) <= 0
                            }
                          >
                            Previous
                          </Button>
                          <span className="text-xs sm:text-sm text-gray-600">
                            {questionFilter === 'all'
                              ? `Question ${mobileQuestionIndex + 1} of ${analysisQuestions.length}`
                              : `Question ${filteredPosition} of ${navigableIndices.length} (Q${mobileQuestionIndex + 1})`}
                          </span>
                          <Button
                            variant="outline"
                            onClick={goToNext}
                            disabled={
                              navigableIndices.length === 0 ||
                              navigableIndices.indexOf(mobileQuestionIndex) >=
                                navigableIndices.length - 1
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                </div>
                </div>
              ) : (
                <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-slate-50">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Eye className="w-12 h-12 text-gray-500" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-3">No Question Details Available</h3>
                    <p className="text-gray-500 text-base sm:text-lg">Question details are not available for this exam result.</p>
                  </CardContent>
                </Card>
              )}
          </motion.div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Mistake Taxonomy</h2>
                <p className="text-xs sm:text-sm text-gray-500">how the {result.wrongAnswers} wrong answers break down</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Badge className={riskBadgeClass}>Risk: {(aiAnalysis?.riskLevel || 'medium').toString()}</Badge>
                <Badge variant="outline" className="capitalize">Trend: {String(aiAnalysis?.predictions?.trend || 'stable')}</Badge>
                <span className="text-xs sm:text-sm font-bold text-red-600">{Math.max(0, (result.totalMarks || 0) - (result.obtainedMarks || 0))} MARKS LOST</span>
              </div>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
              {[
                { c: mistakeTaxonomy.careless, color: 'bg-red-500' },
                { c: mistakeTaxonomy.conceptual, color: 'bg-orange-500' },
                { c: mistakeTaxonomy.procedural, color: 'bg-yellow-500' },
                { c: mistakeTaxonomy.time, color: 'bg-purple-500' },
                { c: mistakeTaxonomy.reading, color: 'bg-blue-500' },
              ].map((seg, i) => {
                const total = mistakeTaxonomy.careless + mistakeTaxonomy.conceptual + mistakeTaxonomy.procedural + mistakeTaxonomy.time + mistakeTaxonomy.reading || 1;
                return <div key={i} className={seg.color} style={{ width: `${(seg.c / total) * 100}%` }} />;
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Careless', count: mistakeTaxonomy.careless, icon: Zap },
                { label: 'Conceptual', count: mistakeTaxonomy.conceptual, icon: Brain },
                { label: 'Procedural', count: mistakeTaxonomy.procedural, icon: Target },
                { label: 'Time', count: mistakeTaxonomy.time, icon: Timer },
                { label: 'Reading', count: mistakeTaxonomy.reading, icon: Eye },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.label} className="rounded-xl border shadow-sm p-3 text-center">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-xl sm:text-2xl font-bold">{m.count}</p>
                    <p className="text-xs text-gray-600">{m.label}</p>
                    <p className="text-xs text-red-600 font-semibold mt-1">{Math.round(m.count * marksPerWrong)} lost</p>
                  </Card>
                );
              })}
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-900">
              Pattern detected — Careless errors have appeared in consecutive mocks. Slow-mode drills recommended daily.
            </div>
            <AdvancedPerformanceDashboard examId={advancedExamId} />
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Subject-wise performance</h3>
              {subjectWisePerformanceCards}
            </div>
            {performanceAnalyticsSection}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:p-4 lg:p-6">
              
              {/* Performance Insights */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 text-green-600" />
                    Performance Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.length > 0 ? insights.map((insight, index) => {
                      const Icon = insight.icon;
                      return (
                        <div key={index} className={`p-4 rounded-xl border ${insight.bgColor}`}>
                          <div className="flex items-start space-x-3">
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${insight.color} mt-0.5`} />
                            <div>
                              <h4 className={`font-semibold ${insight.color}`}>{insight.title}</h4>
                              <p className="text-gray-700 text-xs sm:text-sm mt-1">{insight.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-4 sm:py-6 lg:py-8 text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Complete more exams to unlock insights!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weak Areas */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 text-red-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weakAreas.length > 0 ? weakAreas.map((area, index) => (
                      <div key={index} className={`p-4 rounded-xl border ${area.bgColor}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{area.subject}</h4>
                          <span className={`font-bold ${area.color}`}>{area.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-2">
                          {area.correct}/{area.total} questions correct
                        </div>
                        <Progress value={area.percentage} className="h-2 bg-gray-200" />
                      </div>
                    )) : (
                      <div className="text-center py-4 sm:py-6 lg:py-8 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Excellent! No weak areas identified.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                Pattern Alerts · what&apos;s repeating across attempts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '⚡', title: 'Careless errors · 3 attempts in a row', desc: `${mistakeTaxonomy.careless} this time — fast wrong answers climbing.`, fix: '10 min slow-mode drill daily' },
                  { icon: '🧠', title: 'Weak chapter · red zone', desc: (aiAnalysis?.focusAreas?.[0]?.issue || 'Stuck below target accuracy.').slice(0, 80), fix: '8-min concept video + 10 Qs' },
                  { icon: '📉', title: 'Confidence trend declining', desc: `Trend: ${String(aiAnalysis?.predictions?.trend || 'stable')}.`, fix: 'Start mocks with your anchor subject' },
                  { icon: '⏱', title: 'Stamina drops in last 25%', desc: 'Accuracy often falls when time pressure peaks.', fix: 'Practice longer test stamina' },
                ].map((alert, i) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="font-bold text-gray-900">{alert.icon} {alert.title}</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-2">{alert.desc}</p>
                    <p className="text-xs sm:text-sm font-medium text-[#7C3AED] mt-2">→ Fix: {alert.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'plan' && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-3 sm:p-4 lg:p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">YOUR TOPIC PLAN</h2>
                <p className="text-white/80 text-xs sm:text-sm mt-1">Personalised from your weak areas</p>
                <p className="text-white/70 text-xs mt-2">7 focus topics · 70 questions · 7 quizzes</p>
              </div>
              <Button type="button" className="bg-white text-purple-700 hover:bg-white/90" onClick={scrollToPlanQueue}>
                Start {planTopics[0]?.title || 'first topic'} →
              </Button>
            </motion.div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white font-bold flex items-center justify-center shrink-0">V</div>
              <div>
                <p className="font-semibold text-gray-900">Why this plan, in one minute</p>
                <p className="text-xs sm:text-sm text-gray-700 mt-2">
                  {studentName}, this week targets your focus areas. {(aiAnalysis?.actionPlan?.thisWeek || [])[0] || 'Short daily drills on weak chapters.'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {planTopics.map((topic, topicIndex) => {
                  const isSelected = selectedPlanDayIndex === topicIndex;
                  return (
                    <button
                      key={topic.topicNum}
                      type="button"
                      onClick={() => {
                        setSelectedPlanDayIndex(topicIndex);
                        requestAnimationFrame(() => {
                          planQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                      }}
                      className={`rounded-xl p-4 min-w-[160px] max-w-[220px] border text-left transition-shadow ${isSelected ? 'bg-white border-[#7C3AED] shadow-md ring-2 ring-[#7C3AED]/30' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[#7C3AED]">ACTIVE</span>
                      )}
                      <p className={`font-bold mt-1 line-clamp-2 ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                        {topic.title}
                      </p>
                      <p className="text-xs mt-1 text-gray-600 line-clamp-1">{topic.subtitle}</p>
                      <p className="text-xs mt-2 font-medium">{topic.duration}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div ref={planQueueRef} className="scroll-mt-24">
            <Card className="rounded-2xl shadow-sm border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="line-clamp-2">{activePlanTopic?.title || 'Focus topic'}</CardTitle>
                <Badge>Focus topic</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs sm:text-sm text-gray-600">{activePlanTopic?.subtitle || 'Practice'} · {activePlanTopic?.duration || '25 min'}</p>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">WARM-UP · {planQueue.warmup.length} EASY Qs</p>
                  <div className="flex flex-wrap gap-2">
                    {planQueue.warmup.map((item, i) => (
                      <div key={item.id} className="rounded-lg border bg-white shadow-sm px-3 py-2 text-xs">
                        <span className="text-[#7C3AED] font-semibold">Q{i + 1} · {item.minutes}m</span> {item.title}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">CORE · {planQueue.core.length} Qs</p>
                  <div className="flex flex-wrap gap-2">
                    {planQueue.core.map((item, i) => (
                      <div key={item.id} className="rounded-lg border bg-purple-50/50 shadow-sm px-3 py-2 text-xs">
                        <span className="text-[#7C3AED] font-semibold">Q{i + 1} · {item.minutes}m</span> {item.title}
                      </div>
                    ))}
                  </div>
                </div>
                {planQueue.stretch.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">STRETCH · optional</p>
                    <div className="flex flex-wrap gap-2">
                      {planQueue.stretch.map((item, i) => (
                        <div key={item.id} className="rounded-lg border border-dashed bg-gray-50 px-3 py-2 text-xs">
                          <span className="text-gray-600 font-semibold">+{i + 1} · {item.minutes}m</span> {item.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base sm:text-lg">Video Queue · 30 minutes total</h3>
                <span className="text-xs text-gray-500">Auto-ordered by weakness</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {planVideoCards.map((v, i) => (
                  <div key={`${v.subj}-${v.title}-${i}`} className={`rounded-xl p-4 ${v.bg} border relative min-h-[140px]`}>
                    <p className="text-[10px] font-bold text-gray-500">{v.subj} · {v.min} MIN</p>
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-400 mx-auto my-4" />
                    <p className="text-xs sm:text-sm font-semibold text-center">{v.title}</p>
                    <p className="text-xs text-center text-gray-600 mt-2">Your mastery: {Math.round(v.mastery)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
