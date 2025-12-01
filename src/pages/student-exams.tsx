import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navigation from '@/components/navigation';
import { 
  Clock, 
  BookOpen, 
  Trophy, 
  Calendar,
  Play,
  CheckCircle,
  AlertCircle,
  Target,
  Award,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AnimatedExam from '@/components/animated-exam';
import ExamResults from '@/components/exam-results';
import StudentRanking from '@/components/student/student-ranking';
import { API_BASE_URL } from '@/lib/api-config';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function StudentExams() {
  const isMobile = useIsMobile();
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('available');

  // Helper function to extract examId from result (handles both populated object and ObjectId)
  const getExamIdFromResult = (result: any): string | null => {
    if (!result || !result.examId) return null;
    
    // If examId is populated, it's an object, use _id
    if (typeof result.examId === 'object' && result.examId._id) {
      return result.examId._id.toString();
    }
    // If examId is just the ObjectId, convert to string
    return result.examId.toString();
  };

  // Reset states when component mounts
  useEffect(() => {
    console.log('🚀 Student Exams: Component mounted, resetting states');
    setCurrentExam(null);
    setExamResult(null);
    setIsTakingExam(false);
  }, []);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Student Exams: Starting authentication check...');
        const token = localStorage.getItem('authToken');
        console.log('🔍 Student Exams: Token found:', !!token);
        if (!token) {
          console.log('❌ Student Exams: No auth token found - redirecting to signin');
          console.log('⏳ Student Exams: Waiting 3 seconds before redirect to see debug messages...');
          setTimeout(() => {
            setLocation('/signin');
          }, 3000);
          return;
        }

        console.log('🔍 Student Exams: Making auth request to backend...');
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        console.log('🔍 Student Exams: Auth response status:', response.status);
        console.log('🔍 Student Exams: Auth response ok:', response.ok);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log('🔍 Student Exams: Content-Type:', contentType);
          if (contentType && contentType.includes('application/json')) {
            const userData = await response.json();
            console.log('✅ Student Exams: User authenticated successfully:', userData.user?.email);
            setUser(userData.user);
            setIsAuthenticated(true);
          } else {
            console.log('❌ Student Exams: Invalid content type - redirecting to login');
            console.log('⏳ Student Exams: Waiting 3 seconds before redirect to see debug messages...');
            setTimeout(() => {
              setLocation('/signin');
            }, 3000);
          }
        } else {
          console.log('❌ Student Exams: Auth failed with status', response.status, '- redirecting to login');
          console.log('⏳ Student Exams: Waiting 3 seconds before redirect to see debug messages...');
          setTimeout(() => {
            setLocation('/signin');
          }, 3000);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Allow access with fallback authentication
        setIsAuthenticated(true);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  // Fetch available exams
  const { data: examsData, isLoading, error } = useQuery({
    queryKey: ['/api/student/exams'],
    queryFn: async () => {
      console.log('🔍 Student Exams: Fetching student exams...');
      const token = localStorage.getItem('authToken');
      console.log('🔍 Student Exams: Token for exams API:', !!token);
      const response = await fetch(`${API_BASE_URL}/api/student/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      console.log('🔍 Student Exams: Exams API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch exams:', errorText);
        // Return empty array instead of object
        return [];
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Fetched exams:', data);
        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data.data && Array.isArray(data.data)) {
          return data.data;
        } else if (data.exams && Array.isArray(data.exams)) {
          return data.exams;
        } else {
          console.warn('Unexpected exams response format:', data);
          return [];
        }
      } else {
        console.warn('Exams response is not JSON, using fallback data');
        return [];
      }
    },
    enabled: isAuthenticated // Only run when authenticated
  });

  // Ensure exams is always an array
  const exams = Array.isArray(examsData) ? examsData : [];

  // Fetch assessments
  const { data: assessments, isLoading: isLoadingAssessments, error: assessmentsError } = useQuery({
    queryKey: ['/api/assessments'],
    queryFn: async () => {
      console.log('🔍 Student Exams: Fetching assessments...');
      const token = localStorage.getItem('authToken');
      console.log('🔍 Student Exams: Token for assessments API:', !!token);
      const response = await fetch(`${API_BASE_URL}/api/assessments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      console.log('🔍 Student Exams: Assessments API response status:', response.status);
      if (!response.ok) {
        console.warn('Assessments API failed, using fallback data');
        return { assessments: [] };
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Fetched assessments:', data);
        return data;
      } else {
        console.warn('Assessments response is not JSON, using fallback data');
        return { assessments: [] };
      }
    }
  });

  // Fetch exam results
  const { data: results, refetch: refetchResults } = useQuery({
    queryKey: ['/api/student/exam-results'],
    queryFn: async () => {
      console.log('🔍 Student Exams: Fetching exam results...');
      const token = localStorage.getItem('authToken');
      console.log('🔍 Student Exams: Token for results API:', !!token);
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      console.log('🔍 Student Exams: Results API response status:', response.status);
      if (!response.ok) {
        console.log('❌ Student Exams: Results API failed with status:', response.status);
        throw new Error('Failed to fetch results');
      }
      const data = await response.json();
      console.log('✅ Student Exams: Fetched exam results:', {
        count: data.data?.length || 0,
        results: data.data?.map((r: any) => ({
          examId: getExamIdFromResult(r),
          examTitle: r.examTitle || r.examId?.title,
          percentage: r.percentage
        })) || []
      });
      return data;
    },
    enabled: isAuthenticated, // Only run when authenticated
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const handleStartExam = (exam: Exam) => {
    console.log('Starting exam:', exam);
    console.log('Current exam result state:', examResult);
    console.log('Current taking exam state:', isTakingExam);
    
    // Check if student has already attempted this exam
    const hasAttempted = results?.data?.some((result: any) => {
      const resultExamId = getExamIdFromResult(result);
      const examId = exam._id?.toString();
      return resultExamId === examId;
    });
    
    if (hasAttempted) {
      alert('You have already attempted this exam. Please check the "Attempted Exams" tab to view your results.');
      return;
    }
    
    // Reset all states when starting a new exam
    setExamResult(null);
    setCurrentExam(exam);
    setIsTakingExam(true);
  };

  const handleExamComplete = async (result: ExamResult) => {
    setExamResult(result);
    setIsTakingExam(false);
    
    // Invalidate and refetch exam results to update the UI
    console.log('🔄 Invalidating exam results query after exam completion');
    console.log('📋 Exam result data:', result);
    
    // Wait a bit for the backend to save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Invalidate and refetch exam results
    await queryClient.invalidateQueries({ queryKey: ['/api/student/exam-results'] });
    
    // Also refetch exams to ensure the list is updated
    await queryClient.invalidateQueries({ queryKey: ['/api/student/exams'] });
    
    // Force refetch manually as well
    await refetchResults();
    await queryClient.refetchQueries({ queryKey: ['/api/student/exams'] });
    
    console.log('✅ Exam results query invalidated and refetched - attempted exams should update');
    console.log('📋 Current results after refetch:', results?.data?.length || 0);
    
    // Switch to attempted exams tab after a brief delay to show the completed exam
    setTimeout(() => {
      setActiveTab('attempted');
      console.log('🔄 Switched to attempted exams tab');
    }, 1000);
  };

  const handleExitExam = () => {
    setCurrentExam(null);
    setIsTakingExam(false);
  };

  const handleRetakeExam = () => {
    // Retaking is now disabled - exams can only be taken once
    alert('Exams can only be attempted once. Please check your results in the "Attempted Exams" tab.');
  };

  const handleBackToExams = () => {
    setCurrentExam(null);
    setExamResult(null);
    setIsTakingExam(false);
    
    // Refresh exam results to show the newly completed exam
    queryClient.invalidateQueries({ queryKey: ['/api/student/exam-results'] });
    queryClient.refetchQueries({ queryKey: ['/api/student/exam-results'] });
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-blue-100 text-blue-700';
      case 'weekend': return 'bg-green-100 text-green-700';
      case 'practice': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-700' };
    if (now > endDate) return { status: 'ended', color: 'bg-red-100 text-red-700' };
    return { status: 'active', color: 'bg-green-100 text-green-700' };
  };

  // Debug state
  console.log('Render state:', {
    isTakingExam,
    currentExam: currentExam ? currentExam._id : null,
    examResult: examResult ? 'exists' : null,
    isLoadingAuth,
    isAuthenticated
  });

  if (isTakingExam && currentExam) {
    console.log('Rendering AnimatedExam component');
    return (
      <AnimatedExam 
        examId={currentExam._id}
        onComplete={handleExamComplete}
        onExit={handleExitExam}
      />
    );
  }

  if (examResult && currentExam) {
    console.log('Rendering ExamResults component');
    return (
      <ExamResults
        result={examResult}
        examTitle={currentExam.title}
        onRetake={handleRetakeExam}
        onViewAnalysis={() => {}}
        onBack={handleBackToExams}
      />
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to access exams</p>
          <button 
            onClick={() => setLocation('/signin')} 
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Exams</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50">
      <Navigation />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 relative">
        
        {/* Robot GIF - Fixed at Bottom Left */}
        {!isMobile && (
          <div 
            className="fixed bottom-8 left-4 z-30 cursor-pointer"
            onClick={() => setLocation('/ai-tutor')}
          >
            <img 
              src="/ROBOT.gif" 
              alt="Robot - Click to chat with Vidya AI" 
              className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
            />
          </div>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent mb-2">Exams</h1>
          <p className="text-gray-600">Take practice exams and track your progress</p>
          
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="available">Available Exams</TabsTrigger>
            <TabsTrigger value="attempted">Attempted Exams</TabsTrigger>
            <TabsTrigger value="ranking">My Rankings</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          {/* Available Exams */}
          <TabsContent value="available" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.filter((exam: Exam) => {
                // Show ALL exams - no date restrictions, no board restrictions
                // Only filter out exams that have been attempted
                const hasAttempted = results?.data?.some((result: any) => {
                  const resultExamId = getExamIdFromResult(result);
                  const examId = exam._id?.toString();
                  
                  const isMatch = resultExamId === examId;
                  if (isMatch) {
                    console.log('✅ Match found:', {
                      examTitle: exam.title,
                      resultExamId,
                      examId,
                      resultExamIdType: typeof resultExamId,
                      examIdType: typeof examId
                    });
                  }
                  return isMatch;
                });
                if (hasAttempted) {
                  console.log('⚠️ Exam already attempted:', exam.title);
                }
                // Show all exams that haven't been attempted (no date filtering)
                return !hasAttempted;
              }).map((exam: Exam, index: number) => {
                const status = getExamStatus(exam);
                // Randomly assign one of the three dashboard colors
                const colorSchemes = [
                  { bg: 'from-orange-300 to-orange-400', text: 'text-white', badge: 'bg-orange-500/20 text-orange-100' },
                  { bg: 'from-sky-300 to-sky-400', text: 'text-white', badge: 'bg-sky-500/20 text-sky-100' },
                  { bg: 'from-teal-400 to-teal-500', text: 'text-white', badge: 'bg-teal-500/20 text-teal-100' }
                ];
                const colorScheme = colorSchemes[index % 3];
                
                return (
                  <Card key={exam._id} className={`bg-gradient-to-br ${colorScheme.bg} border-0 hover:shadow-xl transition-all duration-300`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 text-gray-900">{exam.title}</CardTitle>
                          {exam.description && (
                            <p className={`text-sm ${colorScheme.text}/90 mb-3 line-clamp-2`}>{exam.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={`${colorScheme.badge} border-0`}>
                              {exam.examType.toUpperCase()}
                            </Badge>
                            {status.status === 'ended' ? (
                              <Badge className="bg-red-600 text-white border-2 border-white/50 shadow-lg font-semibold">ENDED</Badge>
                            ) : status.status === 'active' ? (
                              <Badge className="bg-teal-600 text-white border-2 border-white/50 shadow-lg font-semibold">ACTIVE</Badge>
                            ) : (
                              <Badge className="bg-yellow-600 text-white border-2 border-white/50 shadow-lg font-semibold">UPCOMING</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`space-y-2 text-sm ${colorScheme.text} mb-4`}>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2" />
                          <span>{exam.totalQuestions} questions • {exam.totalMarks} marks</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-xs">
                            {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => handleStartExam(exam)}
                        className="w-full bg-white/90 text-gray-900 border-white/30 hover:bg-white hover:text-gray-900 shadow-lg"
                        disabled={status.status === 'ended'}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {status.status === 'active' ? 'Start Exam' : status.status === 'upcoming' ? 'Start Exam (Upcoming)' : 'Start Exam'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {exams.filter((exam: Exam) => {
              // Show ALL exams - no date restrictions
              // Only filter out exams that have been attempted
              const hasAttempted = results?.data?.some((result: any) => {
                const resultExamId = getExamIdFromResult(result);
                const examId = exam._id?.toString();
                return resultExamId === examId;
              });
              // Show all exams that haven't been attempted (no date filtering)
              return !hasAttempted;
            }).length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Exams</h3>
                <p className="text-gray-600">All available exams have been attempted or check back later for new exams</p>
              </div>
            )}
          </TabsContent>

          {/* Attempted Exams */}
          <TabsContent value="attempted" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.filter((exam: Exam) => {
                // Show exams that have been attempted
                return results?.data?.some((result: any) => {
                  const resultExamId = getExamIdFromResult(result);
                  const examId = exam._id?.toString();
                  return resultExamId === examId;
                });
              }).map((exam: Exam, index: number) => {
                const result = results?.data?.find((r: any) => {
                  const resultExamId = getExamIdFromResult(r);
                  const examId = exam._id?.toString();
                  return resultExamId === examId;
                });
                if (!result) return null;
                
                // Randomly assign one of the three dashboard colors
                const colorSchemes = [
                  { bg: 'from-orange-300 to-orange-400', text: 'text-white', badge: 'bg-orange-500/20 text-orange-100' },
                  { bg: 'from-sky-300 to-sky-400', text: 'text-white', badge: 'bg-sky-500/20 text-sky-100' },
                  { bg: 'from-teal-400 to-teal-500', text: 'text-white', badge: 'bg-teal-500/20 text-teal-100' }
                ];
                const colorScheme = colorSchemes[index % 3];
                
                return (
                  <Card key={exam._id} className={`bg-gradient-to-br ${colorScheme.bg} border-0 hover:shadow-xl transition-all duration-300`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 text-gray-900">{exam.title}</CardTitle>
                          {exam.description && (
                            <p className={`text-sm ${colorScheme.text}/90 mb-3 line-clamp-2`}>{exam.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={`${colorScheme.badge} border-0`}>
                              {exam.examType.toUpperCase()}
                            </Badge>
                            <Badge className="bg-teal-600 text-white border-2 border-white/50 shadow-lg font-semibold">
                              Attempted
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Score Display */}
                        <div className="text-center p-4 bg-white/90 rounded-lg">
                          <div className="text-3xl font-bold text-gray-900 mb-1">
                            {result.percentage?.toFixed(1) || '0'}%
                          </div>
                          <div className={`text-sm ${colorScheme.text}/90`}>
                            {result.obtainedMarks || 0}/{result.totalMarks || exam.totalMarks} marks
                          </div>
                        </div>

                        {/* Performance Breakdown */}
                        <div className={`space-y-2 text-sm ${colorScheme.text}`}>
                          <div className="flex items-center justify-between">
                            <span>Correct Answers</span>
                            <span className="font-medium">{result.correctAnswers || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Wrong Answers</span>
                            <span className="font-medium">{result.wrongAnswers || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Unattempted</span>
                            <span className="font-medium">{result.unattempted || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Time Taken</span>
                            <span className="font-medium">
                              {result.timeTaken ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Grade Badge */}
                        <div className="text-center">
                          <Badge className={
                            (result.percentage || 0) >= 70 ? 'bg-green-600 text-white border-2 border-white/50 shadow-lg font-semibold' :
                            (result.percentage || 0) >= 50 ? 'bg-yellow-600 text-white border-2 border-white/50 shadow-lg font-semibold' :
                            'bg-red-600 text-white border-2 border-white/50 shadow-lg font-semibold'
                          }>
                            {(result.percentage || 0) >= 70 ? 'Excellent' :
                             (result.percentage || 0) >= 50 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>

                        {/* View Details Button */}
                        <Button 
                          variant="outline" 
                          className="w-full bg-white/90 text-gray-900 border-white/30 hover:bg-white hover:text-gray-900"
                          onClick={async () => {
                            console.log('📋 Viewing details for exam:', exam.title);
                            console.log('📋 Exam result:', result);
                            
                            // Ensure exam has questions loaded
                            let examWithQuestions = exam;
                            if (!exam.questions || exam.questions.length === 0) {
                              try {
                                const token = localStorage.getItem('authToken');
                                const response = await fetch(`${API_BASE_URL}/api/student/exams/${exam._id}`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                  }
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  examWithQuestions = data.data || exam;
                                  console.log('✅ Loaded exam with questions:', examWithQuestions.questions?.length || 0);
                                }
                              } catch (error) {
                                console.error('❌ Failed to load exam questions:', error);
                              }
                            }
                            
                            // Format the result to match ExamResult interface
                            const formattedResult: ExamResult = {
                              examId: getExamIdFromResult(result) || exam._id,
                              examTitle: result.examTitle || exam.title,
                              totalQuestions: result.totalQuestions || exam.totalQuestions || 0,
                              correctAnswers: result.correctAnswers || 0,
                              wrongAnswers: result.wrongAnswers || 0,
                              unattempted: result.unattempted || 0,
                              totalMarks: result.totalMarks || exam.totalMarks || 0,
                              obtainedMarks: result.obtainedMarks || 0,
                              percentage: result.percentage || 0,
                              timeTaken: result.timeTaken || 0,
                              subjectWiseScore: result.subjectWiseScore || {
                                maths: { correct: 0, total: 0, marks: 0 },
                                physics: { correct: 0, total: 0, marks: 0 },
                                chemistry: { correct: 0, total: 0, marks: 0 }
                              },
                              answers: result.answers || {},
                              questions: examWithQuestions.questions || []
                            };
                            
                            // Set the exam and result to show the detailed view
                            setCurrentExam(examWithQuestions);
                            setExamResult(formattedResult);
                            setIsTakingExam(false);
                            
                            // Scroll to top to show the results
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {exams.filter((exam: Exam) => {
              return results?.data?.some((result: any) => {
                const resultExamId = getExamIdFromResult(result);
                const examId = exam._id?.toString();
                return resultExamId === examId;
              });
            }).length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Attempted Exams</h3>
                <p className="text-gray-600">Start taking exams to see your results here</p>
              </div>
            )}
          </TabsContent>



          {/* Student Rankings */}
          <TabsContent value="ranking" className="space-y-6">
            <StudentRanking />
          </TabsContent>

          {/* Upcoming Exams */}
          <TabsContent value="upcoming" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.filter((exam: Exam) => getExamStatus(exam).status === 'upcoming').map((exam: Exam, index: number) => {
                // Randomly assign one of the three dashboard colors
                const colorSchemes = [
                  { bg: 'from-orange-300 to-orange-400', text: 'text-white', badge: 'bg-orange-500/20 text-orange-100' },
                  { bg: 'from-sky-300 to-sky-400', text: 'text-white', badge: 'bg-sky-500/20 text-sky-100' },
                  { bg: 'from-teal-400 to-teal-500', text: 'text-white', badge: 'bg-teal-500/20 text-teal-100' }
                ];
                const colorScheme = colorSchemes[index % 3];
                
                return (
                  <Card key={exam._id} className={`bg-gradient-to-br ${colorScheme.bg} border-0 hover:shadow-xl transition-all duration-300`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 text-gray-900">{exam.title}</CardTitle>
                          {exam.description && (
                            <p className={`text-sm ${colorScheme.text}/90 mb-3 line-clamp-2`}>{exam.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={`${colorScheme.badge} border-0`}>
                              {exam.examType.toUpperCase()}
                            </Badge>
                            <Badge className="bg-yellow-600 text-white border-2 border-white/50 shadow-lg font-semibold">
                              UPCOMING
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={`space-y-2 text-sm ${colorScheme.text} mb-4`}>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2" />
                          <span>{exam.totalQuestions} questions • {exam.totalMarks} marks</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-xs">
                            Starts: {new Date(exam.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-xs">
                            Ends: {new Date(exam.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full bg-white/90 text-gray-900 border-white/30 hover:bg-white hover:text-gray-900"
                        disabled
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Not Yet Available
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {exams.filter((exam: Exam) => getExamStatus(exam).status === 'upcoming').length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Exams</h3>
                <p className="text-gray-600">Check back later for scheduled exams</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
