import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Brain, Trophy, Target, Award, Zap } from 'lucide-react';
import Navigation from '@/components/navigation';
import { Link } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';

interface SubjectWithQuestions {
  _id: string;
  name: string;
  questionCount: number;
  difficulties: string[];
  score?: number;
  completedAt?: string;
}

export default function IQRankBoostSubjects() {
  const [subjects, setSubjects] = useState<SubjectWithQuestions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentClass, setStudentClass] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentClassAndQuestions();
  }, []);

  const fetchStudentClassAndQuestions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch questions - backend will automatically detect student's class
      const questionsResponse = await fetch(
        `${API_BASE_URL}/api/student/iq-rank-questions`,
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

      let quizResultsMap = new Map<string, { score: number; completedAt: string }>();
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const results = resultsData.data || [];
        results.forEach((result: any) => {
          quizResultsMap.set(result.subjectId, {
            score: result.score,
            completedAt: result.completedAt
          });
        });
      }

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const questions = questionsData.data || questionsData.questions || [];

        // Set class number from response or from first question
        if (questionsData.classNumber) {
          setStudentClass(questionsData.classNumber);
        } else if (questions.length > 0 && questions[0].classNumber) {
          setStudentClass(questions[0].classNumber);
        }

        // Group questions by subject
        const subjectMap = new Map<string, { name: string; questions: any[]; difficulties: Set<string> }>();

        questions.forEach((question: any) => {
          const subjectId = question.subject?._id || question.subject;
          const subjectName = question.subject?.name || 'Unknown Subject';

          if (!subjectId) return; // Skip questions without subject

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              name: subjectName,
              questions: [],
              difficulties: new Set()
            });
          }

          const subjectData = subjectMap.get(subjectId)!;
          subjectData.questions.push(question);
          if (question.difficulty) {
            subjectData.difficulties.add(question.difficulty);
          }
        });

        // Convert to array format and add quiz results
        const subjectsArray: SubjectWithQuestions[] = Array.from(subjectMap.entries()).map(([id, data]) => {
          const result = quizResultsMap.get(id);
          return {
            _id: id,
            name: data.name,
            questionCount: data.questions.length,
            difficulties: Array.from(data.difficulties),
            score: result?.score,
            completedAt: result?.completedAt
          };
        });

        setSubjects(subjectsArray);
      } else {
        const errorData = await questionsResponse.json().catch(() => ({}));
        if (errorData.message && errorData.message.includes('No class assigned')) {
          setStudentClass(null);
        }
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
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
      <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">IQ/Rank Boost Practice</h1>
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
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Questions Available</h3>
                <p className="text-gray-500">
                  {studentClass 
                    ? `No IQ/Rank Boost questions have been generated for Class ${studentClass} yet.`
                    : 'No questions available. Please contact your administrator.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card key={subject._id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {subject.questionCount} {subject.questionCount === 1 ? 'Question' : 'Questions'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <CardDescription>
                      Practice questions to improve your IQ and ranking
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Score Display */}
                    {subject.score !== undefined && (
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5" />
                            <span className="font-semibold">Your Score</span>
                          </div>
                          <span className="text-2xl font-bold">{subject.score}%</span>
                        </div>
                        {subject.completedAt && (
                          <p className="text-xs text-white/80 mt-1">
                            Completed {new Date(subject.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Difficulty Badges */}
                    {subject.difficulties.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Available Difficulties</p>
                        <div className="flex flex-wrap gap-2">
                          {subject.difficulties.map((difficulty, index) => (
                            <Badge
                              key={index}
                              className={`text-xs capitalize ${getDifficultyColor(difficulty)}`}
                            >
                              {difficulty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Start Practice Button */}
                    <Link href={`/iq-rank-boost/quiz/${subject._id}`}>
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white">
                        <Target className="w-4 h-4 mr-2" />
                        {subject.score !== undefined ? 'Retake Quiz' : 'Start Practice'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

