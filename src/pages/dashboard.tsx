import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Gamepad2,
  Calculator,
  Atom,
  FlaskConical,
  Microscope,
  FileText as FileTextIcon,
  Video as VideoIcon,
  Image as ImageIcon,
  File,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ClipboardList,
  Headphones,
  Target as TargetIcon,
  GraduationCap,
  BarChart3 as BarChartIcon,
  Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import YouTubePlayer from '@/components/youtube-player';
import DriveViewer from '@/components/drive-viewer';
import VideoModal from '@/components/video-modal';
import { API_BASE_URL } from '@/lib/api-config';
import {
  getTodayStudyTime,
  getWeeklyStudyTime,
  updateStudyTime,
  startSession,
  endSession,
  getWeeklyStudyData
} from '@/utils/studyTimeTracker';
import '@/utils/debugStudyTime'; // Load debug helper
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
  const [learningPathTab, setLearningPathTab] = useState<'subjects' | 'quizzes'>('subjects');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [contentTypeCounts, setContentTypeCounts] = useState({
    TextBook: 0,
    Workbook: 0,
    Material: 0,
    Video: 0,
    Audio: 0,
    Homework: 0
  });
  const [isLoadingContentCounts, setIsLoadingContentCounts] = useState(false);
  const [selectedBrowseType, setSelectedBrowseType] = useState<'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework' | null>(null);
  const [filteredContent, setFilteredContent] = useState<any[]>([]);
  const [isLoadingFilteredContent, setIsLoadingFilteredContent] = useState(false);
  const [allContent, setAllContent] = useState<any[]>([]);
  const [studyTimeToday, setStudyTimeToday] = useState<number>(0); // in minutes
  const [studyTimeThisWeek, setStudyTimeThisWeek] = useState<number>(0); // in minutes
  const [weeklyStudyData, setWeeklyStudyData] = useState<{ [key: string]: number }>({}); // Daily study time in minutes
  const [incompleteContent, setIncompleteContent] = useState<any[]>([]);
  const [incompleteQuizzes, setIncompleteQuizzes] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set());

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

        // Fetch subject progress from learning paths (localStorage)
        // Get all subjects assigned to the student
        let learningPathProgress: Map<string, number> = new Map();
        try {
          const token = localStorage.getItem('authToken');
          if (token && subjectsList.length > 0) {
            // Get progress for each subject from localStorage and content count
            for (const subject of subjectsList) {
              const subjectId = subject._id || subject.id;
              try {
                const stored = localStorage.getItem(`completed_content_${subjectId}`);
                if (stored) {
                  const completedIds = JSON.parse(stored);
                  
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

  // Fetch assigned quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoadingQuizzes(true);
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data.data || []);
        } else {
          setQuizzes([]);
        }
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        setQuizzes([]);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };

    fetchQuizzes();
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

  // Fetch content type counts for Digital Library
  useEffect(() => {
    const fetchContentCounts = async () => {
      try {
        setIsLoadingContentCounts(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsLoadingContentCounts(false);
          return;
        }
        
        // Fetch all content to count by type
        const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const fetchedContent = data.data || data || [];
          setAllContent(fetchedContent);
          
          // Count by type
          const counts = {
            TextBook: 0,
            Workbook: 0,
            Material: 0,
            Video: 0,
            Audio: 0,
            Homework: 0
          };
          
          fetchedContent.forEach((content: any) => {
            const contentType = content.type;
            if (counts.hasOwnProperty(contentType)) {
              counts[contentType as keyof typeof counts]++;
            }
          });
          
          setContentTypeCounts(counts);
        }
      } catch (error) {
        console.error('Failed to fetch content counts:', error);
      } finally {
        setIsLoadingContentCounts(false);
      }
    };

    fetchContentCounts();
  }, []);

  // Filter content when browse type is selected
  useEffect(() => {
    if (!selectedBrowseType) {
      setFilteredContent([]);
      return;
    }

    setIsLoadingFilteredContent(true);
    
    // Filter by the selected content type
    const filtered = allContent.filter((content: any) => content.type === selectedBrowseType);
    
    setFilteredContent(filtered);
    setIsLoadingFilteredContent(false);
  }, [selectedBrowseType, allContent]);

  // Track study time using timestamp module (ignores background time)
  useEffect(() => {
    // Start session when component mounts
    startSession();
    
    // Update display every 1 second for real-time updates
    const displayInterval = setInterval(() => {
      try {
        const times = updateStudyTime();
        // Always update state to trigger re-render
        // The calculation includes active session time which changes every second
        setStudyTimeToday(times.today);
        setStudyTimeThisWeek(times.thisWeek);
        
        // Update weekly data for Weekly Overview
        const weeklyData = getWeeklyStudyData();
        setWeeklyStudyData(weeklyData);
      } catch (error) {
        console.error('Error updating study time:', error);
      }
    }, 1000); // Update every 1 second for real-time feel
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden - end session (stops tracking time)
        endSession();
      } else {
        // Page became visible - start new session
        startSession();
      }
      
      // Update display immediately
      const times = updateStudyTime();
      setStudyTimeToday(times.today);
      setStudyTimeThisWeek(times.thisWeek);
      const weeklyData = getWeeklyStudyData();
      setWeeklyStudyData(weeklyData);
    };
    
    // Handle window focus/blur
    const handleFocus = () => {
      if (!document.hidden) {
        startSession();
        const times = updateStudyTime();
        setStudyTimeToday(times.today);
        setStudyTimeThisWeek(times.thisWeek);
      }
    };
    
    const handleBlur = () => {
      endSession();
      const times = updateStudyTime();
      setStudyTimeToday(times.today);
      setStudyTimeThisWeek(times.thisWeek);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Initial update
    const initialTimes = updateStudyTime();
    setStudyTimeToday(initialTimes.today);
    setStudyTimeThisWeek(initialTimes.thisWeek);
    const initialWeeklyData = getWeeklyStudyData();
    setWeeklyStudyData(initialWeeklyData);
    
    // Cleanup on unmount
    return () => {
      clearInterval(displayInterval);
      endSession(); // End session when component unmounts
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  // Fetch incomplete content and quizzes for To-Dos
  useEffect(() => {
    const fetchScheduleItems = async () => {
      try {
        setIsLoadingSchedule(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsLoadingSchedule(false);
          return;
        }

        // Fetch all content
        const contentResponse = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        // Fetch all quizzes
        const quizzesResponse = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        let allContent: any[] = [];
        let allQuizzes: any[] = [];

        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          const rawContent = contentData.data || contentData || [];
          
          // Process content to ensure fileUrl is properly formatted
          allContent = rawContent.map((content: any) => {
            // Ensure fileUrl is a full URL if it's a relative path
            if (content.fileUrl) {
              let fileUrl = content.fileUrl;
              // If it's not already a full URL (http/https), construct it
              if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
                if (fileUrl.startsWith('/')) {
                  fileUrl = `${API_BASE_URL}${fileUrl}`;
                } else {
                  fileUrl = `${API_BASE_URL}/${fileUrl}`;
                }
              }
              return { ...content, fileUrl };
            }
            return content;
          });
        }

        if (quizzesResponse.ok) {
          const quizzesData = await quizzesResponse.json();
          allQuizzes = quizzesData.data || quizzesData || [];
        }

        // Get completed content IDs from localStorage (check all subjects)
        const completedContentIds = new Set<string>();
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.startsWith('completed_content_')) {
            try {
              const completed = JSON.parse(localStorage.getItem(key) || '[]');
              completed.forEach((id: string) => completedContentIds.add(id));
            } catch (e) {
              // Ignore parse errors
            }
          }
        });

        // Filter incomplete content
        const incomplete = allContent.filter((content: any) => {
          const contentId = content._id || content.id;
          return !completedContentIds.has(contentId);
        });

        // Filter incomplete quizzes (not attempted or not completed)
        const incompleteQuiz = allQuizzes.filter((quiz: any) => {
          return !quiz.hasAttempted || !quiz.completedAt;
        });

        // Sort by creation date (newest first) and limit to 10 items
        incomplete.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateB - dateA;
        });

        incompleteQuiz.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setIncompleteContent(incomplete.slice(0, 10));
        setIncompleteQuizzes(incompleteQuiz.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch schedule items:', error);
        setIncompleteContent([]);
        setIncompleteQuizzes([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchScheduleItems();
  }, []);

  // Load completed schedule items from localStorage (only for today)
  useEffect(() => {
    const loadCompletedSchedule = () => {
      const TODAY_KEY = new Date().toDateString();
      const stored = localStorage.getItem('completed_schedule_items');
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          
          // Check if data structure includes dates (new format) or is just an array (old format)
          if (data.date && data.completedIds) {
            // New format with dates
            if (data.date === TODAY_KEY) {
              // Same day, use the completed IDs
              setCompletedScheduleIds(new Set(data.completedIds));
            } else {
              // Different day, clear the data
              localStorage.setItem('completed_schedule_items', JSON.stringify({
                date: TODAY_KEY,
                completedIds: []
              }));
              setCompletedScheduleIds(new Set());
            }
          } else if (Array.isArray(data)) {
            // Old format (just array), migrate to new format
            localStorage.setItem('completed_schedule_items', JSON.stringify({
              date: TODAY_KEY,
              completedIds: []
            }));
            setCompletedScheduleIds(new Set());
          } else {
            setCompletedScheduleIds(new Set());
          }
        } catch (e) {
          setCompletedScheduleIds(new Set());
        }
      } else {
        // Initialize with today's date
        localStorage.setItem('completed_schedule_items', JSON.stringify({
          date: TODAY_KEY,
          completedIds: []
        }));
        setCompletedScheduleIds(new Set());
      }
    };
    
    loadCompletedSchedule();
    
    // Check for date changes periodically (every minute)
    const dateCheckInterval = setInterval(() => {
      const TODAY_KEY = new Date().toDateString();
      const stored = localStorage.getItem('completed_schedule_items');
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.date && data.date !== TODAY_KEY) {
            // Date changed, clear completed items
            localStorage.setItem('completed_schedule_items', JSON.stringify({
              date: TODAY_KEY,
              completedIds: []
            }));
            setCompletedScheduleIds(new Set());
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(dateCheckInterval);
  }, []);

  // Handle mark as complete
  const handleMarkAsComplete = (item: any, isQuiz: boolean = false) => {
    const TODAY_KEY = new Date().toDateString();
    const itemId = item._id || item.id;
    const newCompleted = new Set(completedScheduleIds);
    newCompleted.add(itemId);
    setCompletedScheduleIds(newCompleted);
    
    // Save to localStorage with today's date
    localStorage.setItem('completed_schedule_items', JSON.stringify({
      date: TODAY_KEY,
      completedIds: Array.from(newCompleted)
    }));
    
    // If it's content, also mark it in the subject's completed content
    if (!isQuiz && item.subjectId) {
      const subjectId = typeof item.subjectId === 'object' ? item.subjectId._id : item.subjectId;
      const subjectKey = `completed_content_${subjectId}`;
      const stored = localStorage.getItem(subjectKey);
      let completed = stored ? JSON.parse(stored) : [];
      if (!completed.includes(itemId)) {
        completed.push(itemId);
        localStorage.setItem(subjectKey, JSON.stringify(completed));
      }
    }
    
    // Close preview
    setIsPreviewOpen(false);
    setSelectedScheduleItem(null);
  };

  // Handle opening preview
  const handleOpenPreview = (item: any, isQuiz: boolean = false) => {
    setSelectedScheduleItem({ ...item, isQuiz });
    setIsPreviewOpen(true);
  };

  // Helper function for content type label (used in modal)
  const getContentTypeLabel = (type: string) => {
    if (type === 'Video') return 'Watch';
    if (type === 'TextBook' || type === 'Workbook') return 'Read';
    if (type === 'Material') return 'Review';
    return 'Complete';
  };

  // Helper function for priority color (used in modal)
  const getPriorityColor = (difficulty?: string) => {
    if (difficulty === 'Hard' || difficulty === 'Expert') return 'bg-red-100 text-red-700';
    if (difficulty === 'Medium') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Helper function for subject name (used in modal)
  const getSubjectName = (contentItem: any): string => {
    if (typeof contentItem.subjectId === 'object' && contentItem.subjectId?.name) {
      return contentItem.subjectId.name;
    }
    if (typeof contentItem.subject === 'string') {
      return contentItem.subject;
    }
    if (typeof contentItem.subject === 'object' && contentItem.subject?.name) {
      return contentItem.subject.name;
    }
    return 'Unknown Subject';
  };

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

        {/* AI Study Planner Section */}
        <div className="mb-responsive relative z-10">
          {/* Header */}
          <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-2xl p-6 mb-6 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 flex items-center justify-center space-x-3">
              <Calendar className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">AI Study Planner</h2>
                <p className="text-white/90 text-sm">Smart scheduling powered by AI to optimize your learning</p>
              </div>
            </div>
          </div>

          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Today's Progress */}
            <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Progress</p>
                    {(() => {
                      const totalTodos = incompleteContent.length + incompleteQuizzes.length;
                      const completedTodos = incompleteContent.filter((c: any) => completedScheduleIds.has(c._id)).length + 
                                           incompleteQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
                      const percentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
                      return (
                        <>
                          <p className="text-2xl font-bold text-teal-600">{completedTodos}/{totalTodos}</p>
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Tasks completed</span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Study Time */}
            <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Study Time</p>
                    <p className="text-2xl font-bold text-orange-600 transition-all duration-300">
                      {studyTimeToday >= 60 
                        ? `${(studyTimeToday / 60).toFixed(1)}h` 
                        : studyTimeToday < 1 && studyTimeToday > 0
                        ? '<1m'
                        : `${Math.round(studyTimeToday)}m`}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Logged in today</p>
              </CardContent>
            </Card>

            {/* This Week */}
            <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-purple-600 transition-all duration-300">
                      {studyTimeThisWeek >= 60 
                        ? `${(studyTimeThisWeek / 60).toFixed(1)}h` 
                        : studyTimeThisWeek < 1 && studyTimeThisWeek > 0
                        ? '<1m'
                        : `${Math.round(studyTimeThisWeek)}m`}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Logged in this week</p>
              </CardContent>
            </Card>

            {/* Efficiency */}
            <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Efficiency</p>
                    {(() => {
                      const totalTodos = incompleteContent.length + incompleteQuizzes.length;
                      const completedTodos = incompleteContent.filter((c: any) => completedScheduleIds.has(c._id)).length + 
                                             incompleteQuizzes.filter((q: any) => completedScheduleIds.has(q._id)).length;
                      const efficiency = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
                      return (
                        <p className="text-2xl font-bold text-green-600">{efficiency}%</p>
                      );
                    })()}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Completion rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Overview */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Weekly Overview</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Your study plan for this week</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                  // Get the date for this day of the week
                  const today = new Date();
                  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                  const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Convert to Monday = 0
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() - daysFromMonday + index);
                  const dateKey = targetDate.toDateString();
                  
                  const studyMinutes = weeklyStudyData[dateKey] || 0;
                  const studyHours = (studyMinutes / 60).toFixed(1);
                  const maxHours = 8; // Maximum hours to show on scale
                  const percentage = Math.min((studyMinutes / 60 / maxHours) * 100, 100);
                  
                  return (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                        {day.slice(0, 3)}
                      </div>
                      <div className="flex-1 relative">
                        <div className="w-full h-6 bg-purple-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-sm text-gray-500 text-right flex-shrink-0">
                        {studyHours}h
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* To-Dos */}
          <Card className="bg-white rounded-xl shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">To-Dos</CardTitle>
                </div>
                <p className="text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSchedule ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading schedule...</p>
                </div>
              ) : incompleteContent.length === 0 && incompleteQuizzes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-gray-500 text-sm mt-1">No pending content or quizzes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Incomplete Quizzes */}
                  {incompleteQuizzes.map((quiz: any) => {
                    const getPriorityColor = (difficulty: string) => {
                      if (difficulty === 'Hard' || difficulty === 'Expert') return 'bg-red-100 text-red-700';
                      if (difficulty === 'Medium') return 'bg-orange-100 text-orange-700';
                      return 'bg-blue-100 text-blue-700';
                    };

                    const getPriorityLabel = (difficulty: string) => {
                      if (difficulty === 'Hard' || difficulty === 'Expert') return 'high';
                      if (difficulty === 'Medium') return 'medium';
                      return 'low';
                    };

                    const isCompleted = completedScheduleIds.has(quiz._id);
                    
                    return (
                      <div 
                        key={`quiz-${quiz._id}`}
                        className={`flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                          isCompleted ? 'bg-green-50' : ''
                        }`}
                        onClick={() => handleOpenPreview(quiz, true)}
                      >
                        {isCompleted ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex-shrink-0 mt-0.5"></div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className={`font-medium text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                              Complete {quiz.title || 'Quiz'}
                            </h4>
                            <Badge className={`${getPriorityColor(quiz.difficulty || 'Easy')} text-xs`}>
                              {getPriorityLabel(quiz.difficulty || 'Easy')}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              {typeof quiz.subject === 'string' 
                                ? quiz.subject 
                                : (typeof quiz.subject === 'object' && quiz.subject?.name 
                                  ? quiz.subject.name 
                                  : 'Unknown Subject')}
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{quiz.duration || 30} min</span>
                            </span>
                            {quiz.questionCount > 0 && (
                              <span>{quiz.questionCount} questions</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Incomplete Content */}
                  {incompleteContent.map((content: any) => {
                    const getPriorityColorForContent = () => {
                      // Homework is always high priority
                      if (content.type === 'Homework') {
                        return 'bg-red-100 text-red-700';
                      }
                      // You can add logic here based on content properties
                      return 'bg-blue-100 text-blue-700';
                    };

                    const getPriorityLabel = () => {
                      if (content.type === 'Homework') {
                        return 'high';
                      }
                      return 'medium';
                    };
                    
                    const subjectName = getSubjectName(content);

                    const isCompleted = completedScheduleIds.has(content._id);
                    const isHomework = content.type === 'Homework';
                    const deadline = content.deadline ? new Date(content.deadline) : null;
                    const isOverdue = deadline && deadline < new Date() && !isCompleted;
                    
                    return (
                      <div 
                        key={`content-${content._id}`}
                        className={`flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                          isCompleted ? 'bg-green-50' : ''
                        } ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
                        onClick={() => handleOpenPreview(content, false)}
                      >
                        {isCompleted ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex-shrink-0 mt-0.5"></div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className={`font-medium text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                              {getContentTypeLabel(content.type || 'Material')} {content.title || 'Content'}
                            </h4>
                            <Badge className={`${getPriorityColorForContent()} text-xs`}>{getPriorityLabel()}</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{subjectName}</span>
                            {content.type && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{content.type}</span>
                            )}
                            {isHomework && deadline && (
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                isOverdue ? 'bg-red-100 text-red-700' : 'text-red-600'
                              }`}>
                                Due: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
              
              {/* Tabs */}
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setLearningPathTab('subjects')}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-md transition-all ${
                      learningPathTab === 'subjects'
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Browse by Subject
                  </button>
                  <button
                    onClick={() => setLearningPathTab('quizzes')}
                    className={`flex-1 px-6 py-3 text-sm font-medium rounded-md transition-all ${
                      learningPathTab === 'quizzes'
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Quizzes
                  </button>
                </div>
              </div>

              {/* Browse by Subject Tab */}
              {learningPathTab === 'subjects' && (
                <>
                  <h2 className="text-xl font-semibold text-gray-700 mb-6">Browse by Subject</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      const name = subjectName.toLowerCase();
                      if (name.includes('math') || name.includes('mathematics')) return Calculator;
                      if (name.includes('physics')) return Atom;
                      if (name.includes('chemistry')) return FlaskConical;
                      if (name.includes('biology')) return Microscope;
                      if (name.includes('english')) return BookIcon;
                      if (name.includes('science')) return Zap;
                      return BookOpen;
                    };
                    
                    const Icon = getSubjectIcon(subject.name);
                    const assignedTeachers = subject.teachers || [];
                    
                    return (
                      <Card 
                        key={subject._id || subject.id} 
                        className="hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200"
                        onClick={() => window.location.href = `/subject/${subject._id || subject.id}`}
                      >
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                            <Icon className="w-10 h-10 text-white" />
                          </div>
                          <CardTitle className="text-lg font-semibold text-gray-900">{subject.name}</CardTitle>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
                  </div>
                </>
              )}

              {/* My Quizzes Tab */}
              {learningPathTab === 'quizzes' && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-700 mb-6">My Quizzes</h2>
                  {isLoadingQuizzes ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full" />
                      ))}
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Quizzes Assigned</h3>
                      <p className="text-gray-500">Your teacher hasn't assigned any quizzes yet. Check back later!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {quizzes.map((quiz: any) => (
                        <Card key={quiz._id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                          <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                                <FileText className="w-6 h-6 text-white" />
                              </div>
                              {quiz.hasAttempted && (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            <p className="text-gray-600 text-sm">{quiz.description || `Quiz on ${quiz.subject?.name || quiz.subject}`}</p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="bg-purple-50 rounded-lg p-2">
                                <Clock className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                                <p className="text-xs font-medium text-purple-800">{quiz.duration || 60} min</p>
                                <p className="text-xs text-purple-600">Duration</p>
                              </div>
                              <div className="bg-pink-50 rounded-lg p-2">
                                <Target className="w-4 h-4 text-pink-600 mx-auto mb-1" />
                                <p className="text-xs font-medium text-pink-800">{quiz.questions?.length || quiz.questionCount || 0}</p>
                                <p className="text-xs text-pink-600">Questions</p>
                              </div>
                            </div>
                            
                            {quiz.hasAttempted && quiz.bestScore !== null && (
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-700">Best Score:</span>
                                  <span className="text-lg font-bold text-green-800">{quiz.bestScore}%</span>
                                </div>
                              </div>
                            )}
                            
                            <Button
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                              onClick={() => window.location.href = `/quiz/${quiz._id}`}
                            >
                              {quiz.hasAttempted ? 'Review Quiz' : 'Start Quiz'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Digital Library - Browse by Type */}
            <div className="mb-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Digital Library</h2>
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Browse by Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* TextBook Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'TextBook' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'TextBook' ? null : 'TextBook';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <BookOpen className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">TextBook</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.TextBook} files`}
                    </p>
                  </CardContent>
                </Card>

                {/* Workbook Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'Workbook' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'Workbook' ? null : 'Workbook';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <FileTextIcon className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Workbook</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.Workbook} files`}
                    </p>
                  </CardContent>
                </Card>

                {/* Material Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'Material' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'Material' ? null : 'Material';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <File className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Material</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.Material} files`}
                    </p>
                  </CardContent>
                </Card>

                {/* Video Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'Video' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'Video' ? null : 'Video';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <VideoIcon className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Video</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.Video} files`}
                    </p>
                  </CardContent>
                </Card>

                {/* Audio Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'Audio' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'Audio' ? null : 'Audio';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <Headphones className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Audio</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.Audio} files`}
                    </p>
                  </CardContent>
                </Card>

                {/* Homework Card */}
                <Card 
                  className={`hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-white border border-gray-200 ${
                    selectedBrowseType === 'Homework' ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    const newType = selectedBrowseType === 'Homework' ? null : 'Homework';
                    setSelectedBrowseType(newType);
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md mb-4">
                      <ClipboardList className="w-10 h-10 text-white" strokeWidth={2.5} fill="none" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Homework</CardTitle>
                    <p className="text-sm text-gray-500">
                      {isLoadingContentCounts ? '...' : `${contentTypeCounts.Homework} files`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Expandable Content Section */}
              {selectedBrowseType && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedBrowseType} ({filteredContent.length} {filteredContent.length === 1 ? 'file' : 'files'})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBrowseType(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Collapse
                    </Button>
                  </div>
                  
                  {isLoadingFilteredContent ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading content...</p>
                    </div>
                  ) : filteredContent.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No content found for this type.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredContent.map((content: any) => {
                        const getContentIcon = () => {
                          if (content.type === 'Video') return VideoIcon;
                          if (content.fileUrl) {
                            const url = content.fileUrl.toLowerCase();
                            if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return ImageIcon;
                            if (url.endsWith('.pdf') || url.includes('pdf')) return File;
                          }
                          return FileTextIcon;
                        };
                        
                        const ContentIcon = getContentIcon();
                        const isImage = content.fileUrl && content.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
                        const isPDF = content.fileUrl && (content.fileUrl.toLowerCase().endsWith('.pdf') || content.fileUrl.includes('pdf'));
                        
                        return (
                          <Card key={content._id || content.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <ContentIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-900 mb-1 truncate">{content.title || 'Untitled'}</h5>
                                  {content.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{content.description}</p>
                                  )}
                                  {content.subjectId && typeof content.subjectId === 'object' && content.subjectId.name && (
                                    <Badge variant="outline" className="text-xs mb-2">
                                      {content.subjectId.name}
                                    </Badge>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    {content.fileUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => window.open(content.fileUrl, '_blank')}
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        {isImage ? 'View' : isPDF ? 'Open PDF' : 'Open'}
                                      </Button>
                                    )}
                                    {content.fileUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = content.fileUrl;
                                          link.download = content.title || 'download';
                                          link.click();
                                        }}
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        Download
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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

      {/* Content Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedScheduleItem && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedScheduleItem.isQuiz 
                    ? `Quiz: ${selectedScheduleItem.title || 'Untitled Quiz'}`
                    : `${getContentTypeLabel(selectedScheduleItem.type || 'Material')}: ${selectedScheduleItem.title || 'Untitled Content'}`}
                </DialogTitle>
                <DialogDescription>
                  {selectedScheduleItem.isQuiz 
                    ? selectedScheduleItem.description || 'Complete this quiz to test your knowledge'
                    : selectedScheduleItem.description || 'Review this content to enhance your learning'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedScheduleItem.isQuiz ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Subject</p>
                        <p className="text-sm text-gray-900">
                          {typeof selectedScheduleItem.subject === 'string' 
                            ? selectedScheduleItem.subject 
                            : (typeof selectedScheduleItem.subject === 'object' && selectedScheduleItem.subject?.name 
                              ? selectedScheduleItem.subject.name 
                              : 'Unknown Subject')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Difficulty</p>
                        <Badge className={`${getPriorityColor(selectedScheduleItem.difficulty || 'Easy')} text-xs`}>
                          {selectedScheduleItem.difficulty || 'Easy'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Duration</p>
                        <p className="text-sm text-gray-900 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{selectedScheduleItem.duration || 30} minutes</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Questions</p>
                        <p className="text-sm text-gray-900">{selectedScheduleItem.questionCount || 0} questions</p>
                      </div>
                    </div>
                    {selectedScheduleItem.totalPoints && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Total Points</p>
                        <p className="text-sm text-gray-900">{selectedScheduleItem.totalPoints} points</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Subject</p>
                        <p className="text-sm text-gray-900">
                          {getSubjectName(selectedScheduleItem)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Type</p>
                        <Badge className="text-xs bg-gray-100 text-gray-700">
                          {selectedScheduleItem.type || 'Material'}
                        </Badge>
                      </div>
                    </div>
                    {selectedScheduleItem.fileUrl && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">Content Preview</p>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = selectedScheduleItem.fileUrl;
                                const fullUrl = url && !url.startsWith('http') && !url.startsWith('//')
                                  ? (url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`)
                                  : url;
                                window.open(fullUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = selectedScheduleItem.fileUrl;
                                const fullUrl = url && !url.startsWith('http') && !url.startsWith('//')
                                  ? (url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`)
                                  : url;
                                const link = document.createElement('a');
                                link.href = fullUrl;
                                link.download = selectedScheduleItem.title || 'download';
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        {/* Content Preview */}
                        {(() => {
                          // Ensure fileUrl is properly formatted
                          let fileUrl = selectedScheduleItem.fileUrl || '';
                          if (fileUrl && !fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
                            if (fileUrl.startsWith('/')) {
                              fileUrl = `${API_BASE_URL}${fileUrl}`;
                            } else {
                              fileUrl = `${API_BASE_URL}/${fileUrl}`;
                            }
                          }
                          
                          const fileUrlLower = fileUrl.toLowerCase();
                          const isVideo = selectedScheduleItem.type === 'Video' || 
                                         fileUrlLower.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/) ||
                                         fileUrlLower.includes('youtube.com') || 
                                         fileUrlLower.includes('youtu.be');
                          const isPDF = fileUrlLower.endsWith('.pdf') || fileUrlLower.includes('pdf');
                          const isAudio = selectedScheduleItem.type === 'Audio' || 
                                         fileUrlLower.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/);
                          const isImage = fileUrlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/);
                          const isGoogleDrive = fileUrlLower.includes('drive.google.com');
                          
                          if (isVideo) {
                            if (fileUrlLower.includes('youtube.com') || fileUrlLower.includes('youtu.be')) {
                              // YouTube video
                              const getYouTubeId = (url: string) => {
                                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                const match = url.match(regExp);
                                return (match && match[2].length === 11) ? match[2] : null;
                              };
                              const videoId = getYouTubeId(fileUrl);
                              return videoId ? (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                  <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={selectedScheduleItem.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                  <VideoIcon className="w-12 h-12 text-gray-400" />
                                  <p className="ml-2 text-gray-600">Video preview not available</p>
                                </div>
                              );
                            } else {
                              // Regular video
                              return (
                                <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                  <video
                                    src={fileUrl}
                                    controls
                                    className="w-full h-full"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              );
                            }
                          }
                          
                          if (isPDF) {
                            return (
                              <div className="w-full h-[60vh] bg-gray-100 rounded-lg overflow-hidden">
                                <iframe
                                  src={fileUrl}
                                  className="w-full h-full border-0"
                                  title={selectedScheduleItem.title}
                                />
                              </div>
                            );
                          }
                          
                          if (isAudio) {
                            return (
                              <div className="w-full bg-gray-100 rounded-lg p-8">
                                <div className="text-center space-y-4">
                                  <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                    <File className="w-12 h-12 text-blue-600" />
                                  </div>
                                  <audio 
                                    src={fileUrl} 
                                    controls 
                                    className="w-full max-w-md mx-auto"
                                  >
                                    Your browser does not support the audio tag.
                                  </audio>
                                </div>
                              </div>
                            );
                          }
                          
                          if (isImage) {
                            return (
                              <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={fileUrl}
                                  alt={selectedScheduleItem.title || 'Content preview'}
                                  className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                                  onError={(e) => {
                                    console.error('Image load error:', e);
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                                  }}
                                />
                              </div>
                            );
                          }
                          
                          if (isGoogleDrive) {
                            return (
                              <div className="w-full">
                                <DriveViewer 
                                  driveUrl={fileUrl}
                                  title={selectedScheduleItem.title}
                                />
                              </div>
                            );
                          }
                          
                          // Default: show file info
                          return (
                            <div className="w-full bg-gray-100 rounded-lg p-8">
                              <div className="text-center space-y-4">
                                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                  <File className="w-12 h-12 text-blue-600" />
                                </div>
                                <p className="text-gray-600">Preview not available for this file type</p>
                                <p className="text-sm text-gray-500">
                                  Click "Open" to view in a new tab
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setSelectedScheduleItem(null);
                  }}
                >
                  Close
                </Button>
                {!completedScheduleIds.has(selectedScheduleItem._id || selectedScheduleItem.id) && (
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    onClick={() => handleMarkAsComplete(selectedScheduleItem, selectedScheduleItem.isQuiz)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </Button>
                )}
                {selectedScheduleItem.isQuiz && (
                  <Button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      window.location.href = '/learning-paths';
                    }}
                  >
                    Start Quiz
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo}
      />

      {/* Explore Career Paths */}
      <div className="mb-responsive relative z-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore Career Paths</h2>
          <p className="text-gray-600">Discover various career opportunities and their requirements</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engineering & Technology */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TargetIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Engineering & Technology</h3>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mb-3">Demand: Very High</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">Computer Science</Badge>
                <Badge variant="outline" className="text-xs">Mechanical</Badge>
                <Badge variant="outline" className="text-xs">Electrical</Badge>
                <Badge variant="outline" className="text-xs">Civil</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => alert('This feature is coming soon!')}
              >
                Explore More
              </Button>
            </CardContent>
          </Card>

          {/* Medical & Healthcare */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Medical & Healthcare</h3>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mb-3">Demand: High</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">MBBS</Badge>
                <Badge variant="outline" className="text-xs">Nursing</Badge>
                <Badge variant="outline" className="text-xs">Pharmacy</Badge>
                <Badge variant="outline" className="text-xs">Physiotherapy</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => alert('This feature is coming soon!')}
              >
                Explore More
              </Button>
            </CardContent>
          </Card>

          {/* Business & Management */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChartIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Business & Management</h3>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mb-3">Demand: High</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">MBA</Badge>
                <Badge variant="outline" className="text-xs">CA</Badge>
                <Badge variant="outline" className="text-xs">Marketing</Badge>
                <Badge variant="outline" className="text-xs">Finance</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => alert('This feature is coming soon!')}
              >
                Explore More
              </Button>
            </CardContent>
          </Card>

          {/* Arts & Design */}
          <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Arts & Design</h3>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mb-3">Demand: Medium</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">Fine Arts</Badge>
                <Badge variant="outline" className="text-xs">Design</Badge>
                <Badge variant="outline" className="text-xs">Architecture</Badge>
                <Badge variant="outline" className="text-xs">Fashion</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => alert('This feature is coming soon!')}
              >
                Explore More
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}