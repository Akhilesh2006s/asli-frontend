import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  TrendingUp, 
  Users, 
  Video, 
  Target, 
  Award, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalClasses: number;
  totalVideos: number;
  totalQuizzes: number;
  totalAssessments: number;
  averageScore: number;
  completionRate: number;
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    time: string;
    type: string;
  }>;
  classPerformance: Array<{
    classNumber: string;
    students: number;
    averageScore: number;
    completionRate: number;
  }>;
  topPerformers: Array<{
    name: string;
    class: string;
    score: number;
    rank: number;
  }>;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudents: 0,
    activeStudents: 0,
    totalClasses: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    totalAssessments: 0,
    averageScore: 0,
    completionRate: 0,
    recentActivity: [],
    classPerformance: [],
    topPerformers: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      // Ensure all arrays exist with fallback to empty arrays
      setAnalytics({
        totalStudents: data.totalStudents || 0,
        activeStudents: data.activeStudents || 0,
        totalClasses: data.totalClasses || 0,
        totalVideos: data.totalVideos || 0,
        totalQuizzes: data.totalQuizzes || 0,
        totalAssessments: data.totalAssessments || 0,
        averageScore: data.averageScore || 0,
        completionRate: data.completionRate || 0,
        recentActivity: data.recentActivity || [],
        classPerformance: data.classPerformance || [],
        topPerformers: data.topPerformers || []
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set mock data for development
      setAnalytics({
        totalStudents: 150,
        activeStudents: 120,
        totalClasses: 8,
        totalVideos: 45,
        totalQuizzes: 25,
        totalAssessments: 12,
        averageScore: 78,
        completionRate: 85,
        recentActivity: [
          { id: '1', action: 'New student registered', user: 'John Doe', time: '2 hours ago', type: 'user' },
          { id: '2', action: 'Video uploaded', user: 'Admin', time: '4 hours ago', type: 'video' },
          { id: '3', action: 'Quiz completed', user: 'Jane Smith', time: '6 hours ago', type: 'quiz' }
        ],
        classPerformance: [
          { classNumber: '10A', students: 25, averageScore: 82, completionRate: 88 },
          { classNumber: '12B', students: 30, averageScore: 75, completionRate: 80 }
        ],
        topPerformers: [
          { name: 'Alice Johnson', class: '10A', score: 95, rank: 1 },
          { name: 'Bob Wilson', class: '12B', score: 92, rank: 2 },
          { name: 'Carol Davis', class: '10A', score: 90, rank: 3 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into your learning platform</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Students</p>
                  <p className="text-3xl font-bold text-blue-900">{analytics.totalStudents}</p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Active Students</p>
                  <p className="text-3xl font-bold text-green-900">{analytics.activeStudents}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <Activity className="w-3 h-3 mr-1" />
                    {Math.round((analytics.activeStudents / analytics.totalStudents) * 100)}% active
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Average Score</p>
                  <p className="text-3xl font-bold text-purple-900">{analytics.averageScore}%</p>
                  <p className="text-sm text-purple-600 flex items-center mt-1">
                    <Star className="w-3 h-3 mr-1" />
                    Across all assessments
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Completion Rate</p>
                  <p className="text-3xl font-bold text-orange-900">{analytics.completionRate}%</p>
                  <p className="text-sm text-orange-600 flex items-center mt-1">
                    <Target className="w-3 h-3 mr-1" />
                    Course completion
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="w-5 h-5 mr-2" />
                Class Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics.classPerformance || []).map((classData, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                        {classData.classNumber}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Class {classData.classNumber}</p>
                        <p className="text-sm text-gray-600">{classData.students} students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{classData.averageScore}%</p>
                      <p className="text-sm text-gray-600">avg score</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{classData.completionRate}%</p>
                      <p className="text-sm text-gray-600">completion</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics.topPerformers || []).map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {performer.rank}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-sm text-gray-600">Class {performer.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{performer.score}%</p>
                      <p className="text-sm text-gray-600">score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.recentActivity || []).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'video' ? 'bg-blue-100' :
                      activity.type === 'quiz' ? 'bg-orange-100' :
                      activity.type === 'assessment' ? 'bg-red-100' :
                      'bg-green-100'
                    }`}>
                      {activity.type === 'video' ? <Video className="w-4 h-4 text-blue-600" /> :
                       activity.type === 'quiz' ? <Target className="w-4 h-4 text-orange-600" /> :
                       activity.type === 'assessment' ? <Award className="w-4 h-4 text-red-600" /> :
                       <Users className="w-4 h-4 text-green-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">by {activity.user}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AnalyticsDashboard;
