import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/navigation";
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star,
  Play,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Award,
  FileText,
  BarChart3,
  Video,
  BookOpen as BookIcon,
  User,
  Gamepad2
} from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-config";

export default function LearningPaths() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('No auth token found');
          setUser({ 
            fullName: "Student", 
            email: "student@example.com", 
            age: 18, 
            educationStream: "JEE" 
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const userData = await response.json();
            setUser(userData.user);
          } else {
            console.warn('User response is not JSON, using fallback data');
            setUser({ 
              fullName: "Student", 
              email: "student@example.com", 
              age: 18, 
              educationStream: "JEE" 
            });
          }
        } else {
          console.warn('User API failed, using fallback data');
          setUser({ 
            fullName: "Student", 
            email: "student@example.com", 
            age: 18, 
            educationStream: "JEE" 
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Fallback to mock data
        setUser({ 
          fullName: "Student", 
          email: "student@example.com", 
          age: 18, 
          educationStream: "JEE" 
        });
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch subjects and their content
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        
        // Fetch subjects from student endpoint (gets board-specific subjects)
        const token = localStorage.getItem('authToken');
        const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (subjectsResponse.ok) {
          const contentType = subjectsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const subjectsData = await subjectsResponse.json();
            
            console.log('📥 API Response:', subjectsData);
            
            // Handle all possible response formats
            let subjectsArray = [];
            
            if (subjectsData.subjects && Array.isArray(subjectsData.subjects)) {
              subjectsArray = subjectsData.subjects;
            } else if (subjectsData.data && Array.isArray(subjectsData.data)) {
              subjectsArray = subjectsData.data;
            } else if (Array.isArray(subjectsData)) {
              subjectsArray = subjectsData;
            } else if (subjectsData.success && subjectsData.subjects && Array.isArray(subjectsData.subjects)) {
              subjectsArray = subjectsData.subjects;
            } else if (subjectsData.success && subjectsData.data && Array.isArray(subjectsData.data)) {
              subjectsArray = subjectsData.data;
            }
            
            console.log(`📚 Extracted ${subjectsArray.length} subjects`);
            if (subjectsArray.length > 0) {
              console.log('First subject:', {
                name: subjectsArray[0].name,
                teachers: subjectsArray[0].teachers,
                teacherCount: subjectsArray[0].teacherCount
              });
            }
            
            if (!Array.isArray(subjectsArray) || subjectsArray.length === 0) {
              setSubjects([]);
              setIsLoadingSubjects(false);
              return;
            }
            
            // Fetch content for each subject - use Promise.allSettled to ensure all subjects are included
            const subjectsWithContentResults = await Promise.allSettled(
              subjectsArray.map(async (subject: any) => {
                try {
                  const subjectId = subject._id || subject.id || subject.name;
                  
                  // Fetch videos for this subject (from teacher-created content)
                  let videos = [];
                  try {
                    const videosResponse = await fetch(`${API_BASE_URL}/api/student/videos?subject=${encodeURIComponent(subjectId)}`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json',
                      }
                    });
                    
                    if (videosResponse.ok) {
                      const videosData = await videosResponse.json();
                      videos = videosData.data || videosData.videos || videosData || [];
                      if (!Array.isArray(videos)) videos = [];
                    }
                  } catch (videoError) {
                    videos = [];
                  }

                  // Fetch assessments/quizzes for this subject (from teacher-created content)
                  let assessments = [];
                  try {
                    const assessmentsResponse = await fetch(`${API_BASE_URL}/api/student/assessments?subject=${encodeURIComponent(subjectId)}`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json',
                      }
                    });
                    
                    if (assessmentsResponse.ok) {
                      const assessmentsData = await assessmentsResponse.json();
                      assessments = assessmentsData.data || assessmentsData.assessments || assessmentsData.quizzes || assessmentsData || [];
                      if (!Array.isArray(assessments)) assessments = [];
                    }
                  } catch (assessmentError) {
                    assessments = [];
                  }

                  const totalContent = videos.length + assessments.length;

                  return {
                    ...subject,
                    videos: videos,
                    quizzes: assessments,
                    assessments: assessments,
                    totalContent: totalContent
                  };
                } catch (error) {
                  return {
                    ...subject,
                    videos: [],
                    quizzes: [],
                    assessments: [],
                    totalContent: 0
                  };
                }
              })
            );
            
            // Extract all subjects (both fulfilled and rejected)
            const subjectsWithContent = subjectsWithContentResults.map((result, index) => {
              if (result.status === 'fulfilled') {
                return result.value;
              } else {
                const subject = subjectsArray[index];
                return {
                  ...subject,
                  videos: [],
                  quizzes: [],
                  assessments: [],
                  totalContent: 0
                };
              }
            });
            
            // Filter out any undefined/null subjects and ensure unique
            const validSubjects = subjectsWithContent.filter((s: any) => s && (s.name || s._id || s.id));
            const uniqueSubjects = validSubjects.filter((subject, index, self) => {
              const subjectId = subject._id || subject.id;
              return index === self.findIndex((s: any) => (s._id || s.id) === subjectId);
            });
            
            setSubjects(uniqueSubjects);
          } else {
            console.warn('⚠️ Subjects response is not JSON');
            console.warn('Response status:', subjectsResponse.status);
            console.warn('Response headers:', Object.fromEntries(subjectsResponse.headers.entries()));
            // Fallback subjects data
            setSubjects([
              {
                _id: '1',
                name: 'Mathematics',
                description: 'Advanced mathematics concepts',
                category: 'STEM',
                difficulty: 'Intermediate',
                duration: '3 hours',
                subjects: ['Algebra', 'Calculus'],
                color: 'bg-purple-100 text-purple-600',
                icon: '📐',
                videos: [],
                quizzes: [],
                assessments: [],
                students: 150,
                rating: 4.5,
                progress: 0,
                totalContent: 0
              },
              {
                _id: '2',
                name: 'Physics',
                description: 'Physics fundamentals',
                category: 'STEM',
                difficulty: 'Advanced',
                duration: '4 hours',
                subjects: ['Mechanics', 'Thermodynamics'],
                color: 'bg-blue-100 text-blue-600',
                icon: '⚛️',
                videos: [],
                quizzes: [],
                assessments: [],
                students: 120,
                rating: 4.3,
                progress: 0,
                totalContent: 0
              }
            ]);
          }
        } else {
          console.warn('Subjects API failed, using fallback data');
          // Fallback subjects data
          setSubjects([
            {
              _id: '1',
              name: 'Mathematics',
              description: 'Advanced mathematics concepts',
              category: 'STEM',
              difficulty: 'Intermediate',
              duration: '3 hours',
              subjects: ['Algebra', 'Calculus'],
              color: 'bg-purple-100 text-purple-600',
              icon: '📐',
              videos: [],
              quizzes: [],
              assessments: [],
              students: 150,
              rating: 4.5,
              progress: 0,
              totalContent: 0
            },
            {
              _id: '2',
              name: 'Physics',
              description: 'Physics fundamentals',
              category: 'STEM',
              difficulty: 'Advanced',
              duration: '4 hours',
              subjects: ['Mechanics', 'Thermodynamics'],
              color: 'bg-blue-100 text-blue-600',
              icon: '⚛️',
              videos: [],
              quizzes: [],
              assessments: [],
              students: 120,
              rating: 4.3,
              progress: 0,
              totalContent: 0
            }
          ]);
        }
      } catch (error) {
        console.error('❌ ERROR fetching subjects:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Try to show subjects even if there's an error - maybe API is down but cache works?
        console.log('Attempting fallback...');
        
        // Fallback subjects data
        setSubjects([
          {
            _id: '1',
            name: 'Mathematics',
            description: 'Advanced mathematics concepts',
            category: 'STEM',
            difficulty: 'Intermediate',
            duration: '3 hours',
            subjects: ['Algebra', 'Calculus'],
            color: 'bg-purple-100 text-purple-600',
            icon: '📐',
            videos: [],
            quizzes: [],
            assessments: [],
            students: 150,
            rating: 4.5,
            progress: 0,
            totalContent: 0
          },
          {
            _id: '2',
            name: 'Physics',
            description: 'Physics fundamentals',
            category: 'STEM',
            difficulty: 'Advanced',
            duration: '4 hours',
            subjects: ['Mechanics', 'Thermodynamics'],
            color: 'bg-blue-100 text-blue-600',
            icon: '⚛️',
            videos: [],
            quizzes: [],
            assessments: [],
            students: 120,
            rating: 4.3,
            progress: 0,
            totalContent: 0
          }
        ]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(true);

  // Fetch learning paths from API
  useEffect(() => {
    const fetchLearningPaths = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.success) {
          setLearningPaths(data.subjects || data.data || []);
        }
      } catch (error) {
        console.error('Error fetching learning paths:', error);
        // Fallback to mock data
        setLearningPaths([
          {
            _id: "1",
            name: "JEE Main 2024 Complete Preparation",
            description: "Comprehensive preparation for JEE Main with all subjects covered",
            duration: "12 months",
            students: 1250,
            rating: 4.8,
            progress: 68,
            subjects: ["Physics", "Chemistry", "Mathematics"],
            difficulty: "Advanced",
            color: "bg-blue-100 text-blue-600",
            icon: "BookOpen"
          },
          {
            _id: "2", 
            name: "NEET 2024 Biology Mastery",
            description: "Complete biology preparation for NEET with detailed explanations",
            duration: "10 months",
            students: 890,
            rating: 4.9,
            progress: 45,
            subjects: ["Biology", "Physics", "Chemistry"],
            difficulty: "Intermediate",
            color: "bg-green-100 text-green-600",
            icon: "Target"
          },
          {
            _id: "3",
            name: "UPSC Civil Services Foundation",
            description: "Foundation course for UPSC preparation with current affairs",
            duration: "18 months", 
            students: 2100,
            rating: 4.7,
            progress: 25,
            subjects: ["History", "Geography", "Polity", "Economics"],
            difficulty: "Expert",
            color: "bg-purple-100 text-purple-600",
            icon: "Award"
          }
        ]);
      } finally {
        setIsLoadingPaths(false);
      }
    };

    fetchLearningPaths();
  }, []);

  const recommendedPaths = [
    {
      id: "4",
      title: "IQ/Rank Boost Practice",
      description: "Boost your IQ and improve your rank with targeted practice",
      duration: "2 months",
      students: 3200,
      rating: 4.6,
      subjects: ["Physics", "Chemistry", "Mathematics"],
      difficulty: "Beginner",
      color: "bg-orange-100 text-orange-600",
      icon: Zap
    },
    {
      id: "5",
      title: "Play Games",
      description: "Engage in fun educational games to enhance your learning experience",
      duration: "Coming Soon",
      students: 0,
      rating: 0,
      subjects: [],
      difficulty: "Coming Soon",
      color: "bg-purple-100 text-purple-600",
      icon: Gamepad2,
      isComingSoon: true
    }
  ];

  if (isLoadingUser) {
    return (
      <>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className={`w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen ${isMobile ? 'pb-20' : ''} relative`}>
        
        {/* Robot GIF - Fixed at Bottom Left */}
        {!isMobile && (
          <div className="fixed bottom-8 left-4 z-30 pointer-events-none">
            <img 
              src="/ROBOT.gif" 
              alt="Robot" 
              className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="gradient-primary rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">
                Learning Paths for {user?.email || 'Student'}
              </h1>
              <p className="text-blue-100 mb-6">
                Choose your learning journey and master your subjects with our structured courses
              </p>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M47.1,-78.5C58.9,-69.2,64.3,-50.4,73.2,-32.8C82.1,-15.1,94.5,1.4,94.4,17.9C94.3,34.4,81.7,50.9,66.3,63.2C50.9,75.5,32.7,83.6,13.8,87.1C-5.1,90.6,-24.7,89.5,-41.6,82.1C-58.5,74.7,-72.7,61,-79.8,44.8C-86.9,28.6,-86.9,9.9,-83.2,-6.8C-79.5,-23.5,-72.1,-38.2,-61.3,-49.6C-50.5,-61,-36.3,-69.1,-21.4,-75.8C-6.5,-82.5,9.1,-87.8,25.2,-84.9C41.3,-82,57.9,-70,47.1,-78.5Z" transform="translate(100 100)"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Available Subjects */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingSubjects ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))
            ) : subjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                <p className="text-gray-500">Check back later for new learning content.</p>
              </div>
            ) : (
              subjects.map((subject: any) => {
                const getSubjectIcon = (subjectName: string) => {
                  if (subjectName.toLowerCase().includes('math')) return Target;
                  if (subjectName.toLowerCase().includes('science')) return Zap;
                  if (subjectName.toLowerCase().includes('english')) return BookIcon;
                  return BookOpen;
                };
                
                const Icon = getSubjectIcon(subject.name);
                const assignedTeachers = subject.teachers || [];
                
                console.log(`Rendering subject "${subject.name}":`, {
                  hasTeachers: assignedTeachers.length > 0,
                  teacherCount: assignedTeachers.length,
                  teachers: assignedTeachers
                });
                
                return (
                  <Card key={subject._id || subject.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {subject.totalContent || 0} items
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <p className="text-gray-600 text-sm">{subject.description || `Learn ${subject.name} with videos, quizzes, and assessments`}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Teacher Information */}
                      {assignedTeachers.length > 0 ? (
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            Assigned Teachers ({assignedTeachers.length})
                          </p>
                          <div className="space-y-2">
                            {assignedTeachers.map((teacher: any, idx: number) => (
                              <div key={teacher._id || idx} className="bg-white rounded p-2 border border-purple-100">
                                <p className="text-sm font-medium text-purple-900">{teacher.name || 'Unknown Teacher'}</p>
                                {teacher.email && (
                                  <p className="text-xs text-purple-600 mt-0.5">{teacher.email}</p>
                                )}
                                {teacher.department && (
                                  <p className="text-xs text-purple-500 mt-0.5">Dept: {teacher.department}</p>
                                )}
                                {teacher.qualifications && (
                                  <p className="text-xs text-purple-500 mt-0.5">{teacher.qualifications}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">No teacher assigned yet</p>
                        </div>
                      )}

                      {/* Content Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <Video className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                          <p className="text-xs font-medium text-blue-800">{subject.videos?.length || 0}</p>
                          <p className="text-xs text-blue-600">Videos</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <FileText className="w-4 h-4 text-green-600 mx-auto mb-1" />
                          <p className="text-xs font-medium text-green-800">{subject.quizzes?.length || 0}</p>
                          <p className="text-xs text-green-600">Quizzes</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2">
                          <BarChart3 className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                          <p className="text-xs font-medium text-orange-800">{subject.assessments?.length || 0}</p>
                          <p className="text-xs text-orange-600">Tests</p>
                        </div>
                      </div>

                      {/* Recent Content Preview */}
                      {subject.videos?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Recent Videos</p>
                          <div className="space-y-1">
                            {subject.videos.slice(0, 2).map((video: any, index: number) => (
                              <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                                <Play className="w-3 h-3 text-blue-500" />
                                <span className="truncate">{video.title}</span>
                              </div>
                            ))}
                            {subject.videos.length > 2 && (
                              <p className="text-xs text-gray-500">+{subject.videos.length - 2} more videos</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <Link href={`/subject/${subject._id || subject.id}`}>
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                          Start Learning
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Recommended Learning Paths */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommended for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendedPaths.map((path) => {
              const Icon = path.icon;
              return (
                <Card key={path.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-10 h-10 ${path.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {path.isComingSoon ? (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          Coming Soon
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {path.difficulty}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{path.title}</CardTitle>
                    <p className="text-gray-600 text-sm">{path.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Subjects - Hide for Coming Soon */}
                    {!path.isComingSoon && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Subjects</p>
                        <div className="flex flex-wrap gap-1">
                          {path.subjects.map((subject, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats - Show Coming Soon message or stats */}
                    {path.isComingSoon ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 italic">
                          Exciting educational games are on the way! Stay tuned for updates.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{path.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{path.students.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{path.rating}</span>
                        </div>
                      </div>
                    )}

                    {path.isComingSoon ? (
                      <Button variant="outline" className="w-full" disabled>
                        Coming Soon
                        <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                      </Button>
                    ) : (
                      <Link href={`/subject/${path.id}`}>
                        <Button variant="outline" className="w-full">
                          Start Learning
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Learning Management</h3>
              <p className="text-gray-600 text-sm mb-4">Build your own learning journey</p>
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Vidya AI</h3>
              <p className="text-gray-600 text-sm mb-4">Monitor your learning journey</p>
              <Button variant="outline" className="w-full">
                View Progress
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Exams</h3>
              <p className="text-gray-600 text-sm mb-4">Earn certificates for your achievements</p>
              <Button variant="outline" className="w-full">
                View Certificates
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
