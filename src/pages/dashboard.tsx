import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/navigation";
import AIChat from "@/components/ai-chat";
import ProgressChart from "@/components/progress-chart";
import { 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  Play, 
  FileText, 
  Zap,
  Calendar,
  Download,
  Users,
  Star,
  Clock,
  Award,
  Target,
  BookOpen,
  ArrowRight,
  Video,
  BookOpen as BookIcon,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Gamepad2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import YouTubePlayer from '@/components/youtube-player';
import DriveViewer from '@/components/drive-viewer';
import VideoModal from '@/components/video-modal';
import { API_BASE_URL } from '@/lib/api-config';
import { InteractiveBackground, FloatingParticles } from "@/components/background/InteractiveBackground";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [remarks, setRemarks] = useState<any[]>([]);
  const [isLoadingRemarks, setIsLoadingRemarks] = useState(false);

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
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Dashboard auth check - user data:', userData);
          setUser(userData.user);
        } else {
          console.log('Dashboard auth check failed with status:', response.status);
          // Fallback to mock data if not authenticated
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

  // Fetch content data
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const videosRes = await fetch(`${API_BASE_URL}/api/student/videos`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          setVideos((videosData.data || videosData).slice(0, 3)); // Show first 3 videos
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
        setVideos([]);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, []);

  // Fetch real dashboard data
  const [stats, setStats] = useState({ questionsAnswered: 0, accuracyRate: 0, rank: 0 });
  const [exams, setExams] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [learningPathContent, setLearningPathContent] = useState<any[]>([]);
  const [isLoadingLearningPathContent, setIsLoadingLearningPathContent] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoadingDashboard(false);
          return;
        }

        // Fetch exam results to calculate stats
        const [examsRes, resultsRes, rankingsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exams`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/student/exam-results`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE_URL}/api/student/rankings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        let examsData = [];
        if (examsRes.ok) {
          const examsJson = await examsRes.json();
          examsData = examsJson.data || [];
          setExams(examsData);
        }

        let resultsData = [];
        if (resultsRes.ok) {
          const resultsJson = await resultsRes.json();
          resultsData = resultsJson.data || [];
        }

        let rankingsData = [];
        if (rankingsRes.ok) {
          const rankingsJson = await rankingsRes.json();
          rankingsData = rankingsJson.data || [];
        }

        // Calculate real stats from exam results
        const totalQuestions = resultsData.reduce((sum: number, r: any) => sum + (r.totalQuestions || 0), 0);
        const correctAnswers = resultsData.reduce((sum: number, r: any) => sum + (r.correctAnswers || 0), 0);
        const totalMarks = resultsData.reduce((sum: number, r: any) => sum + (r.totalMarks || 0), 0);
        const obtainedMarks = resultsData.reduce((sum: number, r: any) => sum + (r.obtainedMarks || 0), 0);
        const avgAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const avgScore = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        
        // Get average rank
        const avgRank = rankingsData.length > 0 
          ? Math.round(rankingsData.reduce((sum: number, r: any) => sum + (r.rank || 0), 0) / rankingsData.length)
          : 0;

        // Fetch actual subject names from API FIRST to map exam subject keys to real names
        let subjectNameMap = new Map<string, string>(); // Maps subject keys (maths, physics, etc.) to actual names
        let subjectsList: any[] = [];
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (subjectsResponse.ok) {
              const subjectsData = await subjectsResponse.json();
              subjectsList = subjectsData.subjects || subjectsData.data || [];
              
              // Create a map from subject keys to actual names
              // Map common exam subject keys to actual subject names
              subjectsList.forEach((subject: any) => {
                const subjectName = subject.name || '';
                const subjectNameLower = subjectName.toLowerCase();
                
                // Map common variations
                if (subjectNameLower.includes('math') || subjectNameLower.includes('mathematics')) {
                  subjectNameMap.set('maths', subjectName);
                  subjectNameMap.set('mathematics', subjectName);
                }
                if (subjectNameLower.includes('physics')) {
                  subjectNameMap.set('physics', subjectName);
                }
                if (subjectNameLower.includes('chemistry')) {
                  subjectNameMap.set('chemistry', subjectName);
                }
                
                // Also map by exact name match (case-insensitive)
                subjectNameMap.set(subjectNameLower, subjectName);
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch subjects for name mapping:', error);
        }

        // Calculate subject-wise progress from exam results
        const subjectMap = new Map<string, { total: number; correct: number; exams: number }>();
        
        resultsData.forEach((result: any) => {
          if (result.subjectWiseScore && typeof result.subjectWiseScore === 'object') {
            Object.entries(result.subjectWiseScore).forEach(([subject, score]: [string, any]) => {
              if (!subjectMap.has(subject)) {
                subjectMap.set(subject, { total: 0, correct: 0, exams: 0 });
              }
              const subj = subjectMap.get(subject)!;
              subj.total += score.total || 0;
              subj.correct += score.correct || 0;
              subj.exams += 1;
            });
          }
        });

        // Convert subject map to progress array with actual subject names
        const progressArray = Array.from(subjectMap.entries()).map(([key, data]) => {
          const progress = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
          // Get actual subject name from map, or capitalize the key as fallback
          const actualName = subjectNameMap.get(key.toLowerCase()) || 
                           subjectNameMap.get(key) || 
                           key.charAt(0).toUpperCase() + key.slice(1);
          const colors = [
            'bg-blue-100 text-blue-600',
            'bg-green-100 text-green-600',
            'bg-purple-100 text-purple-600',
            'bg-orange-100 text-orange-600',
            'bg-pink-100 text-pink-600'
          ];
          return {
            id: key.toLowerCase(),
            name: actualName,
            progress: progress,
            trend: progress >= 70 ? 'up' as const : progress >= 50 ? 'neutral' as const : 'down' as const,
            currentTopic: `${actualName} - Recent Exams`,
            color: colors[Math.min(subjectMap.size - 1, Math.floor(Math.random() * colors.length))]
          };
        });

        // Fetch subject progress from learning paths (Railway backend)
        // Get all subjects assigned to the student
        let learningPathProgress: Map<string, number> = new Map();
        try {
          const token = localStorage.getItem('authToken');
          if (token && subjectsList.length > 0) {
            // Get progress for each subject from Railway backend
            for (const subject of subjectsList) {
              const subjectId = subject._id || subject.id;
              try {
                // Fetch completed content from Railway backend
                const completedResponse = await fetch(`${API_BASE_URL}/api/student/content/completed/${subjectId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (completedResponse.ok) {
                  const completedData = await completedResponse.json();
                  const completedIds = completedData.completedIds || completedData.data || [];
                  
                  // Fetch content count for this subject to calculate accurate progress
                  try {
                    const contentResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (contentResponse.ok) {
                      const contentData = await contentResponse.json();
                      const contents = contentData.data || contentData || [];
                      const totalContent = contents.length;
                      
                      if (totalContent > 0) {
                        const progress = Math.round((completedIds.length / totalContent) * 100);
                        learningPathProgress.set(subjectId, progress);
                      } else if (completedIds.length > 0) {
                        // If there's no content but items are marked, set to 0
                        learningPathProgress.set(subjectId, 0);
                      }
                    }
                  } catch (contentError) {
                    console.error('Error fetching content for subject:', subjectId, contentError);
                    // Fallback: use completed count as rough estimate
                    if (completedIds.length > 0) {
                      const progress = Math.min(100, (completedIds.length * 10));
                      learningPathProgress.set(subjectId, progress);
                    }
                  }
                }
              } catch (e) {
                console.error('Error reading progress for subject:', subjectId, e);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch learning path progress:', error);
        }

        // Merge exam progress with learning path progress
        // If a subject has both, take the average or use the higher value
        const mergedProgress = new Map<string, { progress: number; name: string; color: string; currentTopic: string }>();
        
        // Add exam-based progress
        progressArray.forEach(subj => {
          mergedProgress.set(subj.id, {
            progress: subj.progress,
            name: subj.name,
            color: subj.color,
            currentTopic: subj.currentTopic
          });
        });

        // Merge with learning path progress
        learningPathProgress.forEach((progress, subjectId) => {
          // Find the subject name from the subjects list
          const subject = subjectsList.find(s => (s._id || s.id) === subjectId);
          const subjectName = subject?.name || 'Subject';
          
          // Try to match by subject ID or find existing entry
          let existing = null;
          // Check if this subject matches any exam-based subject by name
          Array.from(mergedProgress.entries()).forEach(([key, value]) => {
            if (value.name === subjectName) {
              existing = value;
              // Update the existing entry with averaged progress
              mergedProgress.set(key, {
                ...value,
                progress: Math.round((value.progress + progress) / 2)
              });
            }
          });
          
          // If we found a match, skip adding new entry
          if (existing) {
            return;
          }
          
          // If no match found, add as new entry
          if (!existing) {
            const colors = [
              'bg-blue-100 text-blue-600',
              'bg-green-100 text-green-600',
              'bg-purple-100 text-purple-600',
              'bg-orange-100 text-orange-600',
              'bg-pink-100 text-pink-600'
            ];
            // Use subject ID as key, but display actual name
            mergedProgress.set(subjectId, {
              progress: progress,
              name: subjectName,
              color: colors[Math.floor(Math.random() * colors.length)],
              currentTopic: `${subjectName} - Learning Path`
            });
          }
        });

        // Convert to array
        const finalProgressArray = Array.from(mergedProgress.values());

        // Calculate overall progress as average of all subject progress
        const calculatedOverallProgress = finalProgressArray.length > 0
          ? Math.round(finalProgressArray.reduce((sum, s) => sum + s.progress, 0) / finalProgressArray.length)
          : 0;

        // If no subject progress from exams, set default empty
        if (finalProgressArray.length === 0) {
          setSubjectProgress([]);
          setOverallProgress(0);
        } else {
          setSubjectProgress(finalProgressArray);
          setOverallProgress(calculatedOverallProgress);
        }

        // Set calculated stats
        setStats({
          questionsAnswered: totalQuestions,
          accuracyRate: Math.round(avgAccuracy),
          rank: avgRank || 0
        });

        // Fetch learning path content for all subjects
        setIsLoadingLearningPathContent(true);
        try {
          const allContent: any[] = [];
          
          // Fetch content for each subject
          for (const subject of subjectsList) {
            const subjectId = subject._id || subject.id;
            try {
              const contentResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                const contents = contentData.data || contentData || [];
                
                // Add subject info to each content item
                contents.forEach((content: any) => {
                  allContent.push({
                    ...content,
                    subjectName: subject.name,
                    subjectId: subjectId
                  });
                });
              }
            } catch (contentError) {
              console.error('Error fetching content for subject:', subjectId, contentError);
            }
          }
          
          // Sort by upload date (newest first)
          allContent.sort((a, b) => {
            const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
            const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
            return dateB - dateA;
          });
          
          setLearningPathContent(allContent);
        } catch (error) {
          console.error('Failed to fetch learning path content:', error);
          setLearningPathContent([]);
        } finally {
          setIsLoadingLearningPathContent(false);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch subjects with their content (same as learning paths page)
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        
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
            
            if (!Array.isArray(subjectsArray) || subjectsArray.length === 0) {
              setSubjects([]);
              setIsLoadingSubjects(false);
              return;
            }
            
            // Fetch content for each subject
            const subjectsWithContentResults = await Promise.allSettled(
              subjectsArray.map(async (subject: any) => {
                try {
                  const subjectId = subject._id || subject.id || subject.name;
                  
                  // Fetch videos for this subject
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

                  // Fetch assessments/quizzes for this subject
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
            
            const validSubjects = subjectsWithContent.filter((s: any) => s && (s.name || s._id || s.id));
            const uniqueSubjects = validSubjects.filter((subject, index, self) => {
              const subjectId = subject._id || subject.id;
              return index === self.findIndex((s: any) => (s._id || s.id) === subjectId);
            });
            
            setSubjects(uniqueSubjects);
          }
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch student remarks
  useEffect(() => {
    const fetchRemarks = async () => {
      try {
        setIsLoadingRemarks(true);
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/remarks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRemarks(data.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch remarks:', error);
      } finally {
        setIsLoadingRemarks(false);
      }
    };

    fetchRemarks();
  }, []);

  const handleWatchVideo = (video: any) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Dashboard data is now handled by other queries (userData, contentData)
  // Removed problematic mock query that was causing 404 errors

  if (isLoadingUser || isLoadingContent || isLoadingDashboard) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing your dashboard</p>
          </div>
        </div>
      </>
    );
  }

  const recommendedVideos = [];
  const availableTests = exams.slice(0, 2); // Show first 2 exams as available tests

  return (
    <>
      <Navigation />
      <div className={`w-full px-2 sm:px-4 lg:px-6 pt-responsive pb-responsive bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen ${isMobile ? 'pb-20' : ''} relative overflow-hidden`}>
        {/* Interactive Background */}
        <div className="fixed inset-0 z-0">
          <InteractiveBackground />
          <FloatingParticles />
        </div>
        
        {/* Robot GIF - Fixed at Bottom Left */}
        {!isMobile && (
          <div 
            className="fixed bottom-8 left-4 z-30 cursor-pointer"
            onClick={() => setLocation('/ai-tutor')}
          >
            <img 
              src="/ROBOT.gif" 
              alt="Robot - Click to chat with Vidya AI" 
              className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300"
            />
          </div>
        )}
        
        {/* Welcome Section */}
        <div className="mb-responsive relative z-10">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-responsive p-responsive text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <h1 className="text-responsive-xl font-bold mb-responsive">
                Welcome back, {user?.email || 'Student'}!
              </h1>
              <p className="text-white/90 mb-responsive text-responsive-sm">
                Ready to continue your {user?.educationStream || 'JEE'} preparation journey? Your Vidya AI has personalized recommendations waiting.
              </p>
              
              <div className="flex-responsive-col gap-responsive">
                <Button 
                  className="bg-white text-primary hover:bg-blue-50 w-full sm:w-auto"
                  onClick={() => setLocation('/learning-paths')}
                >
                  Continue Learning
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 w-full sm:w-auto"
                  onClick={() => setLocation('/ai-tutor')}
                >
                  Ask Vidya AI
                </Button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M47.1,-78.5C58.9,-69.2,64.3,-50.4,73.2,-32.8C82.1,-15.1,94.5,1.4,94.4,17.9C94.3,34.4,81.7,50.9,66.3,63.2C50.9,75.5,32.7,83.6,13.8,87.1C-5.1,90.6,-24.7,89.5,-41.6,82.1C-58.5,74.7,-72.7,61,-79.8,44.8C-86.9,28.6,-86.9,9.9,-83.2,-6.8C-79.5,-23.5,-72.1,-38.2,-61.3,-49.6C-50.5,-61,-36.3,-69.1,-21.4,-75.8C-6.5,-82.5,9.1,-87.8,25.2,-84.9C41.3,-82,57.9,-70,47.1,-78.5Z" transform="translate(100 100)"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Teacher Remarks Section */}
        {remarks.length > 0 && (
          <div className="mb-responsive relative z-10">
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Teacher Remarks
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {remarks.slice(0, 5).map((remark: any) => (
                    <div
                      key={remark._id}
                      className={`p-4 rounded-lg border-l-4 ${
                        remark.isPositive
                          ? 'bg-green-50 border-green-500'
                          : 'bg-orange-50 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {remark.isPositive ? (
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                          )}
                          <span className="font-semibold text-gray-900">
                            {remark.teacherId?.fullName || 'Teacher'}
                          </span>
                          {remark.subject && (
                            <Badge variant="outline" className="text-xs">
                              {remark.subject.name}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(remark.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{remark.remark}</p>
                    </div>
                  ))}
                  {remarks.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      Showing 5 of {remarks.length} remarks
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid-responsive-3 gap-responsive mb-responsive relative z-10">
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Questions Solved</p>
                  <p className="text-responsive-xl font-bold text-white">{stats.questionsAnswered.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Accuracy Rate</p>
                  <p className="text-responsive-xl font-bold text-white">{stats.accuracyRate}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-responsive-xs font-medium">Rank</p>
                  <p className="text-responsive-xl font-bold text-white">#{stats.rank}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          
          {/* Left Column: Learning Path & Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Learning Progress */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Your Learning Progress</CardTitle>
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                    {user?.educationStream || 'JEE'} 2024
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Overview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-responsive-xs font-medium text-gray-700">Overall Progress</span>
                    <span className="text-responsive-xs font-medium text-primary">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>

                {/* Subject Progress */}
                <div className="space-y-4">
                  {subjectProgress.length > 0 ? subjectProgress.map((subject) => (
                    <div key={subject.id} className="subject-progress-card">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${subject.color}`}>
                          <span className="text-responsive-xs font-medium">
                            {subject.name.substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{subject.name}</h3>
                          <p className="text-responsive-xs text-gray-600">{subject.currentTopic}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-responsive-xs font-medium text-gray-900">{subject.progress}%</p>
                        <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-primary h-1 rounded-full" 
                            style={{ width: `${subject.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500">
                      Complete exams to see your subject-wise progress
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  onClick={() => setLocation('/learning-paths')}
                >
                  View Complete Learning Path
                </Button>
              </CardContent>
            </Card>

            {/* Learning Paths */}
            <div id="learning-paths-section" className="mb-6 scroll-mt-24">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Learning Paths</h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-6">Available Subjects</h2>
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
                    
                    return (
                      <Card key={subject._id || subject.id} className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105">
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
                            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg">
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Recommended for You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
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
                ].map((path) => {
                  const Icon = path.icon;
                  return (
                    <Card key={path.id} className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-10 h-10 ${path.color} rounded-lg flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          {/* Show Coming Soon badge for Play Games, difficulty badge for others */}
                          {path.isComingSoon ? (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                              Coming Soon
                            </Badge>
                          ) : path.id !== "4" && (
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
                          <Link href={path.id === "4" ? "/iq-rank-boost-subjects" : `/subject-content/${path.id}`}>
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
              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-shadow duration-200">
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

              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-shadow duration-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Vidya AI</h3>
                  <p className="text-gray-600 text-sm mb-4">Monitor your learning journey</p>
                  <Button variant="outline" className="w-full border-purple-200 text-purple-800 hover:bg-purple-50">
                    View Progress
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-shadow duration-200">
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

          {/* Right Column: Vidya AI & Performance */}
          <div className="space-y-6">
            
            {/* AI Chat */}
            <AIChat 
              userId={MOCK_USER_ID}
              context={{
                currentSubject: "Physics",
                currentTopic: "Rotational Motion"
              }}
            />

            {/* Performance Dashboard */}
            <ProgressChart 
              subjects={subjectProgress.length > 0 ? subjectProgress : []}
              overallProgress={overallProgress}
            />

            {/* Quick Actions */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    className="quick-action-button"
                    onClick={() => setLocation('/learning-paths')}
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                      <TrendingUp className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-responsive-xs font-medium text-gray-900">Practice Weak Topics</p>
                  </button>

                  <button 
                    className="quick-action-button"
                    onClick={() => alert('Schedule Study feature coming soon!')}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-responsive-xs font-medium text-gray-900">Schedule Study</p>
                  </button>

                  <button 
                    className="quick-action-button"
                    onClick={() => setLocation('/asli-prep-content')}
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                      <Download className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-responsive-xs font-medium text-gray-900">Download Notes</p>
                  </button>

                  <button 
                    className="quick-action-button"
                    onClick={() => alert('Study Groups feature coming soon!')}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-responsive-xs font-medium text-gray-900">Study Groups</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="achievement-card">
                  <div className="w-8 h-8 gradient-accent rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-responsive-xs font-medium text-gray-900">Quiz Champion</p>
                    <p className="text-xs text-gray-600">90% accuracy in daily quizzes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo}
      />
    </>
  );
}