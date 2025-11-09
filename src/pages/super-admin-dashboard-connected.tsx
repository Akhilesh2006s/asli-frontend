import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import { 
  BellIcon, 
  LogOutIcon, 
  UsersIcon, 
  TrendingUpIcon, 
  BookIcon, 
  Presentation, 
  UserPlusIcon, 
  BookPlusIcon, 
  SettingsIcon, 
  DownloadIcon, 
  HomeIcon,
  EditIcon, 
  TrashIcon, 
  EyeIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  DollarSignIcon, 
  BarChartIcon, 
  BrainIcon, 
  SparklesIcon, 
  TrendingDownIcon, 
  AlertTriangleIcon, 
  ThumbsUpIcon, 
  LightbulbIcon, 
  TargetIcon, 
  ZapIcon,
  ShieldIcon,
  CrownIcon,
  UserCheckIcon,
  LockIcon
} from "lucide-react";

type SuperAdminView = 'dashboard' | 'admin-management' | 'users' | 'content' | 'analytics' | 'subscriptions' | 'settings' | 'system-logs';

export default function SuperAdminDashboard() {
  const [currentView, setCurrentView] = useState<SuperAdminView>('dashboard');
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    board: '',
    schoolName: '',
    permissions: [] as string[]
  });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  // Check authentication on component mount
  useEffect(() => {
    const superAdminUser = localStorage.getItem('superAdminUser');
    const superAdminToken = localStorage.getItem('superAdminToken');
    
    if (superAdminUser && superAdminToken) {
      setUser(JSON.parse(superAdminUser));
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/super-admin/login';
    }
  }, []);

  // API Base URL
  const API_BASE = API_BASE_URL;

  // Fetch stats from API
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/super-admin/stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch admins from API
  const { data: admins, isLoading: adminsLoading, refetch: refetchAdmins } = useQuery({
    queryKey: ['/api/super-admin/admins'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/admins`);
      if (!response.ok) throw new Error('Failed to fetch admins');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch users from API
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/super-admin/users'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch courses from API
  const { data: courses, isLoading: coursesLoading, refetch: refetchCourses } = useQuery({
    queryKey: ['/api/super-admin/courses'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/courses`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch analytics from API
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/super-admin/analytics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch subscriptions from API
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['/api/super-admin/subscriptions'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/super-admin/subscriptions`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
    enabled: !!user,
  });

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
    window.location.href = '/super-admin/login';
  };

  const handleExportData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/export`);
      const data = await response.json();
      
      // Create CSV data
      const csvData = [
        ['Type', 'Name', 'Value', 'Date'],
        ['Users', 'Total Users', stats?.totalUsers || 0, new Date().toISOString().split('T')[0]],
        ['Revenue', 'Monthly Revenue', `₹${stats?.revenue || 0}`, new Date().toISOString().split('T')[0]],
        ['Courses', 'Total Courses', stats?.courses || 0, new Date().toISOString().split('T')[0]],
        ['Teachers', 'Active Teachers', stats?.teachers || 0, new Date().toISOString().split('T')[0]],
        ['Admins', 'Total Admins', stats?.admins || 0, new Date().toISOString().split('T')[0]],
        ['Analytics', 'Daily Active Users', analytics?.dailyActive || 0, new Date().toISOString().split('T')[0]],
        ['Analytics', 'Weekly Active Users', analytics?.weeklyActive || 0, new Date().toISOString().split('T')[0]],
        ['Analytics', 'Monthly Active Users', analytics?.monthlyActive || 0, new Date().toISOString().split('T')[0]],
        ['Analytics', 'Completion Rate', `${analytics?.completionRate || 0}%`, new Date().toISOString().split('T')[0]],
        ['Analytics', 'Revenue Growth', `${analytics?.revenueGrowth || 0}%`, new Date().toISOString().split('T')[0]]
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `super-admin-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Analytics data exported successfully!",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddAdmin = async (adminData: any) => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Admin Created",
          description: "New admin created successfully!",
        });
        setShowAddAdminModal(false);
        setNewAdmin({ name: '', email: '', board: '', schoolName: '', permissions: [] });
        refetchAdmins();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create admin error:', error);
      toast({
        title: "Error",
        description: "Failed to create admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async (userData: any) => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "User Created",
          description: "New user created successfully!",
        });
        setShowAddUserModal(false);
        refetchUsers();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateCourse = async (courseData: any) => {
    try {
      const response = await fetch(`${API_BASE}/api/super-admin/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Course Created",
          description: "New course created successfully!",
        });
        setShowCreateCourseModal(false);
        refetchCourses();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create course",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create course error:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Super Admin Dashboard';
      case 'admin-management': return 'Admin Management';
      case 'users': return 'User Management';
      case 'content': return 'Content Management';
      case 'analytics': return 'Analytics';
      case 'subscriptions': return 'Subscriptions';
      case 'settings': return 'Settings';
      case 'system-logs': return 'System Logs';
      default: return 'Super Admin Dashboard';
    }
  };

  const renderDashboardContent = () => {
    if (statsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div>
        {/* Super Admin Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('users')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <UsersIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalUsers || 0}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-xs text-blue-600 mt-1">Click to manage users →</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('analytics')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <TrendingUpIcon className="w-6 h-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">₹{stats?.revenue || 0}</p>
                  <p className="text-sm text-gray-600">Monthly Revenue</p>
                  <p className="text-xs text-green-600 mt-1">Click for analytics →</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('content')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <BookIcon className="w-6 h-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats?.courses || 0}</p>
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="text-xs text-purple-600 mt-1">Click to manage courses →</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('admin-management')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-100">
                  <ShieldIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats?.admins || 0}</p>
                  <p className="text-sm text-gray-600">Active Admins</p>
                  <p className="text-xs text-red-600 mt-1">Click to manage admins →</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowAddAdminModal(true)}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShieldIcon className="w-8 h-8 text-red-600 mr-4" />
                <div>
                  <h3 className="font-semibold text-gray-900">Add New Admin</h3>
                  <p className="text-sm text-gray-600">Create admin accounts with permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowAddUserModal(true)}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlusIcon className="w-8 h-8 text-primary mr-4" />
                <div>
                  <h3 className="font-semibold text-gray-900">Add New User</h3>
                  <p className="text-sm text-gray-600">Create student or teacher accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowCreateCourseModal(true)}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookPlusIcon className="w-8 h-8 text-secondary mr-4" />
                <div>
                  <h3 className="font-semibold text-gray-900">Create Course</h3>
                  <p className="text-sm text-gray-600">Add new educational content</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportData()}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DownloadIcon className="w-8 h-8 text-accent mr-4" />
                <div>
                  <h3 className="font-semibold text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-600">Download platform analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BrainIcon className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">AI Insights & Recommendations</h2>
              <SparklesIcon className="w-5 h-5 text-yellow-500 ml-2" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">AI Analysis Active</span>
            </div>
          </div>

          {/* AI Predictions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Next Month Revenue (AI Predicted)</p>
                    <p className="text-2xl font-bold text-purple-900">₹289,450</p>
                    <p className="text-xs text-green-600">↗ +18.2% growth</p>
                  </div>
                  <TrendingUpIcon className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Predicted New Students</p>
                    <p className="text-2xl font-bold text-blue-900">89</p>
                    <p className="text-xs text-blue-600">Next 30 days</p>
                  </div>
                  <UsersIcon className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Students at Churn Risk</p>
                    <p className="text-2xl font-bold text-orange-900">12</p>
                    <p className="text-xs text-orange-600">Needs attention</p>
                  </div>
                  <AlertTriangleIcon className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">AI Engagement Score</p>
                    <p className="text-2xl font-bold text-green-900">92%</p>
                    <p className="text-xs text-green-600">Excellent</p>
                  </div>
                  <ZapIcon className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminManagementContent = () => {
    if (adminsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Admin Management</h2>
          <Button onClick={() => setShowAddAdminModal(true)}>
            <ShieldIcon className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.map((admin: any) => (
                  <TableRow key={admin._id}>
                    <TableCell className="font-medium">{admin.fullName}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-red-100 text-red-800">
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {admin.permissions?.map((permission: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.isActive ? 'outline' : 'destructive'}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => alert(`View ${admin.fullName} details`)}>
                          <EyeIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Edit ${admin.fullName} permissions`)}>
                          <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Deactivate ${admin.fullName}`)}>
                          <XCircleIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderUsersContent = () => {
    if (usersLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">User Management</h2>
          <Button onClick={() => setShowAddUserModal(true)}>
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'teacher' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.details || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => alert(`View ${user.fullName} details`)}>
                          <EyeIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Edit ${user.fullName}`)}>
                          <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Delete ${user.fullName}`)}>
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContentContent = () => {
    if (coursesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Content Management</h2>
          <Button onClick={() => setShowCreateCourseModal(true)}>
            <BookPlusIcon className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses?.map((course: any) => (
                  <TableRow key={course._id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.subject}</TableCell>
                    <TableCell>{course.grade}</TableCell>
                    <TableCell>{course.board}</TableCell>
                    <TableCell>{course.teacher?.fullName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={course.isPublished ? 'outline' : 'secondary'}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(course.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => alert(`View ${course.title}`)}>
                          <EyeIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Edit ${course.title}`)}>
                          <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Delete ${course.title}`)}>
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalyticsContent = () => {
    if (analyticsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Platform Analytics</h2>
        
        {/* Active Users Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{analytics?.dailyActive || 0}</div>
              <p className="text-xs text-green-600">↗ +5.2% from yesterday</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{analytics?.weeklyActive || 0}</div>
              <p className="text-xs text-green-600">↗ +12.1% from last week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{analytics?.monthlyActive || 0}</div>
              <p className="text-xs text-green-600">↗ +{analytics?.userGrowth || 0}% growth</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics?.avgSessionTime || '0m'}</div>
              <p className="text-xs text-green-600">↗ +3.4% from last month</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-primary">{analytics?.completionRate || 0}%</div>
                <Progress value={analytics?.completionRate || 0} className="w-full" />
                <p className="text-sm text-gray-600">Students completing at least 80% of enrolled courses</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-green-600">+{analytics?.revenueGrowth || 0}%</div>
                <Progress value={analytics?.revenueGrowth || 0} className="w-full" />
                <p className="text-sm text-gray-600">Month-over-month revenue increase</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSubscriptionsContent = () => {
    if (subscriptionsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Subscription Management</h2>
          <div className="flex space-x-4">
            <div className="text-sm">
              <span className="font-medium">Total MRR: </span>
              <span className="text-green-600 font-bold">₹89,450</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Active Subscriptions: </span>
              <span className="text-blue-600 font-bold">156</span>
            </div>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.user}</TableCell>
                    <TableCell>
                      <Badge variant={sub.plan === 'Pro' ? 'default' : sub.plan === 'Premium' ? 'secondary' : 'outline'}>
                        {sub.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{sub.amount}</TableCell>
                    <TableCell>
                      <Badge variant={
                        sub.status === 'Active' ? 'outline' : 
                        sub.status === 'Pending' ? 'secondary' : 'destructive'
                      }>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.nextBilling}</TableCell>
                    <TableCell>{sub.paymentMethod}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => alert(`View ${sub.user} subscription`)}>
                          <EyeIcon className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alert(`Edit ${sub.user} subscription`)}>
                          <EditIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Platform Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Platform Name</span>
              <span className="font-medium">Asli Prep Foundation</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Registration Status</span>
              <Badge variant="outline">Open</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Maintenance Mode</span>
              <Badge variant="destructive">Disabled</Badge>
            </div>
            <Button onClick={() => alert('Edit general settings')}>Edit Settings</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Payment Gateway</span>
              <span className="font-medium">Razorpay</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Auto-billing</span>
              <Badge variant="outline">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Currency</span>
              <span className="font-medium">INR (₹)</span>
            </div>
            <Button onClick={() => alert('Edit payment settings')}>Configure Payments</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>SMTP Status</span>
              <Badge variant="outline">Connected</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Welcome Emails</span>
              <Badge variant="outline">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Marketing Emails</span>
              <Badge variant="secondary">Disabled</Badge>
            </div>
            <Button onClick={() => alert('Edit email settings')}>Email Configuration</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Two-Factor Auth</span>
              <Badge variant="outline">Required</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Session Timeout</span>
              <span className="font-medium">24 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Password Strength</span>
              <Badge variant="outline">High</Badge>
            </div>
            <Button onClick={() => alert('Edit security settings')}>Security Configuration</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSystemLogsContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">System Logs</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium">Admin Login</p>
                  <p className="text-sm text-gray-600">Dr. Sarah Johnson logged in successfully</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">2 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <UserPlusIcon className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium">New User Created</p>
                  <p className="text-sm text-gray-600">Student account created for Rahul Sharma</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">15 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <AlertTriangleIcon className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium">System Warning</p>
                  <p className="text-sm text-gray-600">High server load detected</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">1 hour ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <BookPlusIcon className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium">Course Created</p>
                  <p className="text-sm text-gray-600">New course "Advanced Mathematics" published</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return renderDashboardContent();
      case 'admin-management': return renderAdminManagementContent();
      case 'users': return renderUsersContent();
      case 'content': return renderContentContent();
      case 'analytics': return renderAnalyticsContent();
      case 'subscriptions': return renderSubscriptionsContent();
      case 'settings': return renderSettingsContent();
      case 'system-logs': return renderSystemLogsContent();
      default: return renderDashboardContent();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Super Admin Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <CrownIcon className="h-8 w-8 text-red-600 mr-2" />
            <span className="font-bold text-lg text-red-600">Super Admin</span>
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChartIcon },
              { id: 'admin-management', label: 'Admin Management', icon: ShieldIcon },
              { id: 'users', label: 'User Management', icon: UsersIcon },
              { id: 'content', label: 'Content Management', icon: BookIcon },
              { id: 'analytics', label: 'Analytics', icon: TrendingUpIcon },
              { id: 'subscriptions', label: 'Subscriptions', icon: DollarSignIcon },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
              { id: 'system-logs', label: 'System Logs', icon: ClockIcon },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start ${
                    currentView === item.id 
                      ? "bg-red-100 text-red-700 hover:bg-red-200" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setCurrentView(item.id as SuperAdminView)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <CrownIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Super Admin</p>
              <p className="text-xs text-red-600">Amenity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              <p className="text-sm text-gray-600">Welcome back, Super Admin!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => alert('Notifications feature - Would show recent platform activities')}>
                <BellIcon className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOutIcon className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Add New Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                
                // Validate required fields
                if (!newAdmin.name || !newAdmin.email || !newAdmin.board || !newAdmin.schoolName) {
                  toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields: Name, Email, Board, and School Name.",
                    variant: "destructive",
                  });
                  return;
                }
                
                handleAddAdmin({
                  name: newAdmin.name,
                  email: newAdmin.email,
                  board: newAdmin.board,
                  schoolName: newAdmin.schoolName,
                  permissions: newAdmin.permissions
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="name"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      required 
                      placeholder="Enter full name" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input 
                      id="email"
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required 
                      placeholder="Enter email address" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="board">Board <span className="text-red-500">*</span></Label>
                    <Select 
                      value={newAdmin.board}
                      onValueChange={(value) => setNewAdmin({ ...newAdmin, board: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBSE_AP">CBSE Andhra Pradesh</SelectItem>
                        <SelectItem value="CBSE_TS">CBSE Telangana</SelectItem>
                        <SelectItem value="STATE_AP">State Board Andhra Pradesh</SelectItem>
                        <SelectItem value="STATE_TS">State Board Telangana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schoolName">School Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="schoolName"
                      value={newAdmin.schoolName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, schoolName: e.target.value })}
                      required 
                      placeholder="Enter school name" 
                    />
                  </div>
                  <div>
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      {['User Management', 'Content Management', 'Analytics', 'Subscriptions', 'Settings'].map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            checked={newAdmin.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAdmin({ ...newAdmin, permissions: [...newAdmin.permissions, permission] });
                              } else {
                                setNewAdmin({ ...newAdmin, permissions: newAdmin.permissions.filter(p => p !== permission) });
                              }
                            }}
                            id={permission}
                            className="rounded"
                          />
                          <Label htmlFor={permission} className="text-sm">{permission}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" className="flex-1">Create Admin</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => {
                        setShowAddAdminModal(false);
                        setNewAdmin({ name: '', email: '', board: '', schoolName: '', permissions: [] });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleAddUser({
                  name: formData.get('name'),
                  email: formData.get('email'),
                  role: formData.get('role'),
                  details: formData.get('details')
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input name="name" type="text" required placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" type="email" required placeholder="Enter email address" />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="details">Grade/Subject</Label>
                    <Input name="details" type="text" required placeholder="Class 10 CBSE or Mathematics" />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" className="flex-1">Create User</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleCreateCourse({
                  title: formData.get('title'),
                  subject: formData.get('subject'),
                  grade: formData.get('grade'),
                  board: formData.get('board'),
                  teacher: formData.get('teacher')
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input name="title" type="text" required placeholder="e.g., Advanced Mathematics" />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select name="subject" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Social Science">Social Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="grade">Grade</Label>
                    <Select name="grade" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class 8">Class 8</SelectItem>
                        <SelectItem value="Class 9">Class 9</SelectItem>
                        <SelectItem value="Class 10">Class 10</SelectItem>
                        <SelectItem value="Class 11">Class 11</SelectItem>
                        <SelectItem value="Class 12">Class 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="board">Board</Label>
                    <Select name="board" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="ICSE">ICSE</SelectItem>
                        <SelectItem value="State Board">State Board</SelectItem>
                        <SelectItem value="IB">IB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="teacher">Assigned Teacher</Label>
                    <Select name="teacher" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Priya Singh">Priya Singh</SelectItem>
                        <SelectItem value="Sunita Verma">Sunita Verma</SelectItem>
                        <SelectItem value="Dr. Raj Patel">Dr. Raj Patel</SelectItem>
                        <SelectItem value="Meera Joshi">Meera Joshi</SelectItem>
                        <SelectItem value="Anita Roy">Anita Roy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" className="flex-1">Create Course</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateCourseModal(false)}>Cancel</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
