import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { API_BASE_URL } from "@/lib/api-config";
import { 
  BrainIcon, 
  TrendingUpIcon, 
  AlertTriangleIcon, 
  TargetIcon, 
  ZapIcon, 
  EyeIcon, 
  BarChart3Icon,
  UsersIcon,
  BookOpenIcon,
  AwardIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightbulbIcon,
  RocketIcon,
  ShieldIcon,
  ActivityIcon,
  GaugeIcon,
  BrainCircuitIcon,
  SparklesIcon,
  CpuIcon,
  DatabaseIcon,
  NetworkIcon,
  LayersIcon,
  PieChartIcon,
  LineChartIcon,
  ScatterChartIcon,
  TrophyIcon,
  TrendingDownIcon,
  BookIcon,
  CalculatorIcon,
  ChartBarIcon,
  UserCheckIcon,
  AlertCircleIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetailedAnalytics {
  adminAnalytics: AdminAnalytics[];
  globalAnalytics: GlobalAnalytics;
  aiInsights: AIInsight[];
}

interface AdminAnalytics {
  adminId: string;
  adminName: string;
  adminEmail: string;
  examDifficulty: ExamDifficulty;
  topScorers: TopScorer[];
  performanceDistribution: PerformanceDistribution;
  questionAnalysis: QuestionAnalysis[];
  performanceTrends: PerformanceTrend[];
  subjectAnalysis: SubjectAnalysis[];
  totalStudents: number;
  totalExams: number;
  averageScore: number;
}

interface ExamDifficulty {
  exams: ExamDifficultyItem[];
  overallDifficulty: number;
  hardestExam: ExamDifficultyItem;
  easiestExam: ExamDifficultyItem;
}

interface ExamDifficultyItem {
  examId: string;
  examTitle: string;
  difficulty: string;
  difficultyScore: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  questionCount: number;
}

interface TopScorer {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalExams: number;
  totalScore: number;
  highestScore: number;
  averageScore: number;
  examHistory: ExamHistory[];
}

interface PerformanceDistribution {
  excellent: { range: string; count: number; percentage: number };
  good: { range: string; count: number; percentage: number };
  average: { range: string; count: number; percentage: number };
  belowAverage: { range: string; count: number; percentage: number };
  poor: { range: string; count: number; percentage: number };
  veryPoor: { range: string; count: number; percentage: number };
}

interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  questionType: string;
  subject: string;
  difficultyRate: number;
  correctAnswers: number;
  totalAttempts: number;
  examTitle: string;
  marks: number;
}

interface PerformanceTrend {
  month: string;
  totalExams: number;
  totalScore: number;
  averageScore: number;
  examCount: number;
}

interface SubjectAnalysis {
  subject: string;
  totalExams: number;
  totalScore: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  examCount: number;
}

interface AIInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  category: string;
  data: any;
}

export default function DetailedAIAnalyticsDashboard() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  const fetchDetailedAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/ai/detailed-analytics`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
        toast({
          title: "Detailed Analytics Generated",
          description: "Comprehensive exam analysis completed successfully",
        });
      } else {
        console.error('Failed to fetch detailed analytics:', response.status);
        toast({
          title: "Error",
          description: "Failed to fetch detailed analytics",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Detailed analytics error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch detailed analytics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedAnalytics();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Very Hard': return 'bg-red-100 text-red-800';
      case 'Hard': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Very Easy': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceColor = (range: string) => {
    switch (range) {
      case '90-100%': return 'bg-green-500';
      case '80-89%': return 'bg-blue-500';
      case '70-79%': return 'bg-yellow-500';
      case '60-69%': return 'bg-orange-500';
      case '50-59%': return 'bg-red-500';
      case '0-49%': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CpuIcon className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg font-semibold">Generating Detailed Analytics...</p>
          <p className="text-gray-600">Analyzing exam data and performance patterns</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
        <p className="text-gray-600 mb-4">Click the button below to generate detailed analytics</p>
        <Button onClick={fetchDetailedAnalytics} className="bg-purple-600 hover:bg-purple-700">
          <SparklesIcon className="w-4 h-4 mr-2" />
          Generate Analytics
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="w-8 h-8 mr-3 text-purple-600" />
            Detailed AI Analytics
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive exam analysis with performance insights</p>
        </div>
        <Button 
          onClick={fetchDetailedAnalytics} 
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isLoading ? (
            <>
              <CpuIcon className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4 mr-2" />
              Refresh Analytics
            </>
          )}
        </Button>
      </div>

      {/* Global Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Admins</p>
                <p className="text-3xl font-bold text-blue-900">{analytics.globalAnalytics.totalAdmins}</p>
                <p className="text-sm text-blue-600">Active administrators</p>
              </div>
              <UsersIcon className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Overall Average</p>
                <p className="text-3xl font-bold text-green-900">{analytics.globalAnalytics.overallAverageScore?.toFixed(1) || 'N/A'}%</p>
                <p className="text-sm text-green-600">Platform performance</p>
              </div>
              <TrendingUpIcon className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Exams</p>
                <p className="text-3xl font-bold text-purple-900">{analytics.globalAnalytics.totalExams}</p>
                <p className="text-sm text-purple-600">Conducted</p>
              </div>
              <BookIcon className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Exam Results</p>
                <p className="text-3xl font-bold text-orange-900">{analytics.globalAnalytics.totalExamResults}</p>
                <p className="text-sm text-orange-600">Total submissions</p>
              </div>
              <AwardIcon className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="admin-comparison" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="admin-comparison">Admin Comparison</TabsTrigger>
          <TabsTrigger value="top-scorers">Top Scorers</TabsTrigger>
          <TabsTrigger value="difficulty-analysis">Difficulty Analysis</TabsTrigger>
          <TabsTrigger value="performance-distribution">Performance Distribution</TabsTrigger>
          <TabsTrigger value="subject-analysis">Subject Analysis</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        {/* Admin Comparison Tab */}
        <TabsContent value="admin-comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UsersIcon className="w-5 h-5 mr-2" />
                Admin Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.adminAnalytics.map((admin) => (
                  <div key={admin.adminId} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{admin.adminName}</h3>
                        <p className="text-gray-600">{admin.adminEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(admin.averageScore)}`}>
                          {admin.averageScore?.toFixed(1) || 'N/A'}%
                        </p>
                        <p className="text-sm text-gray-600">Average Score</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-blue-600">{admin.totalStudents}</p>
                        <p className="text-gray-600">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">{admin.totalExams}</p>
                        <p className="text-gray-600">Exams</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-purple-600">{admin.examDifficulty.overallDifficulty.toFixed(1)}</p>
                        <p className="text-gray-600">Difficulty</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-orange-600">{admin.topScorers.length}</p>
                        <p className="text-gray-600">Top Scorers</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Performance Progress</span>
                        <span className="text-sm text-gray-600">{admin.averageScore?.toFixed(1) || 'N/A'}%</span>
                      </div>
                      <Progress value={admin.averageScore || 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Scorers Tab */}
        <TabsContent value="top-scorers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrophyIcon className="w-5 h-5 mr-2" />
                Top Performers Across All Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.globalAnalytics.topPerformers.map((scorer, index) => (
                  <div key={scorer.studentId} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-yellow-800">#{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{scorer.studentName}</h3>
                        <p className="text-sm text-gray-600">{scorer.studentEmail}</p>
                        <p className="text-sm text-gray-500">{scorer.totalExams} exams taken</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(scorer.averageScore)}`}>
                        {scorer.averageScore?.toFixed(1) || 'N/A'}%
                      </p>
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-sm text-green-600">Best: {scorer.highestScore?.toFixed(1) || 'N/A'}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Difficulty Analysis Tab */}
        <TabsContent value="difficulty-analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.adminAnalytics.map((admin) => (
              <Card key={admin.adminId}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalculatorIcon className="w-5 h-5 mr-2" />
                    {admin.adminName} - Exam Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-2xl font-bold text-purple-600">
                        {admin.examDifficulty?.overallDifficulty?.toFixed(1) || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">Overall Difficulty Score</p>
                    </div>
                    
                    <div className="space-y-2">
                      {(admin.examDifficulty?.exams || []).slice(0, 5).map((exam) => (
                        <div key={exam.examId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{exam.examTitle}</p>
                            <p className="text-xs text-gray-600">{exam.totalAttempts} attempts</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getDifficultyColor(exam.difficulty)}>
                              {exam.difficulty}
                            </Badge>
                            <p className="text-sm font-semibold">{exam.averageScore?.toFixed(1) || 'N/A'}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Hardest Exam</p>
                      <p className="text-sm text-blue-600">{admin.examDifficulty.hardestExam?.examTitle || 'No exams available'}</p>
                      <p className="text-xs text-blue-500">Score: {admin.examDifficulty.hardestExam?.averageScore?.toFixed(1) || 'N/A'}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Distribution Tab */}
        <TabsContent value="performance-distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.adminAnalytics.map((admin) => (
              <Card key={admin.adminId}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="w-5 h-5 mr-2" />
                    {admin.adminName} - Performance Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(admin.performanceDistribution).map(([key, data]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{key}</span>
                          <span className="text-sm text-gray-600">{data.count} students ({data.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPerformanceColor(data.range)}`}
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subject Analysis Tab */}
        <TabsContent value="subject-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Subject-wise Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.globalAnalytics.subjectWiseAnalysis.map((subject) => (
                  <div key={subject.subject} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg capitalize">{subject.subject}</h3>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(subject.averageScore)}`}>
                          {subject.averageScore?.toFixed(1) || 'N/A'}%
                        </p>
                        <p className="text-sm text-gray-600">Average Score</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-blue-600">{subject.totalExams}</p>
                        <p className="text-gray-600">Total Exams</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">{subject.highestScore?.toFixed(1) || 'N/A'}%</p>
                        <p className="text-gray-600">Highest Score</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-orange-600">{subject.lowestScore?.toFixed(1) || 'N/A'}%</p>
                        <p className="text-gray-600">Lowest Score</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-purple-600">{subject.examCount}</p>
                        <p className="text-gray-600">Exam Count</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Performance Range</span>
                        <span className="text-sm text-gray-600">
                          {subject.lowestScore?.toFixed(1) || 'N/A'}% - {subject.highestScore?.toFixed(1) || 'N/A'}%
                        </span>
                      </div>
                      <Progress value={subject.averageScore || 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChartIcon className="w-5 h-5 mr-2" />
                Performance Trends Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUpIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{analytics.globalAnalytics.trendsAnalysis.improving}</p>
                    <p className="text-sm text-green-600">Students Improving</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <TrendingDownIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{analytics.globalAnalytics.trendsAnalysis.declining}</p>
                    <p className="text-sm text-red-600">Students Declining</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <ActivityIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{analytics.globalAnalytics.trendsAnalysis.stable}</p>
                    <p className="text-sm text-blue-600">Stable Performance</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {analytics.adminAnalytics.map((admin) => (
                    <div key={admin.adminId} className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-3">{admin.adminName} - Monthly Trends</h3>
                      <div className="space-y-2">
                        {admin.performanceTrends.slice(-6).map((trend) => (
                          <div key={trend.month} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{trend.month}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">{trend.examCount} exams</span>
                              <span className={`text-sm font-semibold ${getScoreColor(trend.averageScore)}`}>
                                {trend.averageScore?.toFixed(1) || 'N/A'}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insights */}
      {analytics.aiInsights && analytics.aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BrainCircuitIcon className="w-5 h-5 mr-2" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.aiInsights.map((insight, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <Badge className={
                      insight.type === 'alert' ? 'bg-red-100 text-red-800' :
                      insight.type === 'recommendation' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {insight.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{insight.confidence}% confidence</span>
                    <span className={`px-2 py-1 rounded ${
                      insight.impact === 'high' ? 'bg-red-100 text-red-600' :
                      insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {insight.impact} impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
