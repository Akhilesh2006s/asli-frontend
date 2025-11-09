import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/navigation";
import { 
  User, 
  Settings, 
  Award, 
  Target, 
  TrendingUp,
  Calendar,
  Clock,
  BookOpen,
  Star,
  Trophy,
  Flame,
  Edit,
  Save,
  X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EDUCATION_STREAMS, getAgeGroup, getStreamsByAge } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch user's test attempts for achievements
  const { data: attempts = [] } = useQuery({
    queryKey: ["/api/users", MOCK_USER_ID, "test-attempts"],
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest("PATCH", `/api/users/${MOCK_USER_ID}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", MOCK_USER_ID] });
      setIsEditing(false);
      setEditedProfile({});
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Use mock stats for now (could be fetched from backend later)
  const stats = { streak: 0, questionsAnswered: 0, accuracyRate: 0, rank: 0 };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({
      fullName: user?.fullName || "",
      email: user?.email || "",
      age: user?.age || 18,
      educationStream: user?.educationStream || "",
      targetExam: user?.targetExam || "",
    });
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  // Calculate achievements
  const achievements = [
    {
      id: "streak_master",
      title: "Study Streak Master",
      description: `${stats.streak} days continuous learning`,
      icon: Flame,
      color: "bg-orange-100 text-orange-600",
      unlocked: stats.streak >= 7,
      progress: Math.min((stats.streak / 30) * 100, 100)
    },
    {
      id: "question_solver",
      title: "Problem Solver",
      description: `${stats.questionsAnswered.toLocaleString()} questions solved`,
      icon: Target,
      color: "bg-blue-100 text-blue-600",
      unlocked: stats.questionsAnswered >= 100,
      progress: Math.min((stats.questionsAnswered / 1000) * 100, 100)
    },
    {
      id: "accuracy_expert",
      title: "Accuracy Expert",
      description: `${stats.accuracyRate}% average accuracy`,
      icon: Star,
      color: "bg-yellow-100 text-yellow-600",
      unlocked: stats.accuracyRate >= 75,
      progress: Math.min((stats.accuracyRate / 90) * 100, 100)
    },
    {
      id: "test_champion",
      title: "Test Champion",
      description: `${(attempts as any[]).length} tests completed`,
      icon: Trophy,
      color: "bg-green-100 text-green-600",
      unlocked: (attempts as any[]).length >= 5,
      progress: Math.min(((attempts as any[]).length / 20) * 100, 100)
    }
  ];

  const weeklyStats = [
    { day: "Mon", hours: 2.5, completed: true },
    { day: "Tue", hours: 3.0, completed: true },
    { day: "Wed", hours: 1.8, completed: true },
    { day: "Thu", hours: 2.2, completed: true },
    { day: "Fri", hours: 2.8, completed: true },
    { day: "Sat", hours: 4.0, completed: true },
    { day: "Sun", hours: 1.5, completed: false },
  ];

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
          <div className="space-y-8">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
              <p className="text-gray-600">Please check your login status.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const ageGroup = getAgeGroup(user.age);
  const availableStreams = getStreamsByAge(user.age);

  return (
    <>
      <Navigation />
      <div className={`w-full px-2 sm:px-4 lg:px-6 py-8 ${isMobile ? 'pb-20' : ''}`}>
        
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 gradient-accent rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editedProfile.fullName}
                        onChange={(e) => setEditedProfile({...editedProfile, fullName: e.target.value})}
                        className="text-2xl font-bold"
                      />
                      <Input
                        type="email"
                        value={editedProfile.email}
                        onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                        className="text-gray-600"
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-gray-900">{user.fullName || 'User'}</h1>
                      <p className="text-gray-600">{user.email}</p>
                    </>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">{ageGroup.label}</Badge>
                    <Badge className="gradient-primary text-white">{user.educationStream}</Badge>
                    {user.targetExam && (
                      <Badge variant="outline">{user.targetExam}</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Performance Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-1">
                          {stats.streak}
                        </div>
                        <p className="text-sm text-gray-600">Day Streak</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {stats.questionsAnswered.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-600">Questions Solved</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {stats.accuracyRate}%
                        </div>
                        <p className="text-sm text-gray-600">Accuracy Rate</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          #{stats.rank}
                        </div>
                        <p className="text-sm text-gray-600">Rank</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      This Week's Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {weeklyStats.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className="text-xs text-gray-600 mb-1">{day.day}</div>
                          <div 
                            className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                              day.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {day.hours}h
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        Total: {weeklyStats.reduce((sum, day) => sum + day.hours, 0)} hours this week
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Achievements & Badges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon;
                      return (
                        <div key={achievement.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${achievement.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                                <p className="text-sm text-gray-600">{achievement.description}</p>
                              </div>
                            </div>
                            <Badge className={achievement.unlocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                              {achievement.unlocked ? 'Unlocked' : 'Locked'}
                            </Badge>
                          </div>
                          <Progress value={achievement.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(achievement.progress)}% complete
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="progress" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Subject Progress */}
                    <div>
                      <h4 className="font-medium mb-4">Subject-wise Progress</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Physics</span>
                          <span className="text-sm text-gray-600">75%</span>
                        </div>
                        <Progress value={75} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Chemistry</span>
                          <span className="text-sm text-gray-600">62%</span>
                        </div>
                        <Progress value={62} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Mathematics</span>
                          <span className="text-sm text-gray-600">58%</span>
                        </div>
                        <Progress value={58} className="h-2" />
                      </div>
                    </div>

                    <Separator />

                    {/* Study Goals */}
                    <div>
                      <h4 className="font-medium mb-4">Study Goals</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Target className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium">Daily Study Goal</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">3 hours</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium">Weekly Target</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">20 hours</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="age">Age</Label>
                            <Input
                              id="age"
                              type="number"
                              value={editedProfile.age}
                              onChange={(e) => setEditedProfile({...editedProfile, age: parseInt(e.target.value)})}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="stream">Education Stream</Label>
                            <Select 
                              value={editedProfile.educationStream} 
                              onValueChange={(value) => setEditedProfile({...editedProfile, educationStream: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStreams.map(stream => (
                                  <SelectItem key={stream.value} value={stream.value}>
                                    {stream.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="targetExam">Target Exam (Optional)</Label>
                          <Input
                            id="targetExam"
                            value={editedProfile.targetExam}
                            onChange={(e) => setEditedProfile({...editedProfile, targetExam: e.target.value})}
                            placeholder="e.g., JEE Main 2024"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Age</Label>
                            <p className="text-lg font-medium text-gray-900">{user.age} years</p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Education Stream</Label>
                            <p className="text-lg font-medium text-gray-900">{user.educationStream}</p>
                          </div>
                        </div>
                        
                        {user.targetExam && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Target Exam</Label>
                            <p className="text-lg font-medium text-gray-900">{user.targetExam}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tests Completed</span>
                  <span className="font-semibold">{(attempts as any[]).length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Best Score</span>
                  <span className="font-semibold">
                    {(attempts as any[]).length > 0 
                      ? `${Math.max(...(attempts as any[]).map((a: any) => Math.round((a.score / a.totalQuestions) * 100)))}%`
                      : 'N/A'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Study Hours</span>
                  <span className="font-semibold">
                    {weeklyStats.reduce((sum, day) => sum + day.hours, 0)}h this week
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Achievements</span>
                  <span className="font-semibold">
                    {achievements.filter(a => a.unlocked).length}/{achievements.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Completed Physics test</span>
                </div>
                
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Watched Chemistry lecture</span>
                </div>
                
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Asked Vidya AI a question</span>
                </div>
                
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">Achieved study streak milestone</span>
                </div>
              </CardContent>
            </Card>

            {/* Study Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Study Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">Physics</span>
                  <Badge variant="outline">30 min</Badge>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium">Chemistry</span>
                  <Badge variant="outline">45 min</Badge>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm font-medium">Mathematics</span>
                  <Badge variant="outline">60 min</Badge>
                </div>
                
                <Button className="w-full mt-4" variant="outline" size="sm">
                  View Full Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}


