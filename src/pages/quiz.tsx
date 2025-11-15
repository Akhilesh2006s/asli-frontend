import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import Navigation from '@/components/navigation';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Target,
  ArrowLeft,
  ArrowRight,
  FileText,
  Trophy
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface Question {
  _id?: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  questions: Question[];
  totalPoints: number;
  subjectIds?: any[];
}

export default function QuizPage() {
  const [, params] = useRoute('/quiz/:id');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchQuiz();
    }
  }, [params?.id]);

  useEffect(() => {
    if (quiz && !isSubmitted) {
      setTimeLeft(quiz.duration * 60); // Convert minutes to seconds
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, isSubmitted]);

  const fetchQuiz = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/api/student/quizzes/${params?.id}`;
      console.log('Fetching quiz from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Quiz response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        setQuiz(data.data || data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch quiz. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fetching the quiz.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    setIsSubmitted(true);
    
    // Calculate results
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;

    quiz.questions.forEach((question) => {
      const questionId = question._id || question.question;
      const userAnswer = answers[questionId];
      
      if (!userAnswer) {
        unattempted++;
      } else {
        const correctAnswer = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer 
          : [question.correctAnswer];
        
        if (correctAnswer.includes(userAnswer)) {
          correct++;
          totalScore += question.points || 1;
        } else {
          incorrect++;
        }
      }
    });

    const percentage = (totalScore / quiz.totalPoints) * 100;
    
    setResults({
      total: quiz.questions.length,
      correct,
      incorrect,
      unattempted,
      score: totalScore,
      percentage: Math.round(percentage)
    });

    // Save quiz attempt
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/student/quizzes/${quiz._id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          score: percentage,
          timeTaken: quiz.duration * 60 - timeLeft
        })
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
              <p className="text-gray-600 mb-4">The quiz you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const questionId = currentQuestion._id || currentQuestion.question;
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quiz Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-2xl mb-2">{quiz.title}</CardTitle>
                <p className="text-gray-600">{quiz.description}</p>
              </div>
              {!isSubmitted && (
                <div className="flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="text-lg font-bold text-red-600">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>{quiz.questions.length} Questions</span>
              </div>
              <div className="flex items-center space-x-1">
                <Trophy className="w-4 h-4" />
                <span>{quiz.totalPoints} Points</span>
              </div>
              <Badge variant="outline">{quiz.difficulty}</Badge>
            </div>
            <Progress value={progress} className="mt-4" />
            <p className="text-sm text-gray-500 mt-2">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </CardHeader>
        </Card>

        {isSubmitted && results ? (
          /* Results View */
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <span>Quiz Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {results.percentage}%
                </div>
                <p className="text-gray-600">Score: {results.score} / {quiz.totalPoints} points</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-800">{results.correct}</div>
                  <div className="text-sm text-green-600">Correct</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-800">{results.incorrect}</div>
                  <div className="text-sm text-red-600">Incorrect</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{results.unattempted}</div>
                  <div className="text-sm text-gray-600">Unattempted</div>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => window.location.href = '/dashboard'}
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Question View */
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl mb-4">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answers[questionId] === option;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(questionId, option)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {optionLabel}
                        </div>
                        <span className="flex-1">{option}</span>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        {!isSubmitted && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
              {currentQuestionIndex < quiz.questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Submit Quiz
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

