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
    
    // Listen for admin deletion events to refresh analytics
    const handleAdminDeleted = () => {
      fetchAnalytics();
    };
    
    window.addEventListener('adminDeleted', handleAdminDeleted);
    
    return () => {
      window.removeEventListener('adminDeleted', handleAdminDeleted);
    };
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
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Admins - Orange (matching admin dashboard) */}
        <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Admins</p>
                <p className="text-3xl font-bold text-white">{analytics?.length || 0}</p>
                <p className="text-sm text-white/90">Active administrators</p>
              </div>
              <CrownIcon className="h-12 w-12 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Total Students - Sky Blue (matching admin dashboard) */}
        <Card className="bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Students</p>
                <p className="text-3xl font-bold text-white">
                  {analytics?.reduce((sum, admin) => sum + (admin.stats?.students || 0), 0) || 0}
                </p>
                <p className="text-sm text-white/90">Across all admins</p>
              </div>
              <UsersIcon className="h-12 w-12 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Total Teachers - Teal (matching admin dashboard) */}
        <Card className="bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Teachers</p>
                <p className="text-3xl font-bold text-white">
                  {analytics?.reduce((sum, admin) => sum + (admin.stats?.teachers || 0), 0) || 0}
                </p>
                <p className="text-sm text-white/90">Active educators</p>
              </div>
              <AwardIcon className="h-12 w-12 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Total Content - Orange (matching admin dashboard) */}
        <Card className="bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Total Content</p>
                <p className="text-3xl font-bold text-white">
                  {analytics?.reduce((sum, admin) => 
                    sum + (admin.stats?.videos || 0) + (admin.stats?.assessments || 0) + (admin.stats?.exams || 0), 0) || 0}
                </p>
                <p className="text-sm text-white/90">Videos, assessments, exams</p>
              </div>
              <BookIcon className="h-12 w-12 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Performance */}
      <Card className="relative border-0 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #7dd3fc 0%, #7dd3fc 20%, #2dd4bf 60%, #14b8a6 100%)'
      }}>
        <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center text-gray-900">
            <TrendingUpIcon className="w-5 h-5 mr-2" />
            Admin Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-4">
            {analytics?.map((admin) => (
              <div key={admin.id} className="p-4 bg-white/90 backdrop-blur-sm rounded-lg border border-white/50 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{admin.name}</h3>
                    <p className="text-gray-600">{admin.email}</p>
                  </div>
                  <Badge className={admin.status === 'Active' ? 'bg-teal-600 text-white border-2 border-teal-700 shadow-lg font-semibold' : 'bg-gray-600 text-white border-2 border-gray-700 shadow-lg font-semibold'}>
                    {admin.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-lg">{admin.stats?.students || 0}</p>
                    <p className="text-gray-600">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-lg">{admin.stats?.teachers || 0}</p>
                    <p className="text-gray-600">Teachers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-lg">{admin.stats?.videos || 0}</p>
                    <p className="text-gray-600">Videos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-lg">{admin.stats?.assessments || 0}</p>
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