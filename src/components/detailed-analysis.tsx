import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { API_BASE_URL } from '@/lib/api-config';
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
  examId: string;
  examTitle?: string;
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
}

interface DetailedAnalysisProps {
  result: ExamResult;
  examTitle: string;
  onBack: () => void;
}

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
    priority?: 'high' | 'medium' | 'low' | string;
  }>;
  motivation?: string;
}

export default function DetailedAnalysis({ result, examTitle, onBack }: DetailedAnalysisProps) {
  const [activeTab, setActiveTab] = useState('ai');
  const [mobileQuestionIndex, setMobileQuestionIndex] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [animDirection, setAnimDirection] = useState<'up' | 'down'>('up');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AiExamAnalysis | null>(null);

  const normalizeLegacyExamText = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    let text = String(value);
    const monthToNumber: Record<string, string> = {
      jan: '1', feb: '2', mar: '3', apr: '4', may: '5', jun: '6',
      jul: '7', aug: '8', sep: '9', oct: '10', nov: '11', dec: '12',
    };
    text = text.replace(
      /^(\d{1,2})\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i,
      (_m, day, mon) => `${String(day)}-${monthToNumber[String(mon).toLowerCase()] || mon}`
    );
    text = text
      .replace(/(^|[\s,(=])\?(?=\d)/g, '$1-')
      .replace(/(^|[\s,(=])\uFFFD(?=\d)/g, '$1-')
      .replace(/\uFFFD/g, '?');
    return text;
  };
  // Backward-compatible alias used by answer/solution render helpers.
  const normalizeExamText = (value: unknown): string => normalizeLegacyExamText(value);
  const [animatedValues, setAnimatedValues] = useState({
    percentage: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unattempted: 0,
    obtainedMarks: 0
  });

  // Helper function to extract text from option objects
  const getOptionText = (option: any): string => {
    console.log('getOptionText called with:', option, 'type:', typeof option);
    
    if (option === null || option === undefined) {
      console.log('Option is null/undefined, returning empty string');
      return '';
    }
    
    if (typeof option === 'string') {
      console.log('Option is string:', option);
      return normalizeLegacyExamText(option);
    }
    
    if (typeof option === 'number') {
      console.log('Option is number:', option);
      return normalizeLegacyExamText(String(option));
    }
    
    if (typeof option === 'boolean') {
      console.log('Option is boolean:', option);
      return normalizeLegacyExamText(String(option));
    }
    
    if (typeof option === 'object' && option !== null) {
      console.log('Option is object:', option);
      
      // Try different possible text properties
      if (option.text !== undefined && option.text !== null) {
        console.log('Found text property:', option.text);
        return normalizeLegacyExamText(String(option.text));
      }
      if (option.label !== undefined && option.label !== null) {
        console.log('Found label property:', option.label);
        return normalizeLegacyExamText(String(option.label));
      }
      if (option.value !== undefined && option.value !== null) {
        console.log('Found value property:', option.value);
        return normalizeLegacyExamText(String(option.value));
      }
      if (option.answer !== undefined && option.answer !== null) {
        console.log('Found answer property:', option.answer);
        return normalizeLegacyExamText(String(option.answer));
      }
      if (option._id !== undefined && option._id !== null) {
        console.log('Found _id property:', option._id);
        return normalizeLegacyExamText(String(option._id));
      }
      
      // If it's an array, join the elements
      if (Array.isArray(option)) {
        console.log('Option is array:', option);
        return option.map(getOptionText).join(', ');
      }
      
      // Last resort: stringify the object
      console.log('Using JSON.stringify as last resort:', JSON.stringify(option));
      return normalizeLegacyExamText(JSON.stringify(option));
    }
    
    console.log('Fallback to String():', String(option));
    return normalizeLegacyExamText(String(option));
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
    return question.options.map((option, index) => {
      if (typeof option === 'string') {
        return {
          text: normalizeExamText(option),
          rawText: String(option),
          id: '',
          index,
          letter: String.fromCharCode(65 + index),
        };
      }
      return {
        text: normalizeExamText(option?.text || option?._id || ''),
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
    const normalizedRaw = normalizeExamText(rawText);

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

    // Add a small delay before starting animations
    setTimeout(() => {
      const attempted = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
      const derivedPercentage = attempted > 0 ? (result.correctAnswers / attempted) * 100 : 0;
      animateValue(0, derivedPercentage, (value) => setAnimatedValues(prev => ({ ...prev, percentage: value })));
      animateValue(0, result.correctAnswers, (value) => setAnimatedValues(prev => ({ ...prev, correctAnswers: value })));
      animateValue(0, result.wrongAnswers, (value) => setAnimatedValues(prev => ({ ...prev, wrongAnswers: value })));
      animateValue(0, result.unattempted, (value) => setAnimatedValues(prev => ({ ...prev, unattempted: value })));
      animateValue(0, result.obtainedMarks, (value) => setAnimatedValues(prev => ({ ...prev, obtainedMarks: value })));
    }, 300);
  }, [result]);

  useEffect(() => {
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
          body: JSON.stringify({ result, examTitle }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to generate AI report');
        }
        if (!cancelled) {
          setAiAnalysis(payload?.data?.analysis || null);
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
  }, [result, examTitle]);

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
  const displayPercentage = attemptedCount > 0
    ? (result.correctAnswers / attemptedCount) * 100
    : 0;
  const completionRate = result.totalQuestions > 0
    ? ((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100
    : 0;

  const grade = getGrade(displayPercentage);
  const GradeIcon = grade.icon;

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
        bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
      });
    }
    
    return insights;
  };

  const getWeakAreas = () => {
    const weakAreas = [];
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
  const weakAreas = getWeakAreas();

  const goToPrev = () => {
    if (!result.questions || result.questions.length === 0) return;
    if (mobileQuestionIndex <= 0) return;
    setAnimDirection('down');
    setMobileQuestionIndex((idx) => Math.max(0, idx - 1));
  };

  const goToNext = () => {
    if (!result.questions || result.questions.length === 0) return;
    if (mobileQuestionIndex >= result.questions.length - 1) return;
    setAnimDirection('up');
    setMobileQuestionIndex((idx) => Math.min(result.questions!.length - 1, idx + 1));
  };

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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ai' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Report
          </button>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'questions' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Questions
          </button>
          <button 
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'subjects' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Subjects
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'insights' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Insights
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-2xl mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Question Analysis</h1>
              <p className="text-purple-100">Review each question and understand your performance</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <span className="text-sm font-medium">{result.questions?.length || 0} Total Questions</span>
            </div>
          </div>
        </div>

        {/* Main Score Card with Animation */}
        <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Animated Score Circle */}
              <div className="text-center">
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={displayPercentage >= 70 ? "#10b981" : displayPercentage >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - animatedValues.percentage / 100)}`}
                      className="transition-all duration-2000 ease-out"
                      style={{
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-1">
                        {animatedValues.percentage}%
                      </div>
                      <div className={`text-lg font-semibold ${grade.color}`}>
                        {grade.grade}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${grade.bgColor} ${grade.color} shadow-lg`}>
                  <GradeIcon className="w-4 h-4 mr-2" />
                  {grade.grade} Grade
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {animatedValues.obtainedMarks}
                  </div>
                  <div className="text-lg text-gray-600">out of {result.totalMarks} marks</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{animatedValues.correctAnswers}</div>
                    <div className="text-sm text-green-700">Correct</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{animatedValues.wrongAnswers}</div>
                    <div className="text-sm text-red-700">Wrong</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-600">{animatedValues.unattempted}</div>
                    <div className="text-sm text-gray-700">Skipped</div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-semibold text-gray-700">Accuracy Rate</span>
                    <span className="font-bold text-green-600">
                      {displayPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={displayPercentage} 
                    className="h-3 bg-gray-200"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-semibold text-gray-700">Completion Rate</span>
                    <span className="font-bold text-blue-600">
                      {completionRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={completionRate} 
                    className="h-3 bg-gray-200"
                  />
                </div>
                
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-700">Time Taken</span>
                    </div>
                    <span className="font-bold text-blue-600">{formatTime(result.timeTaken)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}

        {/* AI Report Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle className="text-lg">AI Performance Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                    <div className="text-xs text-emerald-800">Attempted</div>
                    <div className="text-xl font-bold text-emerald-700">{result.correctAnswers + result.wrongAnswers}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="text-xs text-blue-800">Unattempted</div>
                    <div className="text-xl font-bold text-blue-700">{result.unattempted}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-red-50 border-red-200">
                    <div className="text-xs text-red-800">Wrong</div>
                    <div className="text-xl font-bold text-red-700">{result.wrongAnswers}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-purple-50 border-purple-200">
                    <div className="text-xs text-purple-800">Accuracy</div>
                    <div className="text-xl font-bold text-purple-700">
                      {(result.correctAnswers + result.wrongAnswers) > 0
                        ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
                        : '0.0'}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Brain className="w-6 h-6 mr-2 text-indigo-600" />
                  Gemini Performance Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiLoading && (
                  <div className="text-sm text-indigo-700">Generating AI report...</div>
                )}
                {!aiLoading && aiError && (
                  <div className="text-sm text-red-600">{aiError}</div>
                )}
                {!aiLoading && !aiError && aiAnalysis?.summary && (
                  <p className="text-gray-800 whitespace-pre-line">{aiAnalysis.summary}</p>
                )}
                {!aiLoading && !aiError && aiAnalysis?.motivation && (
                  <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900">
                    {aiAnalysis.motivation}
                  </div>
                )}
              </CardContent>
            </Card>

            {!aiLoading && !aiError && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-rose-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Risk Level</span>
                      <Badge variant="outline" className={`uppercase ${riskBadgeClass}`}>
                        {(aiAnalysis?.riskLevel || 'low').toString()}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">Risk Score</span>
                        <span className="font-semibold text-gray-900">
                          {Math.round((Number(aiAnalysis?.riskScore || 0) || 0) * 100)}%
                        </span>
                      </div>
                      <Progress value={(Number(aiAnalysis?.riskScore || 0) || 0) * 100} className="h-2 bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded border bg-blue-50 border-blue-200">
                        <div className="text-[11px] text-blue-800">Next Score</div>
                        <div className="font-semibold text-blue-700">
                          {Math.round(Number(aiAnalysis?.predictions?.nextExamPrediction || 0))}%
                        </div>
                      </div>
                      <div className="p-2 rounded border bg-purple-50 border-purple-200">
                        <div className="text-[11px] text-purple-800">Confidence</div>
                        <div className="font-semibold text-purple-700">
                          {Math.round((Number(aiAnalysis?.predictions?.confidence || 0) || 0) * 100)}%
                        </div>
                      </div>
                      <div className="p-2 rounded border bg-gray-50 border-gray-200">
                        <div className="text-[11px] text-gray-700">Trend</div>
                        <div className="font-semibold capitalize text-gray-800">
                          {String(aiAnalysis?.predictions?.trend || 'stable')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-orange-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Root Causes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-800">
                      {(aiAnalysis?.rootCauses || []).map((cause, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <span>{cause}</span>
                        </li>
                      ))}
                      {(!aiAnalysis?.rootCauses || aiAnalysis.rootCauses.length === 0) && (
                        <li className="text-gray-500">No root causes available yet.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
                <CardHeader>
                  <CardTitle className="text-lg">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-800">
                    {(aiAnalysis?.strengths || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {(!aiAnalysis?.strengths || aiAnalysis.strengths.length === 0) && (
                      <li className="text-gray-500">No AI strengths available yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg">Focus Areas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(aiAnalysis?.focusAreas || []).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold capitalize">{item.subject}</span>
                        <Badge variant="outline" className="uppercase">{item.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-700">{item.issue}</p>
                      <p className="text-sm text-gray-900 mt-1"><strong>Do:</strong> {item.whatToDo}</p>
                    </div>
                  ))}
                  {(!aiAnalysis?.focusAreas || aiAnalysis.focusAreas.length === 0) && (
                    <p className="text-gray-500 text-sm">No AI focus areas available yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg">AI Action Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Today</h4>
                    <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                      {(aiAnalysis?.actionPlan?.today || []).map((x, idx) => <li key={idx}>{x}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">This Week</h4>
                    <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                      {(aiAnalysis?.actionPlan?.thisWeek || []).map((x, idx) => <li key={idx}>{x}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Before Next Exam</h4>
                    <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                      {(aiAnalysis?.actionPlan?.beforeNextExam || []).map((x, idx) => <li key={idx}>{x}</li>)}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Videos & AI Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Subject-wise Videos</h4>
                    <div className="space-y-2">
                      {(aiAnalysis?.videoRecommendations || []).slice(0, 5).map((v, idx) => (
                        <a
                          key={idx}
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100"
                        >
                          <div className="text-sm font-medium text-blue-900">{v.title}</div>
                          <div className="text-xs text-blue-700 capitalize">{v.subject || 'subject'} {v.topic ? `• ${v.topic}` : ''}</div>
                        </a>
                      ))}
                      {(!aiAnalysis?.videoRecommendations || aiAnalysis.videoRecommendations.length === 0) && (
                        <div className="space-y-1">
                          <p className="text-gray-500 text-sm">No direct video recommendation found yet.</p>
                          <p className="text-xs text-gray-500">
                            Open Learning Path and choose weak subject + topic to get targeted videos.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">AsliLearn AI Tools</h4>
                    <div className="space-y-2">
                      {(aiAnalysis?.recommendedAiTools || []).map((t, idx) => (
                        <div key={idx} className="p-2 rounded border border-indigo-200 bg-indigo-50">
                          <div className="text-sm font-medium text-indigo-900">{t.toolType}</div>
                          <div className="text-xs text-indigo-800">{t.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-pink-50">
              <CardHeader>
                <CardTitle className="text-lg">Recommended Interventions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(aiAnalysis?.interventions || []).map((intervention, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-pink-200 bg-pink-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{intervention.action || 'Intervention'}</span>
                      <Badge variant="outline" className="uppercase">{String(intervention.priority || 'medium')}</Badge>
                    </div>
                    {intervention.reasoning && (
                      <p className="text-sm text-gray-700"><strong>Reason:</strong> {intervention.reasoning}</p>
                    )}
                    {intervention.expectedImpact && (
                      <p className="text-sm text-gray-900 mt-1"><strong>Impact:</strong> {intervention.expectedImpact}</p>
                    )}
                  </div>
                ))}
                {(!aiAnalysis?.interventions || aiAnalysis.interventions.length === 0) && (
                  <p className="text-gray-500 text-sm">No interventions available yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">Question-by-Question AI Diagnosis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(aiAnalysis?.questionInsights || []).map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-sm font-semibold text-gray-900">
                        Q{item.index || idx + 1} • {(item.subject || 'general').toString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase">{String(item.status || 'unattempted')}</Badge>
                        <Badge variant="outline" className="uppercase">{String(item.priority || 'medium')}</Badge>
                      </div>
                    </div>
                    {item.conceptGap && <p className="text-sm text-gray-700"><strong>Gap:</strong> {item.conceptGap}</p>}
                    {item.fixStrategy && <p className="text-sm text-gray-800 mt-1"><strong>Fix:</strong> {item.fixStrategy}</p>}
                    {item.practiceTask && <p className="text-sm text-indigo-800 mt-1"><strong>Practice:</strong> {item.practiceTask}</p>}
                  </div>
                ))}
                {(!aiAnalysis?.questionInsights || aiAnalysis.questionInsights.length === 0) && (
                  <p className="text-gray-500 text-sm">Question-level diagnosis will appear after AI analysis is generated.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Question Distribution Chart */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <PieChart className="w-6 h-6 mr-2 text-blue-600" />
                    Question Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-gray-700">Correct Answers</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{result.correctAnswers}</div>
                        <div className="text-sm text-green-700">
                          {((result.correctAnswers / result.totalQuestions) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span className="font-semibold text-gray-700">Wrong Answers</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">{result.wrongAnswers}</div>
                        <div className="text-sm text-red-700">
                          {((result.wrongAnswers / result.totalQuestions) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                        <span className="font-semibold text-gray-700">Unattempted</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-600">{result.unattempted}</div>
                        <div className="text-sm text-gray-700">
                          {((result.unattempted / result.totalQuestions) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Analysis */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <LineChart className="w-6 h-6 mr-2 text-purple-600" />
                    Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                      <Clock className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {formatTime(result.timeTaken)}
                      </div>
                      <div className="text-lg text-purple-700">Total Time Taken</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                        <Calculator className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-blue-600">
                          {formatTime(Math.floor(result.timeTaken / result.totalQuestions))}
                        </div>
                        <div className="text-sm text-blue-700">Avg per Question</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <Zap className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-indigo-600">
                          {result.timeTaken < result.totalQuestions * 60 ? 'Fast' : 'Normal'}
                        </div>
                        <div className="text-sm text-indigo-700">Speed Rating</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {result.questions && result.questions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Question Navigation Sidebar - Modern Grid Layout */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-24">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        Questions
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        {result.questions.length} questions
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Question Numbers Grid - 5 columns, 5-6 rows */}
                      <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-5 gap-2.5">
                          {result.questions.map((question, index) => {
                            const userAnswer = result.answers?.[question._id];
                            const isCorrect = compareAnswers(question, userAnswer, question.correctAnswer);
                            const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                            const isCurrent = index === mobileQuestionIndex;
                            
                            return (
                              <button
                                key={index}
                                onClick={() => setMobileQuestionIndex(index)}
                                className={`
                                  group relative
                                  w-11 h-11 rounded-xl font-bold text-sm
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
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-3">Status Legend</p>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-2 border-purple-400 ring-2 ring-purple-300"></div>
                            <span className="text-xs text-gray-600">Current</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-emerald-400 relative">
                              <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 text-white" />
                            </div>
                            <span className="text-xs text-gray-600">Correct</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-red-500 to-red-600 border-2 border-red-400 relative">
                              <XCircle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 text-white" />
                            </div>
                            <span className="text-xs text-gray-600">Incorrect</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-lg bg-white border-2 border-gray-300"></div>
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
                  <CardContent className="p-6">
                    {result.questions && result.questions.length > 0 && (
                      <>
                        {/* Question Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="capitalize">
                              {result.questions[mobileQuestionIndex]?.subject || 'Unknown'}
                            </Badge>
                            <Badge variant="secondary">
                              {result.questions[mobileQuestionIndex]?.marks || 0} marks
                            </Badge>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="mb-8">
                          <div className="flex items-start space-x-3 mb-4">
                            <span className="text-lg font-semibold text-gray-900">
                              Q{mobileQuestionIndex + 1}.
                            </span>
                            <div className="flex-1">
                              {result.questions[mobileQuestionIndex]?.questionText && (
                                <p className="text-lg text-gray-900 mb-4">
                                  {result.questions[mobileQuestionIndex].questionText}
                                </p>
                              )}
                              
                              {result.questions[mobileQuestionIndex]?.questionImage && (
                                <div className="mb-4">
                                  <img 
                                    src={result.questions[mobileQuestionIndex].questionImage.startsWith('http') 
                                      ? result.questions[mobileQuestionIndex].questionImage 
                                      : `${API_BASE_URL}${result.questions[mobileQuestionIndex].questionImage}`}
                                    alt="Question" 
                                    className="max-w-full h-auto rounded-lg border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Answer Options */}
                          {result.questions[mobileQuestionIndex]?.questionType === 'mcq' && result.questions[mobileQuestionIndex]?.options && (
                            <div className="space-y-3">
                              {result.questions[mobileQuestionIndex].options.map((option: any, index: number) => {
                                const activeQuestion = result.questions![mobileQuestionIndex];
                                const optionText = getOptionText(option);
                                const userAnswer = result.answers?.[result.questions[mobileQuestionIndex]._id];
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
                                    <span className="text-sm font-medium text-gray-600 w-6">{String.fromCharCode(65 + index)}.</span>
                                    <span className={`flex-1 ${
                                      isRight ? 'text-green-800 font-medium' : isUser && !isRight ? 'text-red-800 font-medium' : 'text-gray-700'
                                    }`}>
                                      {optionText}
                                    </span>
                                    {isRight && <CheckCircle className="w-5 h-5 text-green-600" />}
                                    {isUser && !isRight && <XCircle className="w-5 h-5 text-red-600" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Answer Status */}
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                              <div className="text-xs font-semibold text-purple-800 mb-2">Your Answer</div>
                              <div className="text-sm text-purple-900">
                                {(() => {
                                  const activeQuestion = result.questions![mobileQuestionIndex];
                                  const userAnswer = result.answers?.[result.questions[mobileQuestionIndex]._id];
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
                              <div className="text-sm text-green-900">
                                {(() => {
                                  const activeQuestion = result.questions![mobileQuestionIndex];
                                  const correctAnswerTexts = resolveAnswerTexts(activeQuestion, activeQuestion.correctAnswer);
                                  return correctAnswerTexts.length > 0 ? correctAnswerTexts.join(', ') : 'N/A';
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Full Solution */}
                          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div className="text-xs font-semibold text-blue-800 mb-2">Solution</div>
                            <div className="text-sm text-blue-900 whitespace-pre-wrap">
                              {normalizeExamText(result.questions[mobileQuestionIndex]?.explanation) || 'Solution not provided for this question.'}
                            </div>
                          </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-6 pt-6 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setMobileQuestionIndex(Math.max(0, mobileQuestionIndex - 1))}
                            disabled={mobileQuestionIndex === 0}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-600">
                            Question {mobileQuestionIndex + 1} of {result.questions.length}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => setMobileQuestionIndex(Math.min(result.questions.length - 1, mobileQuestionIndex + 1))}
                            disabled={mobileQuestionIndex === result.questions.length - 1}
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
                    <h3 className="text-2xl font-semibold text-gray-700 mb-3">No Question Details Available</h3>
                    <p className="text-gray-500 text-lg">Question details are not available for this exam result.</p>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(result.subjectWiseScore).map(([subject, score]) => {
                const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                const subjectColors = {
                  maths: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-500' },
                  physics: { bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-600', icon: 'text-green-500' },
                  chemistry: { bg: 'from-purple-50 to-pink-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-500' },
                  biology: { bg: 'from-emerald-50 to-lime-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'text-emerald-500' }
                };
                
                const colors = subjectColors[subject as keyof typeof subjectColors] || {
                  bg: 'from-gray-50 to-slate-50',
                  border: 'border-gray-200',
                  text: 'text-gray-600',
                  icon: 'text-gray-500'
                };
                
                return (
                  <Card key={subject} className={`border-0 shadow-xl bg-gradient-to-br ${colors.bg} ${colors.border}`}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${colors.bg} ${colors.border} border-2`}>
                          <BookOpen className={`w-10 h-10 ${colors.icon}`} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 capitalize mb-2">{subject}</h3>
                        <div className="text-4xl font-bold mb-2" style={{ color: colors.text.replace('text-', '#') }}>
                          {percentage.toFixed(1)}%
                        </div>
                        <div className="text-lg text-gray-600 mb-4">
                          {score.correct}/{score.total} correct
                        </div>
                        <div className="text-xl font-semibold text-gray-700 mb-4">
                          {score.marks} marks
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Accuracy</span>
                            <span className="font-semibold" style={{ color: colors.text.replace('text-', '#') }}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2 bg-gray-200"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Performance Insights */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Sparkles className="w-6 h-6 mr-2 text-green-600" />
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
                            <Icon className={`w-6 h-6 ${insight.color} mt-0.5`} />
                            <div>
                              <h4 className={`font-semibold ${insight.color}`}>{insight.title}</h4>
                              <p className="text-gray-700 text-sm mt-1">{insight.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-gray-500">
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
                  <CardTitle className="flex items-center text-xl">
                    <Target className="w-6 h-6 mr-2 text-red-600" />
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
                        <div className="text-sm text-gray-600 mb-2">
                          {area.correct}/{area.total} questions correct
                        </div>
                        <Progress value={area.percentage} className="h-2 bg-gray-200" />
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Excellent! No weak areas identified.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-8">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="px-8 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 shadow-lg"
          >
            <ArrowUp className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>
      </div>
    </div>
  );
}
