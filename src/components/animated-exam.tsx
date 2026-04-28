import { useState, useEffect, useRef } from 'react';
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
import { normalizeAndFormatExamDisplayText } from '@/lib/exam-text-normalize';

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
  subject: string;
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
  attemptNumber?: number;
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
  questions?: Question[];
  questionTimings?: Record<string, number>;
}

interface AnimatedExamProps {
  examId: string;
  onComplete: (result: ExamResult) => void;
  onExit: () => void;
}

/** Normalize question id so answer map keys always match (fixes clear / submit with mixed id shapes). */
function answerKey(questionOrId: Question | string | null | undefined): string {
  if (questionOrId == null) return '';
  if (typeof questionOrId === 'string') return questionOrId;
  return String(questionOrId._id ?? (questionOrId as any).id ?? '');
}

/** True only when the student has a non-empty response for this question type. */
function isAnswerProvidedForQuestion(question: Question, raw: any): boolean {
  if (raw === undefined || raw === null) return false;
  const t = question.questionType;
  if (t === 'mcq') {
    return String(raw).trim() !== '';
  }
  if (t === 'multiple') {
    return Array.isArray(raw) && raw.length > 0;
  }
  if (t === 'integer') {
    return String(raw).trim() !== '';
  }
  return false;
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
  /** Bumps when MCQ is cleared so Radix RadioGroup remounts and truly deselects. */
  const [mcqRadioNonce, setMcqRadioNonce] = useState(0);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitAttempts, setExitAttempts] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [showReenterPrompt, setShowReenterPrompt] = useState(false);
  const [timerInitialized, setTimerInitialized] = useState(false);
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const MAX_EXIT_ATTEMPTS = 5;
  const submissionInProgressRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const autoSubmitTimeoutRef = useRef<number | null>(null);
  const questionEnterTimestampRef = useRef<number>(Date.now());
  const lastTrackedQuestionIdRef = useRef<string | null>(null);
  const initializedExamIdRef = useRef<string | null>(null);

  // Fetch exam data
  const { data: exam, isLoading, isError, error } = useQuery({
    queryKey: ['/api/student/exams', examId],
    queryFn: async () => {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${API_BASE_URL}/api/student/exams/${examId}`, {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Failed to fetch exam');
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

      // Safety fallback: if direct exam endpoint returns empty questions, re-check
      // using exams list payload (which may already have hydrated questions).
      const hasQuestions = Array.isArray(actualExamData.questions) && actualExamData.questions.length > 0;
      if (!hasQuestions) {
        const listResponse = await fetch(`${API_BASE_URL}/api/student/exams`, {
          headers,
          credentials: 'include'
        });

        if (listResponse.ok) {
          const listPayload = await listResponse.json().catch(() => ({}));
          const listExams = Array.isArray(listPayload)
            ? listPayload
            : Array.isArray(listPayload?.data)
            ? listPayload.data
            : [];
          const matchedExam = listExams.find((e: any) => String(e?._id) === String(examId));
          const matchedQuestions = Array.isArray(matchedExam?.questions) ? matchedExam.questions : [];
          if (matchedQuestions.length > 0) {
            return {
              ...actualExamData,
              ...matchedExam,
              questions: matchedQuestions,
              totalQuestions: matchedQuestions.length,
            };
          }
        }
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
    },
    retry: 1,
    // During an active exam, refetch on focus can re-run exam data and
    // accidentally reset timer state while switching fullscreen.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Initialize timer
  useEffect(() => {
    if (exam) {
      const incomingExamId = String(exam._id || examId || '');
      const alreadyInitializedForSameExam = initializedExamIdRef.current === incomingExamId;
      if (alreadyInitializedForSameExam && timerInitialized) {
        return;
      }
      const rawDuration = Number(exam.duration);
      const safeDurationMinutes =
        Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30;
      setTimeLeft(Math.round(safeDurationMinutes * 60));
      setTimerInitialized(true);
      initializedExamIdRef.current = incomingExamId;
    } else {
      setTimeLeft(0);
      setTimerInitialized(false);
      initializedExamIdRef.current = null;
    }
  }, [exam, examId, timerInitialized]);

  // Function to enter/re-enter fullscreen
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setShowReenterPrompt(false);
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
        setIsFullscreen(true);
        setShowReenterPrompt(false);
      } else if ((document.documentElement as any).mozRequestFullScreen) {
        await (document.documentElement as any).mozRequestFullScreen();
        setIsFullscreen(true);
        setShowReenterPrompt(false);
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen();
        setIsFullscreen(true);
        setShowReenterPrompt(false);
      }
    } catch (error) {
      console.log('Fullscreen not available:', error);
    }
  };

  // Enter fullscreen on mount
  useEffect(() => {
    enterFullscreen();

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      if (submissionInProgressRef.current) {
        return;
      }

      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If exited fullscreen and not submitted, show warning and prompt
      if (!isCurrentlyFullscreen && !isSubmitted) {
        setExitAttempts(prev => Math.min(prev + 1, MAX_EXIT_ATTEMPTS));
        setShowExitWarning(true);
        setShowReenterPrompt(true);
      } else if (isCurrentlyFullscreen) {
        // If back in fullscreen, hide warnings
        setShowExitWarning(false);
        setShowReenterPrompt(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Prevent context menu and other shortcuts
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', preventDefaults);
    document.addEventListener('keydown', (e) => {
      // Prevent F11, Alt+Tab, etc.
      if (e.key === 'F11' || (e.altKey && e.key === 'Tab')) {
        e.preventDefault();
      }
    });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventDefaults);
    };
  }, [isSubmitted]);

  // Trigger auto-submit once when max fullscreen exits are reached.
  useEffect(() => {
    if (
      isSubmitted ||
      exitAttempts < MAX_EXIT_ATTEMPTS ||
      autoSubmitTriggeredRef.current ||
      submissionInProgressRef.current
    ) {
      return;
    }

    console.log('⚠️ Maximum exit attempts reached. Auto-submitting exam...');
    setShowExitWarning(true);
    setShowReenterPrompt(false);

    autoSubmitTriggeredRef.current = true;
    if (autoSubmitTimeoutRef.current !== null) {
      window.clearTimeout(autoSubmitTimeoutRef.current);
    }
    // Keep warning visible briefly, then force submit once.
    autoSubmitTimeoutRef.current = window.setTimeout(() => {
      void handleSubmit();
    }, 1200);
  }, [exitAttempts, isSubmitted]);

  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current !== null) {
        window.clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!exam || !timerInitialized || isSubmitted) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, exam, timerInitialized]);

  useEffect(() => {
    if (!exam?.questions?.length) return;
    if (lastTrackedQuestionIdRef.current) return;
    const currentQuestion = exam.questions[currentQuestionIndex];
    if (!currentQuestion?._id) return;
    lastTrackedQuestionIdRef.current = String(currentQuestion._id);
    questionEnterTimestampRef.current = Date.now();
  }, [exam, currentQuestionIndex]);

  const recordCurrentQuestionDuration = (baseTimings: Record<string, number> = questionTimings) => {
    if (!exam?.questions?.length) return;
    const now = Date.now();
    const current = exam.questions[currentQuestionIndex];
    const currentId = current?._id ? String(current._id) : null;
    if (!currentId) return;

    if (!lastTrackedQuestionIdRef.current) {
      lastTrackedQuestionIdRef.current = currentId;
      questionEnterTimestampRef.current = now;
      return;
    }

    const elapsedSec = Math.max(0, Math.round((now - questionEnterTimestampRef.current) / 1000));
    const trackedId = lastTrackedQuestionIdRef.current;
    let updatedTimings = baseTimings;
    if (elapsedSec > 0) {
      updatedTimings = {
        ...baseTimings,
        [trackedId]: (baseTimings[trackedId] || 0) + elapsedSec,
      };
      setQuestionTimings(updatedTimings);
    }
    lastTrackedQuestionIdRef.current = currentId;
    questionEnterTimestampRef.current = now;
    return updatedTimings;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    const k = answerKey(questionId);
    if (!k) return;
    setAnswers(prev => ({
      ...prev,
      [k]: value
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

  const handleClearCurrentAnswer = () => {
    if (!exam?.questions?.[currentQuestionIndex]) return;
    const q = exam.questions[currentQuestionIndex];
    const k = answerKey(q);
    if (!k) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setSelectedAnswer(null);
    setShowAnswerFeedback(false);
    if (q.questionType === 'mcq') {
      setMcqRadioNonce((n) => n + 1);
    }
  };

  const animateToQuestion = (newIndex: number) => {
    if (isAnimating || newIndex === currentQuestionIndex) return;
    try {
      recordCurrentQuestionDuration(questionTimings);
    } catch (timingError) {
      console.warn('Failed to record final question timing:', timingError);
    }
    
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
    if (!exam || isSubmitted || submissionInProgressRef.current) return;

    submissionInProgressRef.current = true;
    let finalQuestionTimings = questionTimings;
    let fallbackResult: ExamResult | null = null;
    try {
      finalQuestionTimings = recordCurrentQuestionDuration(questionTimings) || questionTimings;
    } catch (timingError) {
      console.warn('Failed to record final question timing during submit:', timingError);
    }

    try {
      setIsSubmitted(true);
      setShowWarning(false);
      if (exitAttempts < MAX_EXIT_ATTEMPTS) {
        setShowExitWarning(false);
      }
      setShowReenterPrompt(false);
      
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
        submissionInProgressRef.current = false;
        alert('No questions found in this exam. Please try again.');
        return;
      }

      exam.questions.forEach((question: Question) => {
        try {
          const userAnswer = answers[answerKey(question)];
          const isCorrect = checkAnswer(question, userAnswer);
          const normalizedSubject = String(question.subject || '').toLowerCase();
          const hasTrackedSubject =
            normalizedSubject === 'maths' ||
            normalizedSubject === 'physics' ||
            normalizedSubject === 'chemistry';

          if (hasTrackedSubject) {
            const subjectKey = normalizedSubject as keyof typeof subjectWiseScore;
            subjectWiseScore[subjectKey].total++;
          }

          totalMarks += Number(question.marks) || 0;

          if (isCorrect) {
            correctAnswers++;
            obtainedMarks += Number(question.marks) || 0;
            if (hasTrackedSubject) {
              const subjectKey = normalizedSubject as keyof typeof subjectWiseScore;
              subjectWiseScore[subjectKey].correct++;
              subjectWiseScore[subjectKey].marks += Number(question.marks) || 0;
            }
          } else if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
            wrongAnswers++;
            obtainedMarks -= Number(question.negativeMarks) || 0;
          }
        } catch (questionError) {
          console.warn('Question grading failed; marking as unattempted-safe fallback:', {
            questionId: question?._id,
            error: questionError,
          });
          totalMarks += Number(question?.marks) || 0;
        }
      });

      const unattempted = exam.questions.length - correctAnswers - wrongAnswers;
      // Keep immediate UI aligned with server grading display metric:
      // percentage = correct / total questions (including unattempted).
      const totalQuestionCount = exam.questions.length;
      const percentage = totalQuestionCount > 0 ? (correctAnswers / totalQuestionCount) * 100 : 0;

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
        answers: answers,
        questions: exam.questions,
        questionTimings: finalQuestionTimings
      };
      fallbackResult = result;

      // Move to completion view immediately so the fullscreen warning cannot block UI.
      try {
        onComplete(result);
      } catch (completeError) {
        console.error('Immediate completion transition failed, continuing submit:', completeError);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

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
          body: JSON.stringify({
            ...result,
            // Avoid sending full question bank back to server; answers are sufficient.
            questions: undefined
          }),
          signal: controller.signal
        });
        if (!response.ok) {
          let errorData: any = null;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.warn('Failed to parse error response JSON:', parseError);
          }

          console.error('❌ Exam result submission failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          const msg = errorData?.message || response.statusText;
          if (response.status === 403) {
            alert(msg || 'You cannot submit more attempts for this exam.');
          }
          throw new Error(`Failed to save result: ${msg}`);
        }

        let responseData: any = null;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.warn('Response was not JSON, continuing exam completion:', parseError);
        }

        console.log('✅ Exam result saved successfully:', responseData);
        console.log('📋 Saved examId:', responseData.data?.examId || result.examId);

        // Server is the source of truth for grading. Re-sync UI with
        // authoritative scoring to avoid mismatch across screens.
        if (responseData?.data && typeof responseData.data === 'object') {
          const serverResult = responseData.data;
          const localAnswerCount = result.answers ? Object.keys(result.answers).length : 0;
          const serverAnswersRaw = serverResult.answers;
          const normalizedServerAnswers =
            serverAnswersRaw &&
            typeof serverAnswersRaw === 'object' &&
            !Array.isArray(serverAnswersRaw)
              ? Object.fromEntries(
                  Object.entries(serverAnswersRaw).map(([k, v]) => [String(k), v])
                )
              : {};
          const serverAnswerCount = Object.keys(normalizedServerAnswers).length;
          const authoritativeResult: ExamResult = {
            attemptNumber:
              Number(serverResult.attemptNumber) >= 1
                ? Number(serverResult.attemptNumber)
                : undefined,
            examId: String(serverResult.examId || result.examId),
            examTitle: String(serverResult.examTitle || result.examTitle),
            totalQuestions: Number(serverResult.totalQuestions ?? result.totalQuestions),
            correctAnswers: Number(serverResult.correctAnswers ?? result.correctAnswers),
            wrongAnswers: Number(serverResult.wrongAnswers ?? result.wrongAnswers),
            unattempted: Number(serverResult.unattempted ?? result.unattempted),
            totalMarks: Number(serverResult.totalMarks ?? result.totalMarks),
            obtainedMarks: Number(serverResult.obtainedMarks ?? result.obtainedMarks),
            percentage: Number(serverResult.percentage ?? result.percentage),
            timeTaken: Number(serverResult.timeTaken ?? result.timeTaken),
            subjectWiseScore: serverResult.subjectWiseScore || result.subjectWiseScore,
            // If backend returns an empty/non-plain answers map immediately after save,
            // keep local in-memory answers so question review does not show "Not attempted".
            answers: serverAnswerCount > 0 || localAnswerCount === 0
              ? normalizedServerAnswers
              : result.answers,
            questionTimings: result.questionTimings,
            questions: Array.isArray(serverResult.questions) && serverResult.questions.length > 0
              ? serverResult.questions
              : result.questions
          };
          try {
            onComplete(authoritativeResult);
          } catch (completeError) {
            console.error('Authoritative completion transition failed:', completeError);
          }
        }
      } catch (error) {
        console.error('❌ Failed to save result:', error);
      } finally {
        clearTimeout(timeout);
      }
      // Allow graceful manual retry path if user stays on this screen.
      submissionInProgressRef.current = false;
    } catch (error) {
      console.error('❌ Submit crashed before completion:', error);
      const errorText =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error || 'Unknown error');

      if (fallbackResult) {
        console.warn('⚠️ Recovering submit with fallback result:', errorText);
        try {
          onComplete(fallbackResult);
          submissionInProgressRef.current = false;
          return;
        } catch (fallbackError) {
          console.error('❌ Fallback completion failed:', fallbackError);
        }
      }

      setIsSubmitted(false);
      submissionInProgressRef.current = false;
      autoSubmitTriggeredRef.current = false;
      if (autoSubmitTimeoutRef.current !== null) {
        window.clearTimeout(autoSubmitTimeoutRef.current);
        autoSubmitTimeoutRef.current = null;
      }
      alert(`Unable to finish submit right now. ${errorText}`);
    }
  };

  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    const extractAnswerText = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      if (typeof value === 'object') {
        return String(value.text ?? value.label ?? value.value ?? value._id ?? '');
      }
      return String(value);
    };

    const options = Array.isArray(question.options) ? question.options : [];
    const optionMeta = options.map((opt, index) => {
      const text = extractAnswerText(opt).trim();
      return {
        index,
        letter: String.fromCharCode(65 + index),
        text,
        textNorm: text.toLowerCase(),
        id: String((typeof opt === 'object' && opt !== null ? (opt as any)._id : '') || '').trim(),
      };
    });

    const resolveAnswerToken = (value: any): string => {
      const raw = extractAnswerText(value).trim();
      if (!raw) return '';
      const rawNorm = raw.toLowerCase();

      if (question.questionType === 'integer' || optionMeta.length === 0) {
        return rawNorm;
      }

      if (/^-?\d+$/.test(rawNorm)) {
        const n = parseInt(rawNorm, 10);
        if (n >= 0 && n < optionMeta.length) return optionMeta[n].textNorm;
        if (n >= 1 && n <= optionMeta.length) return optionMeta[n - 1].textNorm;
      }

      if (/^[a-z]$/i.test(rawNorm)) {
        const byLetter = optionMeta.find((o) => o.letter.toLowerCase() === rawNorm);
        if (byLetter) return byLetter.textNorm;
      }

      const optionMatch = rawNorm.match(/^option\s*([a-z0-9])$/);
      if (optionMatch) {
        const token = optionMatch[1];
        if (/^\d$/.test(token)) {
          const n = parseInt(token, 10);
          if (n >= 1 && n <= optionMeta.length) return optionMeta[n - 1].textNorm;
          if (n >= 0 && n < optionMeta.length) return optionMeta[n].textNorm;
        }
        if (/^[a-z]$/.test(token)) {
          const byLetter = optionMeta.find((o) => o.letter.toLowerCase() === token);
          if (byLetter) return byLetter.textNorm;
        }
      }

      const byId = optionMeta.find((o) => o.id && o.id === raw);
      if (byId) return byId.textNorm;

      const byText = optionMeta.find((o) => o.textNorm && o.textNorm === rawNorm);
      if (byText) return byText.textNorm;

      return rawNorm;
    };

    const resolveAnswerList = (value: any): string[] => {
      const list = Array.isArray(value) ? value : [value];
      return list.map((v) => resolveAnswerToken(v)).filter(Boolean);
    };

    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return false;
    }

    if (question.questionType === 'integer') {
      if (question.correctAnswer === undefined || question.correctAnswer === null) {
        return false;
      }
      const userResolved = resolveAnswerToken(userAnswer);
      const correctResolved = resolveAnswerToken(question.correctAnswer);
      const userNum = Number(userResolved);
      const correctNum = Number(correctResolved);
      if (Number.isFinite(userNum) && Number.isFinite(correctNum)) {
        return userNum === correctNum;
      }
      return userResolved === correctResolved;
    }

    if (question.questionType === 'mcq') {
      const correctAnswer = Array.isArray(question.correctAnswer)
        ? resolveAnswerToken(question.correctAnswer[0])
        : resolveAnswerToken(question.correctAnswer);
      return resolveAnswerToken(userAnswer) === correctAnswer;
    }

    if (question.questionType === 'multiple') {
      const correctAnswerStrings = resolveAnswerList(question.correctAnswer);
      const userAnswerStrings = resolveAnswerList(userAnswer);
      
      if (userAnswerStrings.length !== correctAnswerStrings.length) {
        return false;
      }
      
      return correctAnswerStrings.every((answer) => userAnswerStrings.includes(answer));
    }

    return false;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const normalizeExamText = (value: unknown, subject?: string): string =>
    normalizeAndFormatExamDisplayText(value, subject);

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

  if (isError) {
    const errorMessage = (error as any)?.message || 'Exam not available';
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{errorMessage}</p>
          <Button onClick={onExit} className="mt-4">Go Back</Button>
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
  const currentQid = answerKey(currentQuestion);
  const currentAnswerRaw = answers[currentQid];
  const currentQuestionHasAnswer = isAnswerProvidedForQuestion(currentQuestion, currentAnswerRaw);
  const answeredQuestionCount = exam.questions.filter((q: Question) =>
    isAnswerProvidedForQuestion(q, answers[answerKey(q)])
  ).length;
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 border-2 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <span>Warning: Fullscreen Exit Detected</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-lg font-bold text-red-700 text-center mb-2">
                    Attempt {exitAttempts} of {MAX_EXIT_ATTEMPTS}
                  </p>
                  <p className="text-sm text-red-600 text-center">
                    {exitAttempts >= MAX_EXIT_ATTEMPTS 
                      ? 'Maximum exit attempts reached. Exam will be auto-submitted.'
                      : `You have ${MAX_EXIT_ATTEMPTS - exitAttempts} attempt(s) remaining before auto-submission.`
                    }
                  </p>
                </div>
                <p className="text-gray-600 text-sm">
                  Please stay in fullscreen mode during the exam. Exiting fullscreen multiple times will result in automatic submission.
                </p>
                {exitAttempts >= MAX_EXIT_ATTEMPTS ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800 font-bold">
                        Maximum Exit Attempts Reached
                      </p>
                    </div>
                    <p className="text-sm text-red-700 font-semibold">
                      ⚠️ Your exam is being automatically submitted now...
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      <span className="text-xs text-red-600">Submitting...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={enterFullscreen}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    >
                      Return to Fullscreen Mode
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Click the button above to continue your exam in fullscreen mode
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Re-enter Fullscreen Prompt (Non-blocking) */}
      {showReenterPrompt && !showExitWarning && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <Card className="border-2 border-yellow-400 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    Exit Attempt: {exitAttempts}/{MAX_EXIT_ATTEMPTS}
                  </p>
                  <p className="text-xs text-gray-600">
                    Return to fullscreen to continue your exam
                  </p>
                </div>
                <Button
                  onClick={enterFullscreen}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Re-enter Fullscreen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            {exitAttempts > 0 && (
              <div className="mt-2 text-xs text-center">
                <span className={`font-semibold ${exitAttempts >= MAX_EXIT_ATTEMPTS ? 'text-red-600' : 'text-yellow-600'}`}>
                  Exit Attempts: {exitAttempts}/{MAX_EXIT_ATTEMPTS}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Question Navigation Sidebar - Modern Grid Layout */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Questions
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {answeredQuestionCount} of {exam.questions.length} answered
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Question Numbers Grid - 5 columns, 5-6 rows */}
                <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl p-4 border border-gray-200">
                  <div className="grid grid-cols-5 gap-2.5">
                    {exam.questions.map((_: Question, index: number) => {
                      const q = exam.questions[index];
                      const isAnswered = isAnswerProvidedForQuestion(q, answers[answerKey(q)]);
                      const isFlagged = flaggedQuestions.has(index);
                      const isCurrent = index === currentQuestionIndex;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => animateToQuestion(index)}
                          disabled={isAnimating}
                          className={`
                            group relative
                            w-11 h-11 rounded-xl font-bold text-sm
                            transition-all duration-300 ease-out
                            flex items-center justify-center
                            border-2
                            disabled:cursor-not-allowed disabled:opacity-50
                            ${
                              isCurrent
                                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-purple-400 shadow-xl shadow-purple-500/50 scale-110 z-10 ring-2 ring-purple-300'
                                : isFlagged && isAnswered
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-300 shadow-lg shadow-amber-400/30 hover:scale-105'
                                : isFlagged
                                ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 text-yellow-900 border-yellow-400 shadow-md hover:scale-105'
                                : isAnswered
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-400/30 hover:scale-105'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md'
                            }
                          `}
                          title={`Question ${index + 1}${isFlagged ? ' ⚑ Flagged' : ''}${isAnswered ? ' ✓ Answered' : ' ○ Not answered'}`}
                        >
                          <span className="relative z-10">{index + 1}</span>
                          {isFlagged && (
                            <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-800 drop-shadow-sm" fill="currentColor" />
                          )}
                          {isAnswered && !isFlagged && (
                            <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-white bg-emerald-600 rounded-full" />
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
                      <span className="text-xs text-gray-600">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-400 border-2 border-yellow-400 relative">
                        <Flag className="absolute -top-0.5 -right-0.5 w-2 h-2 text-yellow-900" fill="currentColor" />
                      </div>
                      <span className="text-xs text-gray-600">Flagged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-lg bg-white border-2 border-gray-300"></div>
                      <span className="text-xs text-gray-600">Not Answered</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
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
                          {normalizeExamText(currentQuestion.questionText, currentQuestion.subject)}
                        </p>
                      )}
                      
                      {currentQuestion.questionImage && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-2">
                          <img 
                            src={currentQuestion.questionImage.startsWith('http') 
                              ? currentQuestion.questionImage 
                              : `${API_BASE_URL}${currentQuestion.questionImage}`}
                            alt="Question" 
                            className="mx-auto max-h-[420px] w-auto max-w-full object-contain rounded-lg"
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
                      key={`mcq-${currentQid}-${mcqRadioNonce}`}
                      value={
                        currentAnswerRaw !== undefined && String(currentAnswerRaw).trim() !== ''
                          ? String(currentAnswerRaw)
                          : undefined
                      }
                      onValueChange={(value) => handleAnswerChange(currentQid, value)}
                      className="space-y-3 mt-4"
                    >
                      {currentQuestion.options.map((option: string | { text: string; isCorrect?: boolean; _id?: string }, index: number) => {
                        const optionTextRaw = typeof option === 'string' ? option : option.text || option._id || JSON.stringify(option);
                        const optionText = normalizeExamText(optionTextRaw, currentQuestion.subject);
                        const optionValue = typeof option === 'string' ? option : option.text || option._id || '';
                        const optionValueStr = String(optionValue ?? '');
                        
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${
                              selectedAnswer === optionValueStr && showAnswerFeedback
                                ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <RadioGroupItem 
                              value={optionValueStr} 
                              id={`mcq-${currentQid}-opt-${index}`}
                              className="transition-all duration-200 hover:scale-110"
                            />
                            <Label 
                              htmlFor={`mcq-${currentQid}-opt-${index}`} 
                              className={`text-sm cursor-pointer flex-1 transition-all duration-200 ${
                                selectedAnswer === optionValueStr && showAnswerFeedback
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
                      {currentQuestion.options.map((option: string | { text: string; isCorrect?: boolean; _id?: string }, index: number) => {
                        const optionTextRaw = typeof option === 'string' ? option : option.text || option._id || JSON.stringify(option);
                        const optionText = normalizeExamText(optionTextRaw, currentQuestion.subject);
                        const optionValue = typeof option === 'string' ? option : option.text || option._id || '';
                        const userAnswers = answers[currentQid] || [];
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
                                const currentAnswers = answers[currentQid] || [];
                                const newAnswers = checked
                                  ? [...currentAnswers, optionValue]
                                  : currentAnswers.filter((ans: any) => ans !== optionValue);
                                if (newAnswers.length === 0) {
                                  setAnswers((prev) => {
                                    const next = { ...prev };
                                    delete next[currentQid];
                                    return next;
                                  });
                                } else {
                                  handleAnswerChange(currentQid, newAnswers);
                                }
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
                        value={
                          answers[currentQid] !== undefined &&
                          answers[currentQid] !== null &&
                          String(answers[currentQid]).trim() !== ''
                            ? String(answers[currentQid])
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || String(v).trim() === '') {
                            setAnswers((prev) => {
                              const next = { ...prev };
                              delete next[currentQid];
                              return next;
                            });
                            return;
                          }
                          handleAnswerChange(currentQid, v);
                        }}
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
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="justify-self-start">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isAnimating}
              className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span>Previous</span>
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearCurrentAnswer}
            disabled={!currentQuestionHasAnswer || isAnimating}
            className="justify-self-center text-gray-700 disabled:opacity-50"
          >
            Clear
          </Button>
          <div className="justify-self-end">
            {isLastQuestion ? (
              <Button
                onClick={() => setShowWarning(true)}
                disabled={isAnimating}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit</span>
                <CheckCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={isAnimating}
                className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </div>
          </div>
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
