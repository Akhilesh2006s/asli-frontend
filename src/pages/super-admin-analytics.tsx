import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3Icon, 
  UsersIcon, 
  TrendingUpIcon, 
  BookIcon,
  CrownIcon,
  StarIcon,
  TargetIcon,
  AwardIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

export default function SuperAdminAnalyticsDashboard() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3Icon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3Icon className="w-8 h-8 mr-3 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive platform analytics and insights</p>
        </div>
        <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
          Refresh Data
        </Button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Admins</p>
                <p className="text-3xl font-bold text-blue-900">{analytics?.length || 0}</p>
                <p className="text-sm text-blue-600">Active administrators</p>
              </div>
              <CrownIcon className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Students</p>
                <p className="text-3xl font-bold text-green-900">
                  {analytics?.reduce((sum, admin) => sum + (admin.stats?.students || 0), 0) || 0}
                </p>
                <p className="text-sm text-green-600">Across all admins</p>
              </div>
              <UsersIcon className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Teachers</p>
                <p className="text-3xl font-bold text-purple-900">
                  {analytics?.reduce((sum, admin) => sum + (admin.stats?.teachers || 0), 0) || 0}
                </p>
                <p className="text-sm text-purple-600">Active educators</p>
              </div>
              <AwardIcon className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Total Content</p>
                <p className="text-3xl font-bold text-orange-900">
                  {analytics?.reduce((sum, admin) => 
                    sum + (admin.stats?.videos || 0) + (admin.stats?.assessments || 0) + (admin.stats?.exams || 0), 0) || 0}
                </p>
                <p className="text-sm text-orange-600">Videos, assessments, exams</p>
              </div>
              <BookIcon className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUpIcon className="w-5 h-5 mr-2" />
            Admin Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.map((admin) => (
              <div key={admin.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{admin.name}</h3>
                    <p className="text-gray-600">{admin.email}</p>
                  </div>
                  <Badge className={admin.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {admin.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{admin.stats?.students || 0}</p>
                    <p className="text-gray-600">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{admin.stats?.teachers || 0}</p>
                    <p className="text-gray-600">Teachers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-purple-600">{admin.stats?.videos || 0}</p>
                    <p className="text-gray-600">Videos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-orange-600">{admin.stats?.assessments || 0}</p>
                    <p className="text-gray-600">Assessments</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}