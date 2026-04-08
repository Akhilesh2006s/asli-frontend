import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, TrendingUp, BarChart3, Medal, Crown } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

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
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const sortedRankings = useMemo(
    () =>
      [...rankings].sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.percentage - a.percentage;
      }),
    [rankings]
  );

  const topThree = sortedRankings.slice(0, 3);
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

      {sortedRankings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exam results found. Complete an exam to see your rankings.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topThree.map((ranking, idx) => {
              const percentileBadge = getPercentileBadge(ranking.percentile);
              const Icon = idx === 0 ? Crown : idx === 1 ? Medal : Award;
              const iconColor = idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : 'text-orange-500';
              return (
                <Card key={ranking.examId || idx} className="border-0 bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold leading-snug truncate">
                          {ranking.examTitle || 'Exam'}
                        </CardTitle>
                        <p className="text-xs text-white/80 mt-1">Top attempt #{idx + 1}</p>
                      </div>
                      <Icon className={`h-5 w-5 ${iconColor} bg-white rounded-full p-0.5`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">#{ranking.rank}</p>
                      <Badge className={`${percentileBadge.color} border-0`}>{percentileBadge.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-white/15 p-2">
                        <p className="text-white/80 text-xs">Score</p>
                        <p className="font-semibold">{ranking.percentage.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-lg bg-white/15 p-2">
                        <p className="text-white/80 text-xs">Percentile</p>
                        <p className="font-semibold">{ranking.percentile}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedRankings.map((ranking, idx) => {
                const badge = getPercentileBadge(ranking.percentile);
                return (
                  <div
                    key={`${ranking.examId}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{ranking.examTitle || 'Exam'}</p>
                      <p className="text-xs text-gray-500">
                        {ranking.obtainedMarks}/{ranking.totalMarks} marks • {new Date(ranking.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-100 text-indigo-800 border-0">Rank #{ranking.rank}/{ranking.totalStudents}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 border-0">{ranking.percentage.toFixed(1)}%</Badge>
                      <Badge className={`${badge.color} border-0`}>P{ranking.percentile}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* Overall Statistics */}
      {sortedRankings.length > 0 && (
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
                  {Math.round(sortedRankings.reduce((sum, r) => sum + r.percentile, 0) / sortedRankings.length)}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Exams Completed</p>
                <p className="text-3xl font-bold text-purple-900">{sortedRankings.length}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-purple-900">
                  {(sortedRankings.reduce((sum, r) => sum + r.percentage, 0) / sortedRankings.length).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

