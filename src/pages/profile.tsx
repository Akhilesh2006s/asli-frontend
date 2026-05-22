import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  X,
  Camera
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, apiFetch } from "@/lib/api-config";
import { dedupeStudentExamResults } from "@/lib/dedupe-exam-results";
import {
  buildWeeklyActivityStats,
  computeProfileOverviewStats,
  getExamIdFromResult,
} from "@/lib/profile-overview-stats";

// User ID now comes from authenticated user (/api/auth/me)

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  // Exam results (used as "test attempts" for achievements / quick stats)
  const [examResults, setExamResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

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

  // Exam results, rankings, streak, and learning progress for overview stats
  useEffect(() => {
    const fetchOverviewData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setExamResults([]);
        setRankings([]);
        setProgressRecords([]);
        setStreakCount(0);
        setOverviewLoading(false);
        return;
      }
      setOverviewLoading(true);
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      try {
        const [resultsRes, rankingsRes, focusRes, progressRes, meRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exam-results`, { headers }),
          fetch(`${API_BASE_URL}/api/student/rankings`, { headers }),
          apiFetch('/api/vidya/student/focus-card').catch(() => null),
          fetch(`${API_BASE_URL}/api/student/learning-progress`, { headers }),
          fetch(`${API_BASE_URL}/api/auth/me`, { headers }),
        ]);

        if (resultsRes.ok) {
          const json = await resultsRes.json();
          const rows = Array.isArray(json.data) ? json.data : [];
          setExamResults(dedupeStudentExamResults(rows, getExamIdFromResult));
        } else {
          setExamResults([]);
        }

        if (rankingsRes.ok) {
          const json = await rankingsRes.json();
          setRankings(Array.isArray(json.data) ? json.data : []);
        } else {
          setRankings([]);
        }

        let streak = 0;
        if (focusRes?.ok) {
          const focusJson = await focusRes.json();
          streak = Number(focusJson?.studyStreak?.current ?? focusJson?.studyStreak?.count ?? 0);
        }
        if ((!Number.isFinite(streak) || streak <= 0) && meRes.ok) {
          const meJson = await meRes.json();
          streak = Number(meJson?.user?.studyStreak?.current ?? 0);
        }
        setStreakCount(Number.isFinite(streak) ? Math.max(0, streak) : 0);

        if (progressRes.ok) {
          const progressJson = await progressRes.json();
          setProgressRecords(progressJson?.data?.progressRecords || []);
        } else {
          setProgressRecords([]);
        }
      } catch {
        setExamResults([]);
        setRankings([]);
        setProgressRecords([]);
        setStreakCount(0);
      } finally {
        setOverviewLoading(false);
      }
    };
    fetchOverviewData();
  }, []);

  // Use exam results as "attempts" for achievements and quick stats
  const attempts = examResults;

  // Update profile mutation (use apiFetch so request goes to backend URL with auth token)
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const userId = user?.id || user?._id;
      if (!userId) {
        throw new Error("User ID not available for profile update");
      }
      const response = await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(profileData),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Update failed: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      const userId = user?.id || user?._id || "current";
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      setIsEditing(false);
      setEditedProfile({});
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      // Refresh the page so all sections show the latest profile data
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const stats = useMemo(
    () => computeProfileOverviewStats(examResults, rankings, streakCount),
    [examResults, rankings, streakCount]
  );

  const weeklyStats = useMemo(
    () => buildWeeklyActivityStats(examResults, progressRecords),
    [examResults, progressRecords]
  );

  const weeklyHoursTotal = useMemo(
    () => Math.round(weeklyStats.reduce((sum, day) => sum + day.hours, 0) * 10) / 10,
    [weeklyStats]
  );

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({
      fullName: user?.fullName || "",
      email: user?.email || "",
      targetExam: user?.targetExam || "",
      phone: user?.phone || "",
      profilePhoto: user?.profilePhoto || "",
    });
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image up to 2MB.",
        variant: "destructive",
      });
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      updateProfileMutation.mutate({ profilePhoto: dataUrl });
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not process image file.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    updateProfileMutation.mutate({ profilePhoto: "" });
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

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-6 lg:p-8">
              <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-3 sm:space-y-4 lg:space-y-6">
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">User not found</h3>
              <p className="text-gray-600">Please check your login status.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const profileClassNumber =
    user.assignedClass?.classNumber != null && String(user.assignedClass.classNumber).trim() !== ""
      ? String(user.assignedClass.classNumber).trim()
      : user.classNumber &&
          String(user.classNumber).trim() !== "" &&
          user.classNumber !== "Unassigned"
        ? String(user.classNumber).trim()
        : null;

  const profileSection =
    user.assignedClass?.section != null && String(user.assignedClass.section).trim() !== ""
      ? String(user.assignedClass.section).trim()
      : user.section != null && String(user.section).trim() !== ""
        ? String(user.section).trim()
        : null;

  const profileSettingsSection = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Profile Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-fullName">Full Name</Label>
                <Input
                  id="settings-fullName"
                  value={editedProfile.fullName}
                  onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="settings-email">Email</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                value={editedProfile.phone || ""}
                onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="settings-targetExam">Target Exam (Optional)</Label>
              <Input
                id="settings-targetExam"
                value={editedProfile.targetExam}
                onChange={(e) => setEditedProfile({ ...editedProfile, targetExam: e.target.value })}
                placeholder="e.g., JEE Main 2024"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Class</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900 mt-1">
                  {profileClassNumber || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Section</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900 mt-1">
                  {profileSection || "N/A"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Full Name</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{user.fullName || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Email</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900 break-all">{user.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Class</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{profileClassNumber || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Section</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{profileSection || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Phone</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{user.phone || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">School</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{user.schoolName || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Board</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{user.board || "N/A"}</p>
              </div>
            </div>
            {user.targetExam && (
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Target Exam</Label>
                <p className="text-base sm:text-lg font-medium text-gray-900">{user.targetExam}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Navigation />
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 ${isMobile ? 'pb-20' : ''}`}>
        
        {/* Profile Header */}
        <Card className="mb-8 overflow-visible min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6 overflow-visible min-w-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="w-20 h-20 flex-shrink-0 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-accent flex items-center justify-center">
                        <span className="text-xl sm:text-2xl font-bold text-white">
                          {user.fullName?.split(' ').map(
                            (n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editedProfile.fullName}
                          onChange={(e) => setEditedProfile({...editedProfile, fullName: e.target.value})}
                          className="text-xl sm:text-2xl font-bold"
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
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{user.fullName || 'User'}</h1>
                        <p className="text-gray-600 break-all">{user.email}</p>
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {profileClassNumber && (
                        <Badge variant="outline">
                          Class {profileClassNumber}
                          {profileSection ? ` · Sec ${profileSection}` : ""}
                        </Badge>
                      )}
                      {user.board && (
                        <Badge variant="outline">{user.board}</Badge>
                      )}
                      {user.targetExam && (
                        <Badge variant="outline">{user.targetExam}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto sm:flex-none justify-end sm:justify-start">
                  {isEditing && (
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor="profile-photo-upload" className="cursor-pointer">
                        <span className="inline-flex items-center rounded-md border px-3 py-2 text-xs sm:text-sm bg-white hover:bg-gray-50">
                          <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                        </span>
                      </Label>
                      <Input
                        id="profile-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      {user.profilePhoto && (
                        <Button variant="outline" size="sm" onClick={handleRemovePhoto} disabled={updateProfileMutation.isPending}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                  {isEditing ? (
                    <>
                      <Button 
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                      >
                        <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={handleCancel} size="sm">
                        <X className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleEdit} variant="outline" size="sm">
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-4 sm:p-6 lg:p-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4 lg:space-y-6">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 sm:space-y-4 lg:space-y-6">
                {/* Performance Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-3 sm:p-4 lg:p-6">
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1">
                            {stats.streak}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">Day Streak</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                            {stats.questionsAnswered.toLocaleString()}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">Questions Solved</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                            {stats.accuracyRate}%
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">Accuracy Rate</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
                            {stats.rank > 0 ? `#${stats.rank}` : '—'}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">Avg Exam Rank</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      This Week's Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewLoading ? (
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
                          {weeklyStats.map((day) => (
                            <div key={day.dateKey} className="text-center">
                              <div className="text-xs text-gray-600 mb-1">{day.day}</div>
                              <div
                                className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                                  day.completed
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {day.hours}h
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-center">
                          <p className="text-xs sm:text-sm text-gray-600">
                            Total: {weeklyHoursTotal} hours this week
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            From exam time and content study sessions
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-3 sm:space-y-4 lg:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-600">{achievement.description}</p>
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

              <TabsContent value="progress" className="space-y-3 sm:space-y-4 lg:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
                    {/* Subject Progress */}
                    <div>
                      <h4 className="font-medium mb-4">Subject-wise Progress</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium">Physics</span>
                          <span className="text-xs sm:text-sm text-gray-600">75%</span>
                        </div>
                        <Progress value={75} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium">Chemistry</span>
                          <span className="text-xs sm:text-sm text-gray-600">62%</span>
                        </div>
                        <Progress value={62} className="h-2" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium">Mathematics</span>
                          <span className="text-xs sm:text-sm text-gray-600">58%</span>
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
                            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium">Daily Study Goal</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">3 hours</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium">Weekly Target</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">20 hours</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-3 sm:space-y-4 lg:space-y-6">
                {profileSettingsSection}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Tests Completed</span>
                  <span className="font-semibold">{(attempts as any[]).length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Best Score</span>
                  <span className="font-semibold">
                    {(attempts as any[]).length > 0
                      ? `${Math.max(...(attempts as any[]).map((a: any) => {
                          if (a.percentage != null) return Math.round(a.percentage);
                          if (a.totalMarks > 0 && a.obtainedMarks != null) return Math.round((a.obtainedMarks / a.totalMarks) * 100);
                          if (a.totalQuestions > 0 && a.correctAnswers != null) return Math.round((a.correctAnswers / a.totalQuestions) * 100);
                          return 0;
                        }))}%`
                      : 'N/A'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Study Hours</span>
                  <span className="font-semibold">
                    {overviewLoading ? '…' : `${weeklyHoursTotal}h this week`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Achievements</span>
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
                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Completed Physics test</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Watched Chemistry lecture</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Asked Vidya AI a question</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs sm:text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">Achieved study streak milestone</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}


