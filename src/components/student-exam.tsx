import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';
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
  Calculator
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
  duration: number; // in minutes
  totalQuestions: number;
  totalMarks: number;
  instructions: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questions: Question[];
}

interface StudentExamProps {
  examId: string;
  onComplete: (result: ExamResult) => void;
  onExit: () => void;
}

interface ExamResult {
  examId: string;
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
}

export default function StudentExam({ examId, onComplete, onExit }: StudentExamProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showWarning, setShowWarning] = useState(false);

  // Fetch exam data
  const { data: exam, isLoading } = useQuery({
    queryKey: ['/api/student/exams', examId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/student/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch exam');
      const examData = await response.json();
      console.log('Fetched exam data:', examData);
      
      // Handle API response structure - check if data is nested
      const actualExamData = examData.data || examData;
      console.log('Actual exam data:', actualExamData);
      console.log('Questions:', actualExamData.questions);
      
      if (actualExamData.questions && actualExamData.questions.length > 0) {
        console.log('First question details:', {
          id: actualExamData.questions[0]._id,
          type: actualExamData.questions[0].questionType,
          options: actualExamData.questions[0].options,
          correctAnswer: actualExamData.questions[0].correctAnswer
        });
      }
      return actualExamData;
    }
  });

  // Initialize timer
  useEffect(() => {
    if (exam) {
      const durationInSeconds = exam.duration * 60;
      console.log('Setting timer:', {
        duration: exam.duration,
        durationInSeconds,
        examId: exam._id
      });
      setTimeLeft(durationInSeconds);
    }
  }, [exam]);

  // Timer countdown
  useEffect(() => {
    console.log('Timer effect:', { timeLeft, isSubmitted });
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      console.log('Timer reached 0, submitting exam');
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const handleAnswerChange = (questionId: string, answer: any) => {
    console.log('Answer changed for question:', questionId);
    console.log('New answer:', answer);
    console.log('Answer type:', typeof answer);
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      console.log('Updated answers:', newAnswers);
      return newAnswers;
    });
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

  const handleNext = () => {
    if (exam.questions && Array.isArray(exam.questions) && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!exam) return;

    setIsSubmitted(true);
    
    // Calculate results
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;
    const subjectWiseScore = {
      maths: { correct: 0, total: 0, marks: 0 },
      physics: { correct: 0, total: 0, marks: 0 },
      chemistry: { correct: 0, total: 0, marks: 0 }
    };

    // Safety check for exam.questions
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
      totalQuestions: exam.questions.length,
      correctAnswers,
      wrongAnswers,
      unattempted,
      totalMarks,
      obtainedMarks,
      percentage,
      timeTaken: (exam.duration * 60) - timeLeft,
      subjectWiseScore
    };

    // Save result to backend
    try {
      await fetch('${API_BASE_URL}/api/student/exam-results', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        credentials: 'include',
        body: JSON.stringify(result)
      });
    } catch (error) {
      console.error('Failed to save result:', error);
    }

    onComplete(result);
  };

  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    console.log('Checking answer for question:', question._id);
    console.log('User answer:', userAnswer);
    console.log('Correct answer:', question.correctAnswer);
    console.log('Question type:', question.questionType);
    
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      console.log('User answer is empty');
      return false;
    }

    if (question.questionType === 'integer') {
      const isCorrect = userAnswer.toString() === question.correctAnswer.toString();
      console.log('Integer answer check:', isCorrect);
      return isCorrect;
    }

    if (question.questionType === 'mcq') {
      // Handle both string and object-based correct answers
      const correctAnswer = typeof question.correctAnswer === 'string' 
        ? question.correctAnswer 
        : question.correctAnswer.text || question.correctAnswer.label || question.correctAnswer._id;
      
      console.log('MCQ correct answer:', correctAnswer);
      console.log('MCQ user answer:', userAnswer);
      console.log('MCQ comparison:', userAnswer === correctAnswer);
      
      return userAnswer === correctAnswer;
    }

    if (question.questionType === 'multiple') {
      const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      
      // Convert correct answers to strings for comparison
      const correctAnswerStrings = correctAnswers.map(answer => 
        typeof answer === 'string' ? answer : answer.text || answer.label || answer._id
      );
      
      console.log('Multiple correct answers:', correctAnswerStrings);
      console.log('Multiple user answers:', userAnswers);
      
      if (userAnswers.length !== correctAnswerStrings.length) {
        console.log('Length mismatch');
        return false;
      }
      
      const isCorrect = correctAnswerStrings.every(answer => userAnswers.includes(answer));
      console.log('Multiple answer check:', isCorrect);
      return isCorrect;
    }

    console.log('Unknown question type');
    return false;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug function to show correct answers
  const showCorrectAnswers = () => {
    if (!exam || !exam.questions || !Array.isArray(exam.questions)) return;
    
    console.log('=== CORRECT ANSWERS FOR DEBUGGING ===');
    exam.questions.forEach((question, index) => {
      console.log(`Question ${index + 1}:`, {
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        subject: question.subject
      });
    });
    console.log('=== END CORRECT ANSWERS ===');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Exam not found</p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No questions found in this exam</p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Question not found</p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-600">{exam.examType.toUpperCase()} Exam</p>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Timer */}
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg font-semibold">
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {currentQuestionIndex + 1} of {exam.questions.length}
                </span>
                <div className="w-32">
                  <Progress value={progress} className="h-2" />
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => setShowWarning(true)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Submit Exam
              </Button>
              
              {/* Debug Button - Remove in production */}
              <Button 
                variant="outline" 
                onClick={showCorrectAnswers}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Show Answers (Debug)
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {exam.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                        index === currentQuestionIndex
                          ? 'border-primary bg-primary text-white'
                          : flaggedQuestions.has(index)
                          ? 'border-yellow-400 bg-yellow-100 text-yellow-700'
                          : answers[exam.questions[index]._id] !== undefined
                          ? 'border-green-400 bg-green-100 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-green-400 bg-green-100 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 bg-yellow-100 rounded"></div>
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-300 bg-white rounded"></div>
                    <span>Not Answered</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="capitalize">
                      {currentQuestion.subject || 'Unknown'}
                    </Badge>
                    <Badge variant="secondary">
                      {currentQuestion.marks || 0} marks
                    </Badge>
                    {(currentQuestion.negativeMarks || 0) > 0 && (
                      <Badge variant="destructive">
                        -{currentQuestion.negativeMarks} for wrong
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQuestionIndex)}
                    className={flaggedQuestions.has(currentQuestionIndex) ? 'bg-yellow-100 border-yellow-400' : ''}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    {flaggedQuestions.has(currentQuestionIndex) ? 'Flagged' : 'Flag'}
                  </Button>
                </div>

                {/* Question Content */}
                <div className="mb-8">
                  <div className="flex items-start space-x-3 mb-4">
                    <span className="text-lg font-semibold text-gray-900">
                      Q{currentQuestionIndex + 1}.
                    </span>
                    <div className="flex-1">
                      {currentQuestion.questionText && (
                        <p className="text-lg text-gray-900 mb-4">
                          {currentQuestion.questionText}
                        </p>
                      )}
                      
                      {currentQuestion.questionImage && (
                        <div className="mb-4">
                          {(() => {
                            const imageUrl = currentQuestion.questionImage.startsWith('http') 
                              ? currentQuestion.questionImage 
                              : `${API_BASE_URL}${currentQuestion.questionImage}`;
                            console.log('Question image URL:', imageUrl);
                            return (
                              <div className="relative">
                                <img 
                                  src={imageUrl}
                                  alt="Question" 
                                  className="max-w-full h-auto rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    console.error('Image failed to load:', imageUrl);
                                    e.currentTarget.style.display = 'none';
                                    // Show a placeholder when image fails to load
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500';
                                    placeholder.innerHTML = `
                                      <div class="text-center">
                                        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <p>Image not available</p>
                                        <p class="text-sm">${imageUrl}</p>
                                      </div>
                                    `;
                                    e.currentTarget.parentNode.appendChild(placeholder);
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', imageUrl);
                                  }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {!currentQuestion.questionText && !currentQuestion.questionImage && (
                        <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No question content available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Options */}
                  {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
                    <RadioGroup
                      value={answers[currentQuestion._id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion._id, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, index) => {
                        // Handle both string options and object options
                        const optionText = typeof option === 'string' ? option : option.text || option.label || JSON.stringify(option);
                        const optionValue = typeof option === 'string' ? option : option.text || option.label || option._id;
                        
                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <RadioGroupItem value={optionValue} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}

                  {currentQuestion.questionType === 'multiple' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => {
                        // Handle both string options and object options
                        const optionText = typeof option === 'string' ? option : option.text || option.label || JSON.stringify(option);
                        const optionValue = typeof option === 'string' ? option : option.text || option.label || option._id;
                        
                        return (
                          <div key={index} className="flex items-center space-x-3">
                            <Checkbox
                              id={`option-${index}`}
                              checked={(answers[currentQuestion._id] || []).includes(optionValue)}
                              onCheckedChange={(checked) => {
                                const currentAnswers = answers[currentQuestion._id] || [];
                                if (checked) {
                                  handleAnswerChange(currentQuestion._id, [...currentAnswers, optionValue]);
                                } else {
                                  handleAnswerChange(currentQuestion._id, currentAnswers.filter((a: string) => a !== optionValue));
                                }
                              }}
                            />
                            <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.questionType === 'integer' && (
                    <div className="max-w-xs">
                      <input
                        type="number"
                        placeholder="Enter your answer"
                        value={answers[currentQuestion._id] || ''}
                        onChange={(e) => {
                          console.log('Input onChange triggered:', e.target.value);
                          handleAnswerChange(currentQuestion._id, e.target.value);
                        }}
                        onFocus={(e) => console.log('Input focused')}
                        onBlur={(e) => console.log('Input blurred')}
                        onClick={(e) => console.log('Input clicked')}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
                        autoFocus
                        style={{ zIndex: 1000 }}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleNext}
                      disabled={currentQuestionIndex === exam.questions.length - 1}
                      className="flex items-center space-x-2"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    
                    {currentQuestionIndex === exam.questions.length - 1 && (
                      <Button
                        onClick={() => setShowWarning(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Submit Exam
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Warning Dialog */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <CardTitle>Submit Exam?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to submit the exam? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowWarning(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
                  Submit Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
