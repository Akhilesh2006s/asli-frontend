import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, BarChart3, Filter, Download, TrendingUp, Users, Clock, Calendar } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

interface Exam {
  _id: string;
  title: string;
  description?: string;
  examType: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy?: {
    fullName: string;
    email: string;
  };
  questions?: any[];
}

interface ExamResult {
  _id: string;
  examId: string;
  examTitle: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    classNumber: string;
  };
  percentage: number;
  obtainedMarks: number;
  totalMarks: number;
  completedAt: string;
}

export default function ExamViewOnly() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [filters, setFilters] = useState({
    classNumber: '',
    subject: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/exams/viewable`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExams(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExamResults = async (examId: string) => {
    setIsLoadingResults(true);
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams();
      queryParams.append('examId', examId);
      if (filters.classNumber) queryParams.append('classNumber', filters.classNumber);
      if (filters.subject) queryParams.append('subject', filters.subject);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/api/admin/exam-results?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExamResults(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exam results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const fetchAnalytics = async (examId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/exams/${examId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleViewExam = async (exam: Exam) => {
    setSelectedExam(exam);
    await Promise.all([
      fetchExamResults(exam._id),
      fetchAnalytics(exam._id)
    ]);
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-purple-100 text-purple-700';
      case 'weekend': return 'bg-green-100 text-green-700';
      case 'practice': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
    if (now > endDate) return { status: 'Ended', color: 'bg-red-100 text-red-700' };
    return { status: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const exportToCSV = () => {
    if (!selectedExam || examResults.length === 0) {
      alert('No results to export');
      return;
    }

    // CSV Headers
    const headers = ['Rank', 'Student Name', 'Email', 'Class', 'Marks Obtained', 'Total Marks', 'Percentage', 'Completed At'];
    
    // Sort results by percentage (descending) for ranking
    const sortedResults = [...examResults].sort((a, b) => b.percentage - a.percentage);
    
    // CSV Data rows
    const rows = sortedResults
      .map((result, idx) => {
        const rank = idx + 1;
        return [
          rank,
          result.userId.fullName,
          result.userId.email,
          result.userId.classNumber,
          result.obtainedMarks,
          result.totalMarks,
          `${result.percentage.toFixed(2)}%`,
          new Date(result.completedAt).toLocaleString()
        ];
      })
      .map(row => row.map(cell => `"${cell}"`).join(','));

    // Combine headers and rows
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedExam.title}_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="p-6">Loading exams...</div>;
  }

  if (selectedExam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setSelectedExam(null)}>
              ← Back to Exams
            </Button>
            <h2 className="text-2xl font-bold mt-4">{selectedExam.title}</h2>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Class</Label>
                <Input
                  placeholder="Class number"
                  value={filters.classNumber}
                  onChange={(e) => setFilters({ ...filters, classNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Subject"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <Button className="mt-4" onClick={() => fetchExamResults(selectedExam._id)}>
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{analytics.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Attempted</p>
                    <p className="text-2xl font-bold">{analytics.attemptedCount}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Not Attempted</p>
                    <p className="text-2xl font-bold">{analytics.notAttemptedCount}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold">{analytics.averageScore}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Performers */}
        {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPerformers.map((performer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-white' :
                        idx === 1 ? 'bg-gray-400 text-white' :
                        idx === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {performer.rank}
                      </div>
                      <div>
                        <p className="font-medium">{performer.studentName}</p>
                        <p className="text-sm text-gray-600">{performer.studentEmail} • Class {performer.classNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{performer.percentage}%</p>
                      <p className="text-sm text-gray-600">{performer.marks}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Student Results</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV()}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingResults ? (
              <div>Loading results...</div>
            ) : examResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Student</th>
                      <th className="text-left py-2 px-4">Class</th>
                      <th className="text-left py-2 px-4">Score</th>
                      <th className="text-left py-2 px-4">Percentage</th>
                      <th className="text-left py-2 px-4">Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((result) => (
                      <tr key={result._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{result.userId.fullName}</p>
                            <p className="text-sm text-gray-600">{result.userId.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{result.userId.classNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{result.obtainedMarks}/{result.totalMarks}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            result.percentage >= 70 ? 'bg-green-100 text-green-800' :
                            result.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {result.percentage}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(result.completedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No results found for this exam.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exams (View Only)</h2>
          <p className="text-gray-600 mt-1">View exams created by Super Admin for your board</p>
        </div>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No exams available. Exams are created by Super Admin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <Card key={exam._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    <Badge className={status.color}>{status.status}</Badge>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-gray-600 mt-2">{exam.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <Badge className={getExamTypeColor(exam.examType)}>
                        {exam.examType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span>{exam.duration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span>{exam.totalQuestions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Marks:</span>
                      <span className="font-medium">{exam.totalMarks}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Start: {new Date(exam.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        End: {new Date(exam.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {exam.createdBy && (
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Created by: {exam.createdBy.fullName}
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => handleViewExam(exam)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Results & Analytics
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

