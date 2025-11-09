import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

interface ExamResult {
  examId: string;
  examTitle: string;
  percentage: number;
  obtainedMarks: number;
  totalMarks: number;
  completedAt: string;
}

interface StudentRanking {
  examId: string;
  examTitle: string;
  rank: number;
  totalStudents: number;
  percentile: number;
  percentage: number;
  obtainedMarks: number;
  totalMarks: number;
  completedAt: string;
}

export default function StudentRanking() {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentRanking();
  }, []);

  const fetchStudentRanking = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Get all rankings from backend
      const rankingsResponse = await fetch(`${API_BASE_URL}/api/student/rankings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json();
        if (rankingsData.success && rankingsData.data) {
          setRankings(rankingsData.data);
          
          // Transform to match exam results format
          const results = rankingsData.data.map((r: any) => ({
            examId: r.examId,
            examTitle: r.examTitle,
            percentage: r.percentage,
            obtainedMarks: r.obtainedMarks,
            totalMarks: r.totalMarks,
            completedAt: r.completedAt
          }));
          setExamResults(results);
        }
      }
    } catch (error) {
      console.error('Failed to fetch student ranking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) return { color: 'bg-yellow-100 text-yellow-800', label: 'Top 10%' };
    if (percentile >= 75) return { color: 'bg-green-100 text-green-800', label: 'Top 25%' };
    if (percentile >= 50) return { color: 'bg-blue-100 text-blue-800', label: 'Top 50%' };
    return { color: 'bg-gray-100 text-gray-800', label: 'Below 50%' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Performance Rankings</h2>
        <p className="text-gray-600 mt-1">Your rank and percentile across all exams</p>
      </div>

      {examResults.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exam results found. Complete an exam to see your rankings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rankings.map((ranking, idx) => {
            const percentileBadge = getPercentileBadge(ranking.percentile);
            
            return (
              <Card key={ranking.examId || idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                      {ranking.examTitle || 'Exam'}
                    </CardTitle>
                    <Badge className={percentileBadge.color}>
                      {percentileBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Your Score</span>
                      <span className="text-2xl font-bold text-gray-900">{ranking.percentage.toFixed(1)}%</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Rank</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">
                          #{ranking.rank}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">out of {ranking.totalStudents}</p>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-gray-600">Percentile</span>
                        </div>
                        <p className="text-xl font-bold text-green-900">
                          {ranking.percentile}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">percentile</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Marks</span>
                        <span className="font-medium">{ranking.obtainedMarks}/{ranking.totalMarks}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium">
                          {new Date(ranking.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Overall Statistics */}
      {rankings.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Overall Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Average Percentile</p>
                <p className="text-3xl font-bold text-purple-900">
                  {Math.round(rankings.reduce((sum, r) => sum + r.percentile, 0) / rankings.length)}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Exams Completed</p>
                <p className="text-3xl font-bold text-purple-900">{rankings.length}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-purple-900">
                  {(rankings.reduce((sum, r) => sum + r.percentage, 0) / rankings.length).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

