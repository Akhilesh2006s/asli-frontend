import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Brain, Trophy, Target, Award, Zap } from 'lucide-react';
import Navigation from '@/components/navigation';
import { Link } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject: string | {
    _id: string;
    name: string;
  };
  classNumber: string;
  difficulty: string;
  totalQuestions: number;
  questions: any[];
  isCompleted?: boolean;
  createdAt: string;
}

interface SubjectWithQuizzes {
  _id: string;
  name: string;
  quizzes: Quiz[];
  totalQuizzes: number;
  totalQuestions: number;
  difficulties: string[];
  latestScore?: number;
  latestCompletedAt?: string;
}

export default function IQRankBoostSubjects() {
  const [subjects, setSubjects] = useState<SubjectWithQuizzes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [quizResultsMap, setQuizResultsMap] = useState<Map<string, { score: number; completedAt: string }>>(new Map());

  useEffect(() => {
    fetchStudentClassAndQuizzes();
  }, []);

  const fetchStudentClassAndQuizzes = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch quizzes - backend will automatically detect student's class
      const quizzesResponse = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-quizzes`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch quiz results
      const resultsResponse = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-quiz-results`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const quizResultsMapLocal = new Map<string, { score: number; completedAt: string }>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          const key = result.quizId || result.subjectId;
          if (key) {
            quizResultsMapLocal.set(key.toString(), {
              score: result.score,
              completedAt: result.completedAt
            });
          }
        });
      }
      setQuizResultsMap(quizResultsMapLocal);

      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        const quizzes: Quiz[] = quizzesData.data || quizzesData.quizzes || [];

        // Set class number from response or from first quiz
        if (quizzesData.classNumber) {
          setStudentClass(quizzesData.classNumber);
        } else if (quizzes.length > 0 && quizzes[0].classNumber) {
          setStudentClass(quizzes[0].classNumber);
        }

        // Group quizzes by subject
        const subjectMap = new Map<string, { name: string; quizzes: Quiz[]; difficulties: Set<string> }>();

        quizzes.forEach((quiz: Quiz) => {
          const subjectId = typeof quiz.subject === 'string' ? quiz.subject : quiz.subject?._id;
          const subjectName = typeof quiz.subject === 'string' ? 'Unknown Subject' : (quiz.subject?.name || 'Unknown Subject');

          if (!subjectId) return; // Skip quizzes without subject

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              name: subjectName,
              quizzes: [],
              difficulties: new Set()
            });
          }

          const subjectData = subjectMap.get(subjectId)!;
          subjectData.quizzes.push(quiz);
          if (quiz.difficulty) {
            subjectData.difficulties.add(quiz.difficulty);
          }
        });

        // Convert to array format and add quiz results
        const subjectsArray: SubjectWithQuizzes[] = Array.from(subjectMap.entries()).map(([id, data]) => {
          // Get latest score from any completed quiz in this subject
          let latestScore: number | undefined;
          let latestCompletedAt: string | undefined;
          
          for (const quiz of data.quizzes) {
            const result = quizResultsMap.get(quiz._id);
            if (result) {
              latestScore = result.score;
              latestCompletedAt = result.completedAt;
              break; // Use first completed quiz's score
            }
          }

          const totalQuestions = data.quizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);

          return {
            _id: id,
            name: data.name,
            quizzes: data.quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), // Sort by newest first
            totalQuizzes: data.quizzes.length,
            totalQuestions: totalQuestions,
            difficulties: Array.from(data.difficulties),
            latestScore: latestScore,
            latestCompletedAt: latestCompletedAt
          };
        });

        setSubjects(subjectsArray);
      } else {
        const errorData = await quizzesResponse.json().catch(() => ({}));
        if (errorData.message && errorData.message.includes('No class assigned')) {
          setStudentClass(null);
        }
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-orange-100 text-orange-700';
      case 'expert':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Navigation />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-20 bg-gray-50 min-h-screen">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">IQ/Rank Boost Practice</h1>
                <p className="text-gray-600">
                  {studentClass ? `Practice questions for Class ${studentClass}` : 'Practice questions to boost your IQ and rank'}
                </p>
              </div>
            </div>
          </div>

          {/* Subjects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Quizzes Available</h3>
                <p className="text-gray-500">
                  {studentClass 
                    ? `No IQ/Rank Boost quizzes have been generated for Class ${studentClass} yet.`
                    : 'No quizzes available. Please contact your administrator.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {subjects.map((subject) => (
                <Card key={subject._id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{subject.name}</CardTitle>
                          <CardDescription>
                            {subject.totalQuizzes} {subject.totalQuizzes === 1 ? 'Quiz' : 'Quizzes'} • {subject.totalQuestions} {subject.totalQuestions === 1 ? 'Question' : 'Questions'}
                          </CardDescription>
                        </div>
                      </div>
                      {subject.latestScore !== undefined && (
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5" />
                            <span className="font-semibold">Latest: {subject.latestScore}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {subject.quizzes.map((quiz) => {
                        const quizResult = quizResultsMap.get(quiz._id);
                        const isCompleted = quiz.isCompleted || !!quizResult;
                        
                        return (
                          <Card key={quiz._id} className={`border-l-4 ${isCompleted ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{quiz.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {quiz.totalQuestions} questions • {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)} difficulty
                                  </p>
                                  {quiz.description && (
                                    <p className="text-xs text-gray-500 mt-1">{quiz.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  {isCompleted && quizResult && (
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-green-600">{quizResult.score}%</p>
                                      <p className="text-xs text-gray-500">Completed</p>
                                    </div>
                                  )}
                                  <Link href={`/iq-rank-boost/quiz/${quiz._id}`}>
                                    <Button 
                                      size="sm"
                                      className={isCompleted 
                                        ? "bg-green-500 hover:bg-green-600 text-white" 
                                        : "bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white"
                                      }
                                    >
                                      <Target className="w-4 h-4 mr-2" />
                                      {isCompleted ? 'Retake' : 'Start Quiz'}
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    </>
  );
}

