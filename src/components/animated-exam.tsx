import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  Flag,
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Question {
  _id: string;
  questionText: string;
  questionImage?: string;
  questionType: 'mcq' | 'multiple' | 'integer';
  options?: (string | { text: string; isCorrect?: boolean; _id?: string })[];
  correctAnswer: string | string[] | { text: string; isCorrect?: boolean; _id?: string } | { text: string; isCorrect?: boolean; _id?: string }[];
  marks: number;
  negativeMarks: number;
  explanation?: string;
  subject: 'maths' | 'physics' | 'chemistry';
}

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  instructions: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questions: Question[];
}

interface ExamResult {
  examId: string;
  examTitle: string;
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
  answers: Record<string, any>;
}

interface AnimatedExamProps {
  examId: string;
  onComplete: (result: ExamResult) => void;
  onExit: () => void;
}

export default function AnimatedExam({ examId, onComplete, onExit }: AnimatedExamProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'up' | 'down'>('up');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Fetch exam data
  const { data: exam, isLoading } = useQuery({
    queryKey: ['/api/student/exams', examId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/student/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam');
      }
      
      const examData = await response.json();
      console.log('Fetched exam data:', examData);
      
      // Handle API response structure - check if data is nested
      const actualExamData = examData.data || examData;
      console.log('Actual exam data:', actualExamData);
      console.log('Questions:', actualExamData.questions);
      
      // Check if the response indicates success
      if (examData.success === false) {
        throw new Error(examData.message || 'Failed to fetch exam');
      }
      
      if (actualExamData.questions && actualExamData.questions.length > 0) {
        console.log('First question details:', {
          id: actualExamData.questions[0]._id,
          type: actualExamData.questions[0].questionType,
          options: actualExamData.questions[0].options,
          correctAnswer: actualExamData.questions[0].correctAnswer
        });
      } else {
        console.warn('No questions found in exam:', {
          examId: actualExamData._id,
          examTitle: actualExamData.title,
          questions: actualExamData.questions
        });
      }
      
      return actualExamData;
    }
  });

  // Initialize timer
  useEffect(() => {
    if (exam) {
      setTimeLeft(exam.duration * 60);
    }
  }, [exam]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Add interactive feedback
    setSelectedAnswer(value);
    setShowAnswerFeedback(true);
    
    // Show brief feedback animation
    setTimeout(() => {
      setShowAnswerFeedback(false);
      setSelectedAnswer(null);
    }, 1000);
  };

  const handleFlagQuestion = (questionIndex: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const animateToQuestion = (newIndex: number) => {
    if (isAnimating || newIndex === currentQuestionIndex) return;
    
    setIsAnimating(true);
    setAnimationDirection(newIndex > currentQuestionIndex ? 'up' : 'down');
    
    // Add a slight delay for smoother animation
    setTimeout(() => {
      setCurrentQuestionIndex(newIndex);
      setTimeout(() => {
        setIsAnimating(false);
        // Add a subtle bounce effect after animation completes
        setTimeout(() => {
          // This will trigger a re-render with the new question
        }, 100);
      }, 300);
    }, 300);
  };

  const handleNext = () => {
    if (exam?.questions && currentQuestionIndex < exam.questions.length - 1) {
      animateToQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      animateToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!exam) return;

    setIsSubmitted(true);
    
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;
    const subjectWiseScore = {
      maths: { correct: 0, total: 0, marks: 0 },
      physics: { correct: 0, total: 0, marks: 0 },
      chemistry: { correct: 0, total: 0, marks: 0 }
    };

    if (!exam.questions || !Array.isArray(exam.questions)) {
      console.error('Exam questions are not available:', exam.questions);
      setIsSubmitted(false);
      alert('No questions found in this exam. Please try again.');
      return;
    }

    exam.questions.forEach((question: Question) => {
      const userAnswer = answers[question._id];
      const isCorrect = checkAnswer(question, userAnswer);
      
      subjectWiseScore[question.subject].total++;
      totalMarks += question.marks;

      if (isCorrect) {
        correctAnswers++;
        obtainedMarks += question.marks;
        subjectWiseScore[question.subject].correct++;
        subjectWiseScore[question.subject].marks += question.marks;
      } else if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        wrongAnswers++;
        obtainedMarks -= question.negativeMarks;
      }
    });

    const unattempted = exam.questions.length - correctAnswers - wrongAnswers;
    const percentage = (obtainedMarks / totalMarks) * 100;

    const result: ExamResult = {
      examId: exam._id,
      examTitle: exam.title,
      totalQuestions: exam.questions.length,
      correctAnswers,
      wrongAnswers,
      unattempted,
      totalMarks,
      obtainedMarks,
      percentage,
      timeTaken: (exam.duration * 60) - timeLeft,
      subjectWiseScore,
      answers: answers, // Include the answers object
      questions: exam.questions // Include the questions data
    };

    try {
      console.log('📤 Saving exam result:', {
        examId: result.examId,
        examTitle: result.examTitle,
        percentage: result.percentage
      });
      
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        credentials: 'include',
        body: JSON.stringify(result)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Exam result submission failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to save result: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Exam result saved successfully:', responseData);
      console.log('📋 Saved examId:', responseData.data?.examId || result.examId);
    } catch (error) {
      console.error('❌ Failed to save result:', error);
      // Don't prevent exam completion even if saving fails
      // But alert the user
      alert('Warning: Exam result may not have been saved. Please check your connection and try again.');
    }

    // Call onComplete after saving (this will trigger UI refresh)
    onComplete(result);
  };

  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return false;
    }

    if (question.questionType === 'integer') {
      return userAnswer.toString() === question.correctAnswer.toString();
    }

    if (question.questionType === 'mcq') {
      const correctAnswer = typeof question.correctAnswer === 'string' 
        ? question.correctAnswer 
        : question.correctAnswer.text || question.correctAnswer.label || question.correctAnswer._id;
      
      return userAnswer === correctAnswer;
    }

    if (question.questionType === 'multiple') {
      const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      
      const correctAnswerStrings = correctAnswers.map(answer => 
        typeof answer === 'string' ? answer : answer.text || answer.label || answer._id
      );
      
      if (userAnswers.length !== correctAnswerStrings.length) {
        return false;
      }
      
      return correctAnswerStrings.every(answer => userAnswers.includes(answer));
    }

    return false;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Exam not found</p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  // Debug exam data
  console.log('Exam data in render:', exam);
  console.log('Exam questions:', exam.questions);
  console.log('Questions length:', exam.questions?.length);

  if (!exam.questions || exam.questions.length === 0) {
    console.error('No questions found in exam:', {
      examId: exam._id,
      examTitle: exam.title,
      questions: exam.questions,
      questionsType: typeof exam.questions,
      questionsLength: exam.questions?.length
    });
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No questions found in this exam</p>
          <p className="text-sm text-gray-500 mt-2">
            Exam ID: {exam._id}<br/>
            Questions: {exam.questions?.length || 0}
          </p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-style Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="text-gray-600 hover:text-gray-900 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:-translate-x-1" />
              Back
            </Button>

            {/* Timer */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
              timeLeft < 300 
                ? 'bg-red-100 text-red-700 animate-pulse' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Submit Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowWarning(true)}
              className="text-red-600 border-red-300 hover:bg-red-50 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Submit
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span className="transition-all duration-300">Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
              <span className="transition-all duration-300">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 transition-all duration-500" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Animated Question Container */}
        <div className="relative overflow-hidden">
          <div 
            className={`transition-all duration-500 ease-in-out ${
              isAnimating 
                ? animationDirection === 'up' 
                  ? 'transform translate-y-full opacity-0 scale-95' 
                  : 'transform -translate-y-full opacity-0 scale-95'
                : 'transform translate-y-0 opacity-100 scale-100'
            }`}
          >
            <Card className={`shadow-lg border-0 bg-white transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
              showAnswerFeedback ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
            }`}>
              <CardContent className="p-6">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize text-xs ${
                        currentQuestion.subject === 'maths' ? 'bg-blue-100 text-blue-700' :
                        currentQuestion.subject === 'physics' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {currentQuestion.subject || 'Unknown'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {currentQuestion.marks || 0} marks
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQuestionIndex)}
                    className={`p-2 ${flaggedQuestions.has(currentQuestionIndex) ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 hover:text-yellow-600'}`}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>

                {/* Question Content */}
                <div className="mb-6">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                      Q{currentQuestionIndex + 1}.
                    </span>
                    <div className="flex-1">
                      {currentQuestion.questionText && (
                        <p className="text-base text-gray-900 mb-4 leading-relaxed">
                          {currentQuestion.questionText}
                        </p>
                      )}
                      
                      {currentQuestion.questionImage && (
                        <div className="mb-4">
                          <img 
                            src={currentQuestion.questionImage.startsWith('http') 
                              ? currentQuestion.questionImage 
                              : `${API_BASE_URL}${currentQuestion.questionImage}`}
                            alt="Question" 
                            className="w-full h-auto rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Options */}
                  {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
                    <RadioGroup
                      value={answers[currentQuestion._id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion._id, value)}
                      className="space-y-3 mt-4"
                    >
                      {currentQuestion.options.map((option, index) => {
                        const optionText = typeof option === 'string' ? option : option.text || option.label || JSON.stringify(option);
                        const optionValue = typeof option === 'string' ? option : option.text || option.label || option._id;
                        
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${
                              selectedAnswer === optionValue && showAnswerFeedback
                                ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <RadioGroupItem 
                              value={optionValue} 
                              id={`option-${index}`}
                              className="transition-all duration-200 hover:scale-110"
                            />
                            <Label 
                              htmlFor={`option-${index}`} 
                              className={`text-sm cursor-pointer flex-1 transition-all duration-200 ${
                                selectedAnswer === optionValue && showAnswerFeedback
                                  ? 'text-blue-700 font-medium'
                                  : 'text-gray-700 hover:text-gray-900'
                              }`}
                            >
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {currentQuestion.questionType === 'multiple' && currentQuestion.options && (
                    <div className="space-y-3 mt-4">
                      {currentQuestion.options.map((option, index) => {
                        const optionText = typeof option === 'string' ? option : option.text || option.label || JSON.stringify(option);
                        const optionValue = typeof option === 'string' ? option : option.text || option.label || option._id;
                        const userAnswers = answers[currentQuestion._id] || [];
                        const isChecked = Array.isArray(userAnswers) && userAnswers.includes(optionValue);
                        
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${
                              isChecked
                                ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <Checkbox
                              id={`option-${index}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentAnswers = answers[currentQuestion._id] || [];
                                const newAnswers = checked
                                  ? [...currentAnswers, optionValue]
                                  : currentAnswers.filter((ans: any) => ans !== optionValue);
                                handleAnswerChange(currentQuestion._id, newAnswers);
                              }}
                              className="transition-all duration-200 hover:scale-110"
                            />
                            <Label 
                              htmlFor={`option-${index}`} 
                              className={`text-sm cursor-pointer flex-1 transition-all duration-200 ${
                                isChecked
                                  ? 'text-green-700 font-medium'
                                  : 'text-gray-700 hover:text-gray-900'
                              }`}
                            >
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.questionType === 'integer' && (
                    <div className="mt-4">
                      <Label htmlFor="integer-answer" className="text-sm font-medium text-gray-700 mb-2 block">
                        Enter your answer:
                      </Label>
                      <Input
                        id="integer-answer"
                        type="number"
                        value={answers[currentQuestion._id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                        placeholder="Enter numerical answer"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || isAnimating}
            className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-2">
            {exam.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => animateToQuestion(index)}
                disabled={isAnimating}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all duration-300 transform hover:scale-110 hover:shadow-md disabled:cursor-not-allowed ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-white scale-110 shadow-lg ring-2 ring-primary ring-opacity-50'
                    : flaggedQuestions.has(index)
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400'
                    : answers[exam.questions[index]._id] !== undefined
                    ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:border-green-400'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentQuestionIndex === exam.questions.length - 1 || isAnimating}
            className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Quick Navigation Hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 animate-pulse">
            Tap question numbers to jump directly
          </p>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <div className="flex flex-col space-y-3">
          {/* Flag Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFlagQuestion(currentQuestionIndex)}
            className={`rounded-full w-12 h-12 shadow-lg transition-all duration-300 hover:scale-110 ${
              flaggedQuestions.has(currentQuestionIndex) 
                ? 'bg-yellow-100 border-yellow-400 text-yellow-700 hover:bg-yellow-200' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Flag className="w-5 h-5" />
          </Button>
          
          {/* Quick Submit Button */}
          <Button
            size="sm"
            onClick={() => setShowWarning(true)}
            className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
          >
            <CheckCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Submit Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span>Submit Exam?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to submit your exam? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowWarning(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowWarning(false);
                    handleSubmit();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
