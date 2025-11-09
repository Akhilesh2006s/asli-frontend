import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download,
  Share2,
  RefreshCw
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
  subject: 'maths' | 'physics' | 'chemistry';
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
  };
  answers?: Record<string, any>;
  questions?: Question[];
}

interface DetailedAnalysisProps {
  result: ExamResult;
  examTitle: string;
  onBack: () => void;
}

export default function DetailedAnalysis({ result, examTitle, onBack }: DetailedAnalysisProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileQuestionIndex, setMobileQuestionIndex] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [animDirection, setAnimDirection] = useState<'up' | 'down'>('up');
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
      return option;
    }
    
    if (typeof option === 'number') {
      console.log('Option is number:', option);
      return String(option);
    }
    
    if (typeof option === 'boolean') {
      console.log('Option is boolean:', option);
      return String(option);
    }
    
    if (typeof option === 'object' && option !== null) {
      console.log('Option is object:', option);
      
      // Try different possible text properties
      if (option.text !== undefined && option.text !== null) {
        console.log('Found text property:', option.text);
        return String(option.text);
      }
      if (option.label !== undefined && option.label !== null) {
        console.log('Found label property:', option.label);
        return String(option.label);
      }
      if (option.value !== undefined && option.value !== null) {
        console.log('Found value property:', option.value);
        return String(option.value);
      }
      if (option.answer !== undefined && option.answer !== null) {
        console.log('Found answer property:', option.answer);
        return String(option.answer);
      }
      if (option._id !== undefined && option._id !== null) {
        console.log('Found _id property:', option._id);
        return String(option._id);
      }
      
      // If it's an array, join the elements
      if (Array.isArray(option)) {
        console.log('Option is array:', option);
        return option.map(getOptionText).join(', ');
      }
      
      // Last resort: stringify the object
      console.log('Using JSON.stringify as last resort:', JSON.stringify(option));
      return JSON.stringify(option);
    }
    
    console.log('Fallback to String():', String(option));
    return String(option);
  };

  // Helper function to check if an option is correct
  const isOptionCorrect = (option: any): boolean => {
    if (typeof option === 'object' && option !== null) {
      return option.isCorrect === true;
    }
    return false;
  };

  // Helper function to compare answers properly
  const compareAnswers = (userAnswer: any, correctAnswer: any): boolean => {
    if (!userAnswer) return false;
    
    // Extract text values for comparison
    const userText = getOptionText(userAnswer);
    const correctText = getOptionText(correctAnswer);
    
    // Handle array comparisons
    if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
      const userTexts = userAnswer.map(getOptionText).sort();
      const correctTexts = correctAnswer.map(getOptionText).sort();
      return JSON.stringify(userTexts) === JSON.stringify(correctTexts);
    }
    
    // Handle single value comparisons
    return userText === correctText;
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
      animateValue(0, result.percentage, (value) => setAnimatedValues(prev => ({ ...prev, percentage: value })));
      animateValue(0, result.correctAnswers, (value) => setAnimatedValues(prev => ({ ...prev, correctAnswers: value })));
      animateValue(0, result.wrongAnswers, (value) => setAnimatedValues(prev => ({ ...prev, wrongAnswers: value })));
      animateValue(0, result.unattempted, (value) => setAnimatedValues(prev => ({ ...prev, unattempted: value })));
      animateValue(0, result.obtainedMarks, (value) => setAnimatedValues(prev => ({ ...prev, obtainedMarks: value })));
    }, 300);
  }, [result]);

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

  const grade = getGrade(result.percentage);
  const GradeIcon = grade.icon;

  const getPerformanceInsights = () => {
    const insights = [];
    
    if (result.percentage >= 90) {
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
          <button 
            onClick={() => setActiveTab('action')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'action' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Action Plan
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
                      stroke={result.percentage >= 70 ? "#10b981" : result.percentage >= 50 ? "#f59e0b" : "#ef4444"}
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
                      {result.correctAnswers + result.wrongAnswers > 0 
                        ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={(result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100} 
                    className="h-3 bg-gray-200"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-semibold text-gray-700">Completion Rate</span>
                    <span className="font-bold text-blue-600">
                      {(((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100} 
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
          <div className="flex justify-center">
              {result.questions && result.questions.length > 0 ? (
              <div className="w-full max-w-sm mx-auto">
                {/* Mobile Container */}
                <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
                  {/* Mobile Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="text-xs text-gray-500">9:43</div>
                      <div className="text-xs text-gray-500">4G 84%</div>
                    </div>
                  </div>

                  {/* Overlay Question Cards */}
                  <div
                    className="h-full relative overflow-hidden"
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Render all questions as overlays */}
                    {result.questions.map((question, index) => {
                  const userAnswer = result.answers?.[question._id];
                  const isCorrect = compareAnswers(userAnswer, question.correctAnswer);
                  const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                  
                      // Calculate position and animation based on current index
                      const isActive = index === mobileQuestionIndex;
                      const isPrevious = index < mobileQuestionIndex;
                      const isNext = index > mobileQuestionIndex;
                      
                      let yPosition = 0;
                      let zIndex = 0;
                      let opacity = 1;
                      let scale = 1;
                      
                      if (isActive) {
                        yPosition = 0;
                        zIndex = 10;
                        opacity = 1;
                        scale = 1;
                      } else if (isPrevious) {
                        yPosition = -20;
                        zIndex = 5;
                        opacity = 0.3;
                        scale = 0.95;
                      } else if (isNext) {
                        yPosition = 100;
                        zIndex = 1;
                        opacity = 0;
                        scale = 0.9;
                      }

                  return (
                            <motion.div 
                          key={question._id}
                          initial={false}
                          animate={{
                            y: yPosition,
                            opacity: opacity,
                            scale: scale,
                            zIndex: zIndex
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                            duration: 0.6
                          }}
                          className="absolute inset-0 bg-white rounded-3xl"
                          style={{ zIndex }}
                        >
                          <div className="p-4 h-full flex flex-col justify-center">
                            {/* Subject Tag */}
                            <div className="mb-4">
                              <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                                #{question.subject.charAt(0).toUpperCase() + question.subject.slice(1)} Exam
                              </span>
                          </div>
                          
                            {/* Question Label */}
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-700">Q:</span>
                        </div>

                            {/* Question Content Box */}
                            <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200">
                              <p className="text-center text-gray-600">{String(question.questionText || '')}</p>
                            {question.questionImage && (
                                <img src={question.questionImage} alt="Question" className="mt-3 max-w-full rounded-md mx-auto" />
                              )}
                        </div>

                            {/* MCQ Options */}
                            {question.questionType === 'mcq' && question.options && Array.isArray(question.options) && question.options.length > 0 && (
                              <div className="space-y-3 mb-6">
                                {question.options.map((opt, i) => {
                                  const text = getOptionText(opt);
                                  const isUser = Array.isArray(userAnswer) ? userAnswer.some(a => getOptionText(a) === text) : getOptionText(userAnswer) === text;
                                  const isRight = Array.isArray(question.correctAnswer) ? question.correctAnswer.some(a => getOptionText(a) === text) : getOptionText(question.correctAnswer) === text;
                                
                                return (
                                    <div key={i} className={`flex items-center rounded-lg border px-3 py-3 text-sm ${
                                    isRight ? 'border-green-300 bg-green-50' : isUser && !isRight ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                                  }`}>
                                      <span className="mr-3 text-sm font-medium text-gray-600">{String.fromCharCode(65 + i)}</span>
                                      <span className={`flex-1 ${
                                        isRight ? 'text-green-800' : isUser && !isRight ? 'text-red-800' : 'text-gray-700'
                                      }`}>
                                        {text}
                                      </span>
                                      {isRight && <CheckCircle className="h-4 w-4 text-green-600" />}
                                      {isUser && !isRight && <XCircle className="h-4 w-4 text-red-600" />}
                                  </div>
                                );
                              })}
                          </div>
                        )}

                            {/* Show options for other question types too */}
                            {question.questionType !== 'mcq' && question.options && Array.isArray(question.options) && question.options.length > 0 && (
                              <div className="space-y-3 mb-6">
                                <div className="text-sm font-medium text-gray-700 mb-2">Available Options:</div>
                                {question.options.map((opt, i) => {
                                  const text = getOptionText(opt);
                                  const isUser = Array.isArray(userAnswer) ? userAnswer.some(a => getOptionText(a) === text) : getOptionText(userAnswer) === text;
                                  const isRight = Array.isArray(question.correctAnswer) ? question.correctAnswer.some(a => getOptionText(a) === text) : getOptionText(question.correctAnswer) === text;
                                  
                                  return (
                                    <div key={i} className={`flex items-center rounded-lg border px-3 py-3 text-sm ${
                                    isRight ? 'border-green-300 bg-green-50' : isUser && !isRight ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                                  }`}>
                                      <span className="mr-3 text-sm font-medium text-gray-600">{String.fromCharCode(65 + i)}</span>
                                      <span className={`flex-1 ${
                                        isRight ? 'text-green-800' : isUser && !isRight ? 'text-red-800' : 'text-gray-700'
                                      }`}>
                                        {text}
                                      </span>
                                      {isRight && <CheckCircle className="h-4 w-4 text-green-600" />}
                                      {isUser && !isRight && <XCircle className="h-4 w-4 text-red-600" />}
                                    </div>
                                    );
                                })}
                                </div>
                            )}

                            {/* Answer Status */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                                <div className="text-xs font-semibold text-purple-800 mb-1">Your Answer</div>
                                <div className="text-sm text-purple-900">
                                  {isAttempted ? String(Array.isArray(userAnswer) ? userAnswer.map(getOptionText).join(', ') : getOptionText(userAnswer)) : 'Not attempted'}
                                </div>
                              </div>
                              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                <div className="text-xs font-semibold text-green-800 mb-1">Correct Answer</div>
                                <div className="text-sm text-green-900">
                                  {String(Array.isArray(question.correctAnswer) ? question.correctAnswer.map(getOptionText).join(', ') : getOptionText(question.correctAnswer))}
                                </div>
                              </div>
                        </div>

                            {/* Next Button */}
                            {mobileQuestionIndex < result.questions.length - 1 && (
                              <div className="text-center mb-4">
                                <button
                                  onClick={goToNext}
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                  Next Question
                                </button>
                              </div>
                            )}

                            {/* Question Counter */}
                            <div className="mt-2 text-center">
                              <div className="text-xs text-gray-500">
                                Question {index + 1} of {result.questions.length}
                              </div>
                              <div className="flex justify-center mt-2 space-x-1">
                                {result.questions.map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                ))}
                            </div>
                              </div>
                            </div>
                        </motion.div>
                      );
                    })}
                          </div>

                  {/* Mobile Bottom Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 p-2">
                    <div className="w-full h-1 bg-gray-300 rounded-full"></div>
                        </div>
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
                  chemistry: { bg: 'from-purple-50 to-pink-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-500' }
                };
                
                const colors = subjectColors[subject as keyof typeof subjectColors];
                
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

        {/* Action Plan Tab */}
        {activeTab === 'action' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Study Recommendations */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="w-6 h-6 mr-2 text-orange-600" />
                    Study Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.percentage < 50 && (
                      <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-red-800">Focus on Fundamentals</h4>
                            <p className="text-red-700 text-sm mt-1">
                              Review basic concepts and practice foundational problems before moving to advanced topics.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.percentage >= 50 && result.percentage < 70 && (
                      <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <TrendingUp className="w-6 h-6 text-yellow-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-yellow-800">Improve Accuracy</h4>
                            <p className="text-yellow-700 text-sm mt-1">
                              Focus on reducing careless mistakes and improving problem-solving techniques.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.percentage >= 70 && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <Trophy className="w-6 h-6 text-green-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-green-800">Maintain Excellence</h4>
                            <p className="text-green-700 text-sm mt-1">
                              Keep practicing advanced problems and aim for perfection in your strong areas.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.unattempted > 0 && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <Clock className="w-6 h-6 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-blue-800">Time Management</h4>
                            <p className="text-blue-700 text-sm mt-1">
                              Practice with time constraints to improve speed and ensure you attempt all questions.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Plan */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Target className="w-6 h-6 mr-2 text-purple-600" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center space-x-3 mb-2">
                        <RefreshCw className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800">Retake Practice</h4>
                      </div>
                      <p className="text-purple-700 text-sm">
                        Retake this exam to improve your score and track your progress.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl">
                      <div className="flex items-center space-x-3 mb-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-semibold text-indigo-800">Study Materials</h4>
                      </div>
                      <p className="text-indigo-700 text-sm">
                        Review video lectures and practice questions in your weak subject areas.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="flex items-center space-x-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-800">Track Progress</h4>
                      </div>
                      <p className="text-green-700 text-sm">
                        Monitor your improvement over time with regular practice tests.
                      </p>
                    </div>
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
          <Button 
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button 
            variant="outline"
            className="px-8 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 shadow-lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Results
          </Button>
        </div>
      </div>
    </div>
  );
}
