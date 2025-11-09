import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Award, Download } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

interface BoardAnalytics {
  board: string;
  students: number;
  exams: number;
  totalAttempts: number;
  averageScore: string;
  participationRate: string;
}

export default function BoardComparisonCharts() {
  const [analytics, setAnalytics] = useState<BoardAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBoardAnalytics();
  }, []);

  const fetchBoardAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch all boards analytics using comparison endpoint
      const comparisonResponse = await fetch(`${API_BASE_URL}/api/super-admin/boards/analytics/comparison`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (comparisonResponse.ok) {
        const comparisonData = await comparisonResponse.json();
        if (comparisonData.success && comparisonData.data) {
          const formattedAnalytics = comparisonData.data.map((item: any) => ({
            board: item.boardName || item.board,
            students: item.students || 0,
            exams: item.exams || 0,
            totalAttempts: item.totalAttempts || 0,
            averageScore: item.averageScore || '0.00',
            participationRate: item.participationRate || '0.0'
          }));
          setAnalytics(formattedAnalytics);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: Fetch all boards analytics using dashboard endpoint
      const boards = ['CBSE_AP', 'CBSE_TS', 'STATE_AP', 'STATE_TS'];
      const analyticsPromises = boards.map(async (board) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/super-admin/boards/${board}/dashboard`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            const data = await res.json();
            return { board, data: data.data };
          }
          return { board, data: null };
        } catch (error) {
          console.error(`Error fetching ${board}:`, error);
          return { board, data: null };
        }
      });

      const results = await Promise.all(analyticsPromises);
      
      // Format data for comparison
      const formattedAnalytics = results.map((result) => {
        const boardName = result.board === 'CBSE_AP' ? 'CBSE AP' :
                         result.board === 'CBSE_TS' ? 'CBSE TS' :
                         result.board === 'STATE_AP' ? 'State AP' :
                         'State TS';
        
        if (result.data && result.data.stats) {
          const stats = result.data.stats;
          const participation = result.data.schoolParticipation || [];
          const totalStudents = stats.students || 0;
          const totalAttempts = stats.examResults || 0;
          const participationRate = totalStudents > 0 
            ? ((totalAttempts / (totalStudents * (stats.exams || 1))) * 100).toFixed(1)
            : '0.0';
          
          return {
            board: boardName,
            students: totalStudents,
            exams: stats.exams || 0,
            totalAttempts: totalAttempts,
            averageScore: stats.averageScore || '0.00',
            participationRate: participationRate
          };
        }
        return {
          board: boardName,
          students: 0,
          exams: 0,
          totalAttempts: 0,
          averageScore: '0.00',
          participationRate: '0.0'
        };
      });

      setAnalytics(formattedAnalytics);
    } catch (error) {
      console.error('Failed to fetch board analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxValue = (data: BoardAnalytics[], key: 'students' | 'exams' | 'totalAttempts' | 'averageScore') => {
    if (key === 'averageScore') {
      return Math.max(...data.map(a => parseFloat(a.averageScore)), 100);
    }
    return Math.max(...data.map(a => a[key] as number), 1);
  };

  const renderBarChart = (title: string, dataKey: keyof BoardAnalytics, color: string, maxValue?: number) => {
    const max = maxValue || getMaxValue(analytics, dataKey as any);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              {title}
            </span>
            <Button variant="outline" size="sm" onClick={() => exportChartData(title, dataKey)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.map((item, idx) => {
              const value = item[dataKey];
              const numericValue = typeof value === 'string' ? parseFloat(value) : value as number;
              const percentage = (numericValue / max) * 100;
              
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.board}</span>
                    <span className="font-bold text-gray-900">
                      {typeof value === 'string' ? value : value.toLocaleString()}
                      {dataKey === 'averageScore' && '%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-2 ${color}`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 10 && (
                        <span className="text-xs font-medium text-white">
                          {typeof value === 'string' ? value : value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const exportChartData = (title: string, dataKey: keyof BoardAnalytics) => {
    const headers = ['Board', title];
    const rows = analytics.map(item => [
      item.board,
      item[dataKey]
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_comparison_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Board Performance Comparison</h2>
          <p className="text-gray-600 mt-1">Compare performance across all boards</p>
        </div>
        <Button onClick={fetchBoardAnalytics} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {analytics.map((item, idx) => {
          const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
          const color = colors[idx] || 'bg-gray-500';
          
          return (
            <Card key={idx} className={`border-l-4 ${color.replace('bg-', 'border-')}`}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600 mb-1">{item.board}</p>
                <p className="text-2xl font-bold text-gray-900">{item.students}</p>
                <p className="text-xs text-gray-500">Students</p>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-gray-600">Avg Score: <span className="font-semibold">{item.averageScore}%</span></p>
                  <p className="text-xs text-gray-600">Participation: <span className="font-semibold">{item.participationRate}%</span></p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart('Number of Students', 'students', 'bg-gradient-to-r from-blue-500 to-blue-600')}
        {renderBarChart('Average Score (%)', 'averageScore', 'bg-gradient-to-r from-green-500 to-green-600', 100)}
        {renderBarChart('Total Exam Attempts', 'totalAttempts', 'bg-gradient-to-r from-purple-500 to-purple-600')}
        {renderBarChart('Participation Rate (%)', 'participationRate', 'bg-gradient-to-r from-orange-500 to-orange-600', 100)}
      </div>
    </div>
  );
}

