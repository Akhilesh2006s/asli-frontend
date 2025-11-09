import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  Brain,
  AlertCircle
} from 'lucide-react';
import Navigation from '@/components/navigation';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  subject: {
    _id: string;
    name: string;
  } | string;
}

export default function IQRankBoostQuiz() {
  const [, params] = useRoute('/iq-rank-boost/quiz/:subjectId');
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
  } | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');

  useEffect(() => {
    if (params?.subjectId) {
      fetchQuestions();
    }
  }, [params?.subjectId]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      // Fetch questions for this subject - backend automatically filters by student's class
      const questionsResponse = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-questions?subject=${encodeURIComponent(params!.subjectId)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const fetchedQuestions = questionsData.data || questionsData.questions || [];
        
        // Shuffle questions to randomize order
        const shuffled = [...fetchedQuestions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        
        // Get subject name from first question
        if (shuffled.length > 0) {
          const firstQuestion = shuffled[0];
          if (typeof firstQuestion.subject === 'object' && firstQuestion.subject?.name) {
            setSubjectName(firstQuestion.subject.name);
          } else {
            setSubjectName('Subject');
          }
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch questions. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fetching questions.',
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
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (questions.length === 0) return;

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      if (!userAnswer) {
        unattempted++;
      } else if (userAnswer === question.correctAnswer) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    
    setResults({
      total: questions.length,
      correct,
      incorrect,
      unattempted,
      score
    });
    setIsSubmitted(true);

    // Save result to backend
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/api/student/iq-rank-quiz-result`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: params?.subjectId,
          totalQuestions: questions.length,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          unattempted: unattempted,
          score: score,
          answers: answers
        })
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      // Don't show error to user, result is still displayed
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="py-16 text-center">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Questions Available</h3>
                <p className="text-gray-500 mb-6">
                  No questions have been generated for this subject yet.
                </p>
                <Link href="/iq-rank-boost-subjects">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Subjects
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (isSubmitted && results) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Brain className="w-6 h-6 text-blue-500" />
                      Quiz Results
                    </CardTitle>
                    <p className="text-gray-600 mt-2">{subjectName}</p>
                  </div>
                  <Link href="/iq-rank-boost-subjects">
                    <Button variant="outline">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Subjects
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{results.total}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Questions</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{results.correct}</div>
                    <div className="text-sm text-gray-600 mt-1">Correct</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{results.incorrect}</div>
                    <div className="text-sm text-gray-600 mt-1">Incorrect</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">{results.unattempted}</div>
                    <div className="text-sm text-gray-600 mt-1">Unattempted</div>
                  </div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg text-white mb-6">
                  <div className="text-5xl font-bold mb-2">{results.score}%</div>
                  <div className="text-lg">Your Score</div>
                </div>
              </CardContent>
            </Card>

            {/* Review Questions */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Review Your Answers</h3>
              {questions.map((question, index) => {
                const userAnswer = answers[question._id];
                const isCorrect = userAnswer === question.correctAnswer;
                const isAnswered = !!userAnswer;

                return (
                  <Card key={question._id} className={isCorrect ? 'border-green-500' : isAnswered ? 'border-red-500' : 'border-gray-200'}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          Question {index + 1}
                        </CardTitle>
                        <div className="flex gap-2">
                          {isCorrect && (
                            <Badge className="bg-green-500">Correct</Badge>
                          )}
                          {isAnswered && !isCorrect && (
                            <Badge variant="destructive">Incorrect</Badge>
                          )}
                          {!isAnswered && (
                            <Badge variant="outline">Unattempted</Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-800 font-medium">{question.questionText}</p>
                      
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => {
                          const isSelected = userAnswer === option.text;
                          const isCorrectOption = option.isCorrect;
                          const optionLetter = String.fromCharCode(65 + optIndex);

                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrectOption
                                  ? 'bg-green-50 border-green-500'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{optionLetter}.</span>
                                <span>{option.text}</span>
                                {isCorrectOption && (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                          <p className="text-sm text-blue-800">{question.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-blue-500" />
                  IQ/Rank Boost Practice
                </h1>
                <p className="text-gray-600 mt-1">{subjectName}</p>
              </div>
              <Link href="/iq-rank-boost-subjects">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{answeredCount} of {questions.length} answered</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1}
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {currentQuestion.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-800 font-medium text-lg">
                {currentQuestion.questionText}
              </p>

              <RadioGroup
                value={answers[currentQuestion._id] || ''}
                onValueChange={(value) => handleAnswerSelect(currentQuestion._id, value)}
              >
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                          answers[currentQuestion._id] === option.text
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <RadioGroupItem
                          value={option.text}
                          id={`option-${index}`}
                          className="mt-1"
                        />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <span className="font-semibold mr-2">{optionLetter}.</span>
                          {option.text}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white"
                >
                  Submit Quiz
                </Button>
              )}
            </div>
          </div>

          {/* Question Navigation Grid */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Question Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((question, index) => {
                  const isAnswered = !!answers[question._id];
                  const isCurrent = index === currentQuestionIndex;
                  return (
                    <Button
                      key={question._id}
                      variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(index)}
                      className="h-10"
                    >
                      {index + 1}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

