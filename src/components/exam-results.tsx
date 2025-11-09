import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import DetailedAnalysis from './detailed-analysis';
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
  Eye
} from 'lucide-react';

interface Question {
  _id: string;
  questionText: string;
  questionImage?: string;
  questionType: 'mcq' | 'multiple' | 'integer';
  options?: string[];
  correctAnswer: string | string[];
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

interface ExamResultsProps {
  result: ExamResult;
  examTitle: string;
  onRetake: () => void;
  onViewAnalysis: () => void;
  onBack: () => void;
}

export default function ExamResults({ result, examTitle, onRetake, onViewAnalysis, onBack }: ExamResultsProps) {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  if (showDetailedAnalysis) {
    return (
      <DetailedAnalysis 
        result={result}
        examTitle={examTitle}
        onBack={() => setShowDetailedAnalysis(false)}
      />
    );
  }
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 70) return { grade: 'B+', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 60) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 50) return { grade: 'C+', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (percentage >= 40) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };

  const grade = getGrade(result.percentage);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Completed!</h1>
          <p className="text-lg text-gray-600">{examTitle}</p>
        </div>

        {/* Overall Score Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Score Circle */}
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#e5e7eb"
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
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.percentage / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{result.percentage.toFixed(1)}%</div>
                      <div className={`text-sm font-medium ${grade.color}`}>{grade.grade}</div>
                    </div>
                  </div>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${grade.bgColor} ${grade.color}`}>
                  <Award className="w-4 h-4 mr-1" />
                  {grade.grade} Grade
                </div>
              </div>

              {/* Marks */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{result.obtainedMarks}</div>
                  <div className="text-sm text-gray-600">out of {result.totalMarks} marks</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Correct: {result.correctAnswers}</span>
                    <span className="text-red-600">Wrong: {result.wrongAnswers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unattempted: {result.unattempted}</span>
                    <span className="text-gray-600">Time: {formatTime(result.timeTaken)}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Accuracy</span>
                    <span>{((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion</span>
                    <span>{(((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject-wise Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(result.subjectWiseScore).map(([subject, score]) => {
                const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                const subjectColors = {
                  maths: 'bg-blue-100 text-blue-600',
                  physics: 'bg-green-100 text-green-600',
                  chemistry: 'bg-purple-100 text-purple-600'
                };
                
                return (
                  <div key={subject} className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${subjectColors[subject as keyof typeof subjectColors]}`}>
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-gray-900 capitalize mb-2">{subject}</h3>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{percentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600 mb-3">
                      {score.correct}/{score.total} correct
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {score.marks} marks
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Question Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Question Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Correct Answers</span>
                    </div>
                    <span className="font-semibold text-green-600">{result.correctAnswers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-gray-700">Wrong Answers</span>
                    </div>
                    <span className="font-semibold text-red-600">{result.wrongAnswers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">Unattempted</span>
                    </div>
                    <span className="font-semibold text-gray-600">{result.unattempted}</span>
                  </div>
                </div>
              </div>

              {/* Time Analysis */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Time Analysis</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-700">Time Taken</span>
                    </div>
                    <span className="font-semibold text-blue-600">{formatTime(result.timeTaken)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-5 h-5 text-purple-500" />
                      <span className="text-gray-700">Avg. per Question</span>
                    </div>
                    <span className="font-semibold text-purple-600">
                      {formatTime(Math.floor(result.timeTaken / result.totalQuestions))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.percentage < 50 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800">Need More Practice</h4>
                      <p className="text-red-700 text-sm mt-1">
                        Focus on fundamental concepts and practice more questions in your weak areas.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {result.percentage >= 50 && result.percentage < 70 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Good Progress</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        You're on the right track! Focus on improving accuracy and speed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {result.percentage >= 70 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Trophy className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-800">Excellent Performance!</h4>
                      <p className="text-green-700 text-sm mt-1">
                        Great job! Keep up the good work and aim for even higher scores.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.unattempted > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800">Time Management</h4>
                      <p className="text-blue-700 text-sm mt-1">
                        You had {result.unattempted} unattempted questions. Practice time management to attempt all questions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowDetailedAnalysis(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Detailed Analysis
          </Button>
          <Button onClick={() => alert('Exams can only be attempted once. Check the "Attempted Exams" tab to view your results.')} variant="outline" className="border-gray-300">
            Exam Completed
          </Button>
        </div>
      </div>
    </div>
  );
}




