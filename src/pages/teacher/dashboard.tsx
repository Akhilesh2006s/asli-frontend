// @ts-nocheck
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Play, 
  Target, 
  TrendingUp,
  Calendar,
  Clock,
  Star,
  BarChart3,
  Plus,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Wrench,
  LogOut,
  Menu,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileText,
  Zap,
  MessageCircle,
  ClipboardCheck,
  UserCheck,
  Upload,
  FileText as FileTextIcon,
  X,
  Video as VideoIcon,
  Filter,
  Radio,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  FileQuestion,
  CheckSquare,
  Rocket,
  Scale,
  Layers,
  CreditCard,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import AIChat from '@/components/ai-chat';
import VideoModal from '@/components/video-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractiveBackground, FloatingParticles } from "@/components/background/InteractiveBackground";

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  totalVideos: number;
  averagePerformance: number;
  recentActivity: any[];
}

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
  assignedClass?: {
    name?: string;
    classNumber?: string;
    section?: string;
  };
  performance?: {
    recentExamTitle?: string;
    recentMarks?: number;
    recentPercentage?: number;
    totalExams?: number;
    averageMarks?: number;
    averagePercentage?: number;
    overallProgress?: number;
    learningProgress?: number; // Content completion progress
    dailyAverageWatchTime?: number;
  };
}

interface Video {
  id: string;
  title: string;
  subject: string;
  duration: string;
  views: number;
  createdAt: string;
}

interface Assessment {
  id: string;
  title: string;
  subject: string;
  questions: number;
  attempts: number;
  averageScore: number;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}


const TeacherDashboard = () => {
  const [dashboardSubTab, setDashboardSubTab] = useState<'ai-classes' | 'students' | 'eduott' | 'vidya-ai'>('ai-classes');
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalClasses: 0,
    totalVideos: 0,
    totalAssessments: 0,
    averagePerformance: 0,
    recentActivity: []
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [eduottVideos, setEduottVideos] = useState<Video[]>([]);
  const [eduottSearchTerm, setEduottSearchTerm] = useState('');
  const [eduottSelectedSubject, setEduottSelectedSubject] = useState<string>('all');
  const [isLoadingEduott, setIsLoadingEduott] = useState(false);
  const [selectedEduottVideo, setSelectedEduottVideo] = useState<any>(null);
  const [isEduottVideoModalOpen, setIsEduottVideoModalOpen] = useState(false);
  const [eduottActiveTab, setEduottActiveTab] = useState<'videos' | 'live-sessions'>('videos');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [isLoadingLiveSessions, setIsLoadingLiveSessions] = useState(false);
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<{classNumber: string, subjects: any[]}[]>([]);
  const [selectedClassSubjects, setSelectedClassSubjects] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherEmail, setTeacherEmail] = useState<string>(localStorage.getItem('userEmail') || '');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [subjectsWithContent, setSubjectsWithContent] = useState<any[]>([]);
  
  // Remark states
  const [isRemarkDialogOpen, setIsRemarkDialogOpen] = useState(false);
  const [selectedStudentForRemark, setSelectedStudentForRemark] = useState<Student | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [selectedSubjectForRemark, setSelectedSubjectForRemark] = useState<string>('general');
  const [isPositiveRemark, setIsPositiveRemark] = useState(true);
  const [studentsSubTab, setStudentsSubTab] = useState<'list' | 'track-progress' | 'submissions'>('list');
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [expandedHomework, setExpandedHomework] = useState<Set<string>>(new Set());
  const [expandedStudent, setExpandedStudent] = useState<Set<string>>(new Set());

  // Modal states
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);

  // Form states
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    subject: '',
    duration: '',
    difficulty: 'beginner' // Changed from 'medium' to 'beginner'
  });


  // Lesson Plan form state
  const [lessonPlanForm, setLessonPlanForm] = useState({
    subject: '',
    topic: '',
    gradeLevel: '',
    duration: '90' // Default to 90 minutes for JEE coaching
  });

  const [isGeneratingLessonPlan, setIsGeneratingLessonPlan] = useState(false);
  const [generatedLessonPlan, setGeneratedLessonPlan] = useState('');
  const [vidyaAiTab, setVidyaAiTab] = useState<'teacher-tools' | 'chat'>('teacher-tools');
  const [teacherId, setTeacherId] = useState<string>('');
  const [teacherUser, setTeacherUser] = useState<any>(null);
  
  // Quiz Generator form state
  const [quizForm, setQuizForm] = useState({
    subject: '',
    topic: '',
    gradeLevel: '',
    questionCount: '10',
    difficulty: 'medium',
    assignedClasses: [] as string[]
  });
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  
  // Grading form state
  const [gradingForm, setGradingForm] = useState({
    rubric: '',
    studentWork: '',
    uploadedFile: null as File | null
  });
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<string>('');

  // Homework creation form state
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [isCreatingHomework, setIsCreatingHomework] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    description: '',
    subject: '',
    classNumber: '',
    topic: '',
    date: new Date().toISOString().split('T')[0],
    deadline: '',
    fileUrl: ''
  });
  const [selectedHomeworkFile, setSelectedHomeworkFile] = useState<File | null>(null);
  const [isUploadingHomeworkFile, setIsUploadingHomeworkFile] = useState(false);

  useEffect(() => {
    fetchTeacherData();
    fetchTeacherUser();
    
    // Check for saved tab preference from tool pages
    const savedTab = localStorage.getItem('teacherDashboardTab');
    if (savedTab && ['ai-classes', 'students', 'eduott', 'vidya-ai'].includes(savedTab)) {
      setDashboardSubTab(savedTab as 'ai-classes' | 'students' | 'eduott' | 'vidya-ai');
      // Clear it after using so it doesn't persist on refresh
      localStorage.removeItem('teacherDashboardTab');
    }
  }, []);

  // Fetch teacher user data for chat
  const fetchTeacherUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setTeacherUser(userData.user);
        if (userData.user?._id || userData.user?.id) {
          setTeacherId(userData.user._id || userData.user.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch teacher user:', error);
    }
  };

  // Fetch student performance data when Track Progress tab is active
  useEffect(() => {
    if (dashboardSubTab === 'students' && studentsSubTab === 'track-progress') {
      setIsLoadingProgress(true);
      fetchStudentPerformance().finally(() => {
        setIsLoadingProgress(false);
      });
    }
  }, [dashboardSubTab, studentsSubTab]);

  // Fetch homework submissions when Submissions tab is active
  useEffect(() => {
    if (dashboardSubTab === 'students' && studentsSubTab === 'submissions') {
      fetchHomeworkSubmissions();
    }
  }, [dashboardSubTab, studentsSubTab]);

  // Fetch homework submissions
  const fetchHomeworkSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/homework-submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setHomeworkSubmissions(data.data);
        } else {
          setHomeworkSubmissions({ homeworks: [], students: [] });
        }
      } else {
        setHomeworkSubmissions({ homeworks: [], students: [] });
      }
    } catch (error) {
      console.error('Failed to fetch homework submissions:', error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Fetch EduOTT videos when tab is active
  useEffect(() => {
    const fetchEduottVideos = async () => {
      if (dashboardSubTab !== 'eduott' || eduottActiveTab !== 'videos') return;
      
      // Don't fetch if teacher has no assigned subjects
      if (!teacherSubjects || teacherSubjects.length === 0) {
        setEduottVideos([]);
        setIsLoadingEduott(false);
        return;
      }
      
      try {
        setIsLoadingEduott(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoadingEduott(false);
          return;
        }

        // Fetch video content from Content model (filtered by teacher's assigned subjects and type=Video)
        const response = await fetch(`${API_BASE_URL}/api/teacher/asli-prep-content?type=Video`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          
          console.log('📹 Fetched videos from database for teacher:', videosList.length, 'videos');
          if (videosList.length > 0) {
            console.log('📹 Sample video from database:', {
              _id: videosList[0]._id,
              title: videosList[0].title,
              fileUrl: videosList[0].fileUrl,
              subject: videosList[0].subject
            });
          }
          
          // Map Content model data to match UI expectations
          const videosWithSubjects = videosList.map((content: any) => {
            // Content model has subject populated with { _id, name }
            const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
            const subjectId = content.subject?._id || content.subject;
            
            // Handle duration - Content model stores duration in minutes
            const rawDuration = content.duration;
            const durationInMinutes = rawDuration && rawDuration > 0 
              ? Number(rawDuration) 
              : 0;
            
            // Ensure fileUrl is properly formatted (handle relative/absolute URLs from database)
            let videoFileUrl = content.fileUrl;
            if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
              // If it's a relative URL, prepend API base URL
              if (videoFileUrl.startsWith('/')) {
                videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
              } else {
                videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
              }
            }
            
            return {
              _id: content._id,
              id: content._id,
              title: content.title || 'Untitled Video',
              description: content.description || '',
              fileUrl: videoFileUrl, // Use properly formatted fileUrl from database
              videoUrl: videoFileUrl, // Map fileUrl to videoUrl for compatibility
              thumbnailUrl: content.thumbnailUrl, // Thumbnail from database
              duration: durationInMinutes, // Keep in minutes for VideoModal
              durationSeconds: durationInMinutes > 0 ? durationInMinutes * 60 : 0, // Convert to seconds for card display
              views: content.views || 0,
              createdAt: content.createdAt,
              subject: subjectName,
              subjectName: subjectName,
              subjectId: subjectId,
              board: content.board,
              topic: content.topic,
              classNumber: content.classNumber,
              // Check if it's a YouTube URL
              isYouTubeVideo: content.fileUrl && (
                content.fileUrl.includes('youtube.com') || 
                content.fileUrl.includes('youtu.be')
              ),
              youtubeUrl: (content.fileUrl && (
                content.fileUrl.includes('youtube.com') || 
                content.fileUrl.includes('youtu.be')
              )) ? content.fileUrl : null
            };
          });
          
          setEduottVideos(videosWithSubjects);
          
          // Update stats with video count
          setStats(prev => ({
            ...prev,
            totalVideos: videosWithSubjects.length
          }));
        } else {
          console.error('Failed to fetch videos:', response.status);
          setEduottVideos([]);
        }
      } catch (error) {
        console.error('Failed to fetch EduOTT videos:', error);
        setEduottVideos([]);
      } finally {
        setIsLoadingEduott(false);
      }
    };

    if (dashboardSubTab === 'eduott' && eduottActiveTab === 'videos') {
      fetchEduottVideos();
    }
  }, [dashboardSubTab, teacherSubjects, eduottActiveTab]);

  // Fetch subjects with content for learning paths
  useEffect(() => {
    const fetchSubjectsWithContent = async () => {
      if (teacherSubjects.length === 0) {
        setSubjectsWithContent([]);
        return;
      }

      try {
        setIsLoadingSubjects(true);
        const token = localStorage.getItem('authToken');

        // Fetch content for each assigned subject
        const subjectsWithContentResults = await Promise.allSettled(
          teacherSubjects.map(async (subject: any) => {
            try {
              const subjectId = subject._id || subject.id || subject.name;
              
              // Fetch videos for this subject using teacher endpoint
              let videos = [];
              try {
                const videosResponse = await fetch(`${API_BASE_URL}/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}&type=Video`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                });
                
                if (videosResponse.ok) {
                  const videosData = await videosResponse.json();
                  const contentList = videosData.data || videosData || [];
                  // Map Content model to video format
                  videos = contentList.map((content: any) => ({
                    _id: content._id,
                    id: content._id,
                    title: content.title || 'Untitled Video',
                    description: content.description || '',
                    videoUrl: content.fileUrl || '',
                    duration: content.duration || 0,
                    views: content.views || 0,
                    createdAt: content.createdAt,
                    subject: content.subject?.name || content.subject || 'Unknown Subject'
                  }));
                  if (!Array.isArray(videos)) videos = [];
                }
              } catch (videoError) {
                console.error('Error fetching videos for subject:', subjectId, videoError);
                videos = [];
              }

              // Fetch assessments/quizzes for this subject using teacher endpoint
              let assessments = [];
              try {
                const assessmentsResponse = await fetch(`${API_BASE_URL}/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}&type=Assessment`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                });
                
                if (assessmentsResponse.ok) {
                  const assessmentsData = await assessmentsResponse.json();
                  const contentList = assessmentsData.data || assessmentsData || [];
                  // Map Content model to assessment format
                  assessments = contentList.map((content: any) => ({
                    _id: content._id,
                    id: content._id,
                    title: content.title || 'Untitled Assessment',
                    description: content.description || '',
                    questions: content.questions || [],
                    attempts: content.attempts || 0,
                    averageScore: content.averageScore || 0,
                    createdAt: content.createdAt,
                    subject: content.subject?.name || content.subject || 'Unknown Subject'
                  }));
                  if (!Array.isArray(assessments)) assessments = [];
                }
              } catch (assessmentError) {
                console.error('Error fetching assessments for subject:', subjectId, assessmentError);
                assessments = [];
              }

              // Fetch Asli Prep content (TextBook, Workbook, Material, Video, Audio, Homework) - use teacher endpoint
              let asliPrepContent = [];
              try {
                const contentResponse = await fetch(`${API_BASE_URL}/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                });
                
                if (contentResponse.ok) {
                  const contentData = await contentResponse.json();
                  asliPrepContent = contentData.data || contentData || [];
                  if (!Array.isArray(asliPrepContent)) asliPrepContent = [];
                }
              } catch (contentError) {
                console.error('Error fetching Asli Prep content for subject:', subjectId, contentError);
                asliPrepContent = [];
              }

              return {
                _id: subject._id || subject.id,
                id: subject._id || subject.id,
                name: subject.name || subject.subjectName || 'Unknown Subject',
                description: subject.description || '',
                board: subject.board || '',
                videos: videos,
                assessments: assessments,
                asliPrepContent: asliPrepContent,
                totalContent: (videos?.length || 0) + (assessments?.length || 0) + (asliPrepContent?.length || 0)
              };
            } catch (error) {
              console.error('Error processing subject:', subject, error);
              return null;
            }
          })
        );

        // Filter out failed results and set subjects
        const validSubjects = subjectsWithContentResults
          .filter((result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);

        setSubjectsWithContent(validSubjects);
      } catch (error) {
        console.error('Failed to fetch subjects with content:', error);
        setSubjectsWithContent([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjectsWithContent();
  }, [teacherSubjects]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    setLocation('/auth/login');
  };

  const handleViewVideo = (video: any) => {
    setSelectedVideo(video);
    setIsVideoViewerOpen(true);
  };

  const handleDeleteVideo = async (video: any) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/videos/${video.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setVideos(prev => prev.filter(v => v.id !== video.id));
        alert('Video deleted successfully!');
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to delete video' }));
        alert(`Failed to delete video: ${error.message}`);
      }
    } catch (error) {
      console.error('Delete video error:', error);
      alert('Failed to delete video. Please try again.');
    }
  };


  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingVideo(true);

    try {
      const token = localStorage.getItem('authToken');
      console.log('Creating video with data:', videoForm);
      console.log('Using token:', token ? 'Token present' : 'No token');
      
      // Convert YouTube watch/short URL to embeddable URL
      const toEmbedUrl = (url: string) => {
        try {
          if (!url) return '';
          const u = new URL(url);
          // youtu.be/<id>
          if (u.hostname.includes('youtu.be')) {
            const id = u.pathname.split('/').filter(Boolean).pop();
            return id ? `https://www.youtube.com/embed/${id}` : url;
          }
          // www.youtube.com/watch?v=<id>
          const id = u.searchParams.get('v');
          if (id) return `https://www.youtube.com/embed/${id}`;
          return url;
        } catch {
          return url;
        }
      };

      const payload = {
        ...videoForm,
        videoUrl: toEmbedUrl(videoForm.videoUrl),
        difficulty: videoForm.difficulty === 'medium' ? 'intermediate' : videoForm.difficulty
      };

      // Use teacher endpoint with auth so createdBy/adminId are set to the teacher
      let response = await fetch(`${API_BASE_URL}/api/teacher/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // If API failed, try test endpoint
      if (!response.ok) {
        try {
          response = await fetch(`${API_BASE_URL}/api/test-video-simple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          // continue to mock fallback below
        }
      }

      if (response && response.ok) {
        const result = await response.json();
        const created: any = result && (result.data || result);
        const normalized = {
          id: created._id || created.id || `tmp-${Date.now()}`,
          title: created.title || payload.title,
          subject: created.subject || created.subjectId || payload.subject,
          duration: created.duration || payload.duration,
          views: created.views || 0,
          createdAt: created.createdAt || new Date().toISOString(),
          videoUrl: created.videoUrl || payload.videoUrl,
          difficulty: created.difficulty || payload.difficulty
        };
        setVideos(prev => [normalized, ...prev]);

        // Show success message first
        alert('Video created successfully!');

        // Close modal and reset form without re-fetching to avoid disappearance
        setIsAddVideoModalOpen(false);
        setVideoForm({ title: '', description: '', videoUrl: '', subject: '', duration: '', difficulty: 'beginner' });
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('Video creation error details:', error);
        alert(`Failed to create video: ${error.message || error.error || 'Server error'}`);
      }
    } catch (error) {
      console.error('Failed to create video:', error);
      alert(`Failed to create video: ${error.message || 'Please check your internet connection and try again.'}`);
    } finally {
      setIsCreatingVideo(false);
    }
  };

  const handleGenerateLessonPlan = async () => {
    if (!lessonPlanForm.subject || !lessonPlanForm.topic || !lessonPlanForm.gradeLevel) {
      alert('Please fill in all required fields');
      return;
    }

    setIsGeneratingLessonPlan(true);
    setGeneratedLessonPlan('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/lesson-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(lessonPlanForm)
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedLessonPlan(result.lessonPlan);
      } else {
        const error = await response.json();
        alert(`Failed to generate lesson plan: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate lesson plan:', error);
      alert('Failed to generate lesson plan. Please try again.');
    } finally {
      setIsGeneratingLessonPlan(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizForm.subject || !quizForm.topic || !quizForm.gradeLevel || !quizForm.questionCount) {
      alert('Please fill in all required fields');
      return;
    }

    setIsGeneratingQuiz(true);
    setGeneratedQuiz(null);

    try {
      const token = localStorage.getItem('authToken');
      
      // Step 1: Generate quiz using Gemini API
      const generateResponse = await fetch(`${API_BASE_URL}/api/teacher/ai/test-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: quizForm.subject,
          topic: quizForm.topic,
          gradeLevel: quizForm.gradeLevel,
          questionCount: parseInt(quizForm.questionCount),
          difficulty: quizForm.difficulty
        })
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        alert(`Failed to generate quiz: ${error.message || 'Unknown error'}`);
        setIsGeneratingQuiz(false);
        return;
      }

      const result = await generateResponse.json();
      
      // Parse the generated questions
      let questionsData;
      try {
        let rawText = typeof result.data.testQuestions === 'string' 
          ? result.data.testQuestions 
          : JSON.stringify(result.data.testQuestions);
        
        // Clean up markdown code blocks if present
        rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rawText = jsonMatch[0];
        }
        
        questionsData = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Failed to parse quiz questions:', parseError);
        console.error('Raw response:', result.data.testQuestions);
        alert('Failed to parse generated quiz. The AI response may be malformed. Please try again.');
        setIsGeneratingQuiz(false);
        return;
      }

      const generatedQuizData = {
        ...result.data,
        parsedQuestions: questionsData
      };
      setGeneratedQuiz(generatedQuizData);

      // Step 2: Save quiz to database immediately
      // Find the subject ID from teacherSubjects
      const selectedSubject = teacherSubjects.find((s: any) => 
        s.name?.toLowerCase() === quizForm.subject.toLowerCase()
      );
      
      if (!selectedSubject) {
        alert('Subject not found. Please select a valid subject.');
        setIsGeneratingQuiz(false);
        return;
      }

      // Format questions for the API (matching Assessment model schema)
      const formattedQuestions = questionsData.questions?.map((q: any) => {
        // Extract options as strings (Assessment model expects array of strings)
        const options = q.options?.map((opt: string | { text: string; isCorrect?: boolean }) => {
          if (typeof opt === 'string') {
            return opt;
          }
          return opt.text || String(opt);
        }) || [];

        return {
          question: q.question || q.questionText || '',
          type: q.type === 'multiple-choice' ? 'multiple-choice' : (q.type || 'multiple-choice'),
          options: options,
          correctAnswer: q.correctAnswer || options[0] || '',
          explanation: q.explanation || '',
          points: 1
        };
      }) || [];

      // Convert subject ID to string
      const subjectId = selectedSubject._id 
        ? (typeof selectedSubject._id === 'string' ? selectedSubject._id : String(selectedSubject._id))
        : String(selectedSubject.id || selectedSubject._id);
      
      // Convert assigned classes to strings (they'll be converted to ObjectIds in backend)
      const assignedClassesIds = quizForm.assignedClasses.map((classId: any) => 
        typeof classId === 'string' ? classId : String(classId)
      );

      const quizData = {
        title: `Quiz: ${quizForm.topic} - ${quizForm.subject}`,
        description: `AI-generated quiz for ${quizForm.subject} - ${quizForm.topic} (${quizForm.gradeLevel})`,
        subject: subjectId,
        duration: 60,
        difficulty: quizForm.difficulty,
        questions: formattedQuestions,
        assignedClasses: assignedClassesIds
      };
      
      console.log('Saving quiz with data:', {
        title: quizData.title,
        subject: quizData.subject,
        questionsCount: quizData.questions.length,
        assignedClasses: quizData.assignedClasses
      });

      const saveResponse = await fetch(`${API_BASE_URL}/api/teacher/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizData)
      });

      if (saveResponse.ok) {
        const savedQuiz = await saveResponse.json();
        
        // If classes are assigned, assign the quiz to those classes
        if (quizForm.assignedClasses.length > 0 && savedQuiz.data?._id) {
          try {
            const assignResponse = await fetch(`${API_BASE_URL}/api/teacher/quizzes/${savedQuiz.data._id}/assign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                classIds: quizForm.assignedClasses
              })
            });

            if (assignResponse.ok) {
              alert(`Quiz generated and assigned to ${quizForm.assignedClasses.length} class(es) successfully!`);
            } else {
              alert('Quiz generated and saved but failed to assign to classes. You can assign it later.');
            }
          } catch (assignError) {
            console.error('Failed to assign quiz:', assignError);
            alert('Quiz generated and saved but failed to assign to classes. You can assign it later.');
          }
        } else {
          alert('Quiz generated and saved successfully!');
        }
        
        // Don't clear the generated quiz - keep it visible so user can see it
        // Only reset the form inputs, but keep the quiz displayed
        setQuizForm({
          subject: '',
          topic: '',
          gradeLevel: '',
          questionCount: '10',
          difficulty: 'medium',
          assignedClasses: []
        });
        
        // Optionally, you can scroll to show the saved quiz
        setTimeout(() => {
          const quizSection = document.getElementById('generated-quiz-section');
          if (quizSection) {
            quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await saveResponse.json();
          errorMessage = errorData.error || errorData.message || errorData.details || 'Unknown error';
          console.error('Failed to save quiz - Full error:', errorData);
          console.error('Response status:', saveResponse.status);
        } catch (parseError) {
          const errorText = await saveResponse.text();
          errorMessage = errorText || 'Failed to parse error response';
          console.error('Failed to parse error response:', errorText);
        }
        alert(`Quiz generated but failed to save: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle homework file upload
  const handleHomeworkFileUpload = async (file: File): Promise<string> => {
    setIsUploadingHomeworkFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url || data.fileUrl;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    } finally {
      setIsUploadingHomeworkFile(false);
    }
  };

  // Handle homework creation
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!homeworkForm.title || !homeworkForm.subject || !homeworkForm.date || !homeworkForm.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    if (!homeworkForm.fileUrl && !selectedHomeworkFile) {
      alert('Please provide a file URL or upload a file');
      return;
    }

    setIsCreatingHomework(true);
    try {
      let fileUrl = homeworkForm.fileUrl;
      
      // Upload file if selected
      if (selectedHomeworkFile && !fileUrl) {
        fileUrl = await handleHomeworkFileUpload(selectedHomeworkFile);
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/homework`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: homeworkForm.title,
          description: homeworkForm.description,
          subject: homeworkForm.subject,
          classNumber: homeworkForm.classNumber || undefined,
          topic: homeworkForm.topic || undefined,
          date: homeworkForm.date,
          deadline: homeworkForm.deadline,
          fileUrl: fileUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('Homework created successfully!');
          setIsHomeworkModalOpen(false);
          setHomeworkForm({
            title: '',
            description: '',
            subject: '',
            classNumber: '',
            topic: '',
            date: new Date().toISOString().split('T')[0],
            deadline: '',
            fileUrl: ''
          });
          setSelectedHomeworkFile(null);
          // Refresh homework submissions
          fetchHomeworkSubmissions();
        } else {
          alert(data.message || 'Failed to create homework');
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create homework');
      }
    } catch (error) {
      console.error('Create homework error:', error);
      alert('Failed to create homework. Please try again.');
    } finally {
      setIsCreatingHomework(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!generatedQuiz || !generatedQuiz.parsedQuestions) {
      alert('No quiz to save. Please generate a quiz first.');
      return;
    }

    setIsSavingQuiz(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Find the subject ID from teacherSubjects
      const selectedSubject = teacherSubjects.find((s: any) => 
        s.name?.toLowerCase() === quizForm.subject.toLowerCase()
      );
      
      if (!selectedSubject) {
        alert('Subject not found. Please select a valid subject.');
        setIsSavingQuiz(false);
        return;
      }

      // Format questions for the API
      const formattedQuestions = generatedQuiz.parsedQuestions.questions?.map((q: any) => ({
        questionText: q.question || q.questionText,
        questionType: q.type === 'multiple-choice' ? 'mcq' : 'mcq',
        options: q.options?.map((opt: string | { text: string; isCorrect?: boolean }) => {
          if (typeof opt === 'string') {
            return { text: opt, isCorrect: opt === q.correctAnswer };
          }
          return { text: opt.text, isCorrect: opt.isCorrect || false };
        }) || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        marks: 1,
        negativeMarks: 0,
        subject: quizForm.subject.toLowerCase()
      })) || [];

      const quizData = {
        title: `Quiz: ${quizForm.topic} - ${quizForm.subject}`,
        description: `AI-generated quiz for ${quizForm.subject} - ${quizForm.topic} (${quizForm.gradeLevel})`,
        subject: selectedSubject._id || selectedSubject.id,
        duration: 60,
        difficulty: quizForm.difficulty,
        questions: formattedQuestions,
        assignedClasses: quizForm.assignedClasses
      };

      const response = await fetch(`${API_BASE_URL}/api/teacher/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizData)
      });

      if (response.ok) {
        const savedQuiz = await response.json();
        
        // If classes are assigned, assign the quiz to those classes
        if (quizForm.assignedClasses.length > 0 && savedQuiz._id) {
          try {
            const assignResponse = await fetch(`${API_BASE_URL}/api/teacher/quizzes/${savedQuiz._id}/assign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                classIds: quizForm.assignedClasses
              })
            });

            if (assignResponse.ok) {
              alert(`Quiz saved and assigned to ${quizForm.assignedClasses.length} class(es) successfully!`);
            } else {
              alert('Quiz saved but failed to assign to classes. You can assign it later.');
            }
          } catch (assignError) {
            console.error('Failed to assign quiz:', assignError);
            alert('Quiz saved but failed to assign to classes. You can assign it later.');
          }
        } else {
          alert('Quiz saved successfully!');
        }
        
        setGeneratedQuiz(null);
        setQuizForm({
          subject: '',
          topic: '',
          gradeLevel: '',
          questionCount: '10',
          difficulty: 'medium',
          assignedClasses: []
        });
      } else {
        const error = await response.json();
        alert(`Failed to save quiz: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleGradeWork = async () => {
    if (!gradingForm.studentWork && !gradingForm.uploadedFile) {
      alert('Please provide student work or upload a file');
      return;
    }

    setIsGrading(true);
    setGradingResult('');

    try {
      const formData = new FormData();
      formData.append('rubric', gradingForm.rubric || '');
      formData.append('studentWork', gradingForm.studentWork || '');
      
      if (gradingForm.uploadedFile) {
        formData.append('file', gradingForm.uploadedFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/teacher/grade-work`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setGradingResult(result.grading || result.result || 'Grading completed successfully');
      } else {
        const error = await response.json();
        alert(`Failed to grade work: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to grade work:', error);
      alert('Failed to grade work. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };


  // Fetch student performance data
  const fetchStudentPerformance = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/students/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Update students with performance data from database
          const studentsWithPerformance = data.data.map((student: any) => {
            const perf = student.performance || {};
            // Extract all metrics from database response
            return {
              id: student._id || student.id,
              name: student.fullName || student.name,
              email: student.email,
              classNumber: student.classNumber,
              phone: student.phone,
              isActive: student.isActive,
              createdAt: student.createdAt,
              lastLogin: student.lastLogin,
              assignedClass: student.assignedClass,
              performance: {
                recentExamTitle: perf.recentExamTitle || null,
                recentMarks: perf.recentMarks || null,
                recentPercentage: perf.recentPercentage || null,
                // All metrics from database:
                // - totalExams: Count from ExamResult collection
                totalExams: perf.totalExams !== null && perf.totalExams !== undefined ? perf.totalExams : 0,
                // - averageMarks: Average of obtained marks from ExamResult
                averageMarks: perf.averageMarks || 0,
                // - averagePercentage: Average of all exam percentages from ExamResult
                averagePercentage: perf.averagePercentage !== null && perf.averagePercentage !== undefined ? perf.averagePercentage : null,
                // - overallProgress: Calculated from exam progress + learning path progress
                overallProgress: perf.overallProgress !== null && perf.overallProgress !== undefined ? perf.overallProgress : 0,
                // - learningProgress: Content completion progress from database
                learningProgress: perf.learningProgress !== null && perf.learningProgress !== undefined ? perf.learningProgress : 0,
                // - dailyAverageWatchTime: Calculated from UserProgress records (video watch time)
                dailyAverageWatchTime: perf.dailyAverageWatchTime !== null && perf.dailyAverageWatchTime !== undefined ? perf.dailyAverageWatchTime : 0
              }
            };
          });
          
          console.log('📊 Student performance data loaded from database:', {
            totalStudents: studentsWithPerformance.length,
            sampleStudent: studentsWithPerformance[0] ? {
              name: studentsWithPerformance[0].name,
              performance: studentsWithPerformance[0].performance,
              watchTime: studentsWithPerformance[0].performance?.dailyAverageWatchTime
            } : null
          });
          
          // Debug: Log all watch times
          studentsWithPerformance.forEach((s: any) => {
            const wt = s.performance?.dailyAverageWatchTime;
            console.log(`⏱️ Watch time for ${s.name}: ${wt !== null && wt !== undefined ? wt + ' min' : 'null/undefined'}`);
          });
          
          setStudents(studentsWithPerformance);
        }
      }
    } catch (error) {
      console.error('Failed to fetch student performance:', error);
    }
  };

  const fetchTeacherData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Teacher dashboard data:', data);
        
        if (data.success) {
          setStats({
            ...(data.data.stats || {}),
            recentActivity: data.data.recentActivity || []
          });
          setStudents(data.data.students || []);
          
          // Fetch performance data for students
          fetchStudentPerformance();
          setVideos(data.data.videos || []);

          setTeacherEmail(data.data.teacherEmail || '');
          setAssignedClasses(data.data.assignedClasses || []);
          setTeacherSubjects(data.data.teacherSubjects || []);
          
          // Process assigned classes to get unique classNumbers and their subjects
          const classesMap = new Map<string, Set<string>>();
          const classesData = data.data.assignedClasses || [];
          
          console.log('Processing assigned classes:', classesData);
          
          classesData.forEach((classItem: any) => {
            const classNumber = classItem.classNumber;
            console.log('Processing class:', classNumber, 'with data:', classItem);
            
            if (classNumber) {
              // Always add the class, even if it has no subjects
              if (!classesMap.has(classNumber)) {
                classesMap.set(classNumber, new Set());
              }
              
              // Check if assignedSubjects exists and is populated
              if (classItem.assignedSubjects && Array.isArray(classItem.assignedSubjects) && classItem.assignedSubjects.length > 0) {
                // Add all subjects from this class
                classItem.assignedSubjects.forEach((subject: any) => {
                  const subjectId = subject._id || subject;
                  if (subjectId) {
                    classesMap.get(classNumber)?.add(subjectId);
                  }
                });
              }
            }
          });
          
          console.log('Classes map after processing:', Array.from(classesMap.entries()));
          
          // Convert to array format with unique subjects
          const availableClassesList = Array.from(classesMap.entries()).map(([classNumber, subjectIds]) => {
            // Get subject details from assignedClasses
            const subjectsMap = new Map<string, any>();
            
            classesData.forEach((classItem: any) => {
              if (classItem.classNumber === classNumber && classItem.assignedSubjects && Array.isArray(classItem.assignedSubjects)) {
                classItem.assignedSubjects.forEach((subject: any) => {
                  const subjectId = subject._id || subject;
                  if (subjectIds.has(subjectId) && !subjectsMap.has(subjectId)) {
                    subjectsMap.set(subjectId, {
                      _id: subject._id || subject,
                      name: subject.name || subject
                    });
                  }
                });
              }
            });
            
            // Validate and clean classNumber
            let cleanClassNumber = classNumber;
            if (classNumber && typeof classNumber === 'string') {
              // Remove "Class " prefix if present
              cleanClassNumber = classNumber.replace(/^Class\s*/i, '').trim();
              // Remove any leading dashes or invalid characters
              cleanClassNumber = cleanClassNumber.replace(/^-+/, '').trim();
            }
            
            // Skip invalid classNumbers
            if (!cleanClassNumber || cleanClassNumber === '' || cleanClassNumber === '-9' || cleanClassNumber.startsWith('-')) {
              console.warn('Skipping invalid classNumber:', classNumber, '->', cleanClassNumber);
              return null;
            }
            
            return {
              classNumber: cleanClassNumber,
              subjects: Array.from(subjectsMap.values())
            };
          })
          .filter(item => item !== null); // Remove null entries
          
          console.log('Available classes list:', availableClassesList);
          setAvailableClasses(availableClassesList);
          
          // Get teacher ID from response or extract from token
          if (data.data.teacherId) {
            setTeacherId(data.data.teacherId);
          } else {
            // Try to extract from token
            try {
              const token = localStorage.getItem('authToken');
              if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setTeacherId(payload.userId || payload.id || '');
              }
            } catch (e) {
              console.error('Failed to extract teacher ID from token:', e);
            }
          }
          console.log('Teacher subjects received:', data.data.teacherSubjects);
        } else {
          console.error('API returned success: false:', data.message);
        }
      } else {
        console.error('Failed to fetch teacher data:', response.status);
        // Show fallback data when API fails
        setStats({
          totalStudents: 0,
          totalClasses: 0,
          totalVideos: 0,
          totalAssessments: 0,
          averagePerformance: 0,
          recentActivity: []
        });
        setStudents([]);
        setVideos([]);
        setAssignedClasses([]);
        setTeacherSubjects([]);
        setAvailableClasses([]);
        setSelectedClassSubjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      // Show fallback data when API fails
      setStats({
        totalStudents: 0,
        totalClasses: 0,
        totalVideos: 0,
        totalAssessments: 0,
        averagePerformance: 0,
        recentActivity: []
      });
      setStudents([]);
      setVideos([]);
      setAssignedClasses([]);
      setTeacherSubjects([]);
      setAvailableClasses([]);
      setSelectedClassSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-pink-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-700 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your teacher dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 relative overflow-hidden">
      {/* Interactive Background */}
      <div className="fixed inset-0 z-0">
        <InteractiveBackground />
        <FloatingParticles />
      </div>
      
      {/* Header - Student Dashboard Theme */}
      <div className="bg-gradient-to-r from-sky-400 via-sky-500 to-teal-500 text-white shadow-xl border-b-0 rounded-b-3xl sticky top-0 z-50 relative">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ASLILEARN AI</h1>
                <p className="text-xs text-white/80 font-medium">Teacher Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{teacherEmail || localStorage.getItem('userEmail') || 'Teacher'}</p>
                <p className="text-xs text-white/80">Welcome back!</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="bg-white/90 text-sky-600 hover:bg-white rounded-full border-2 border-teal-400 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-orange-500 to-teal-500 bg-clip-text text-transparent capitalize">
            Overview
          </h1>
          <p className="text-gray-600 text-responsive-sm font-medium mt-2">Manage your classes and track student progress with style</p>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-8">
          {/* Dashboard Sub-Tabs */}
              <div className="bg-gradient-to-b from-orange-400 to-orange-500 rounded-3xl p-4 shadow-xl border border-orange-300">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={dashboardSubTab === 'ai-classes' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'ai-classes' ? 'bg-white text-orange-600 shadow-lg border-white' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}
                    onClick={() => setDashboardSubTab('ai-classes')}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant={dashboardSubTab === 'students' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'students' ? 'bg-white text-orange-600 shadow-lg border-white' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}
                    onClick={() => setDashboardSubTab('students')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    My Students
                  </Button>
                  <Button
                    variant={dashboardSubTab === 'eduott' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'eduott' ? 'bg-white text-orange-600 shadow-lg border-white' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}
                    onClick={() => setDashboardSubTab('eduott')}
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    EduOTT
                  </Button>
                  <Button
                    variant={dashboardSubTab === 'vidya-ai' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'vidya-ai' ? 'bg-white text-orange-600 shadow-lg border-white' : 'bg-transparent text-white border-white/30 hover:bg-white/10'}
                    onClick={() => {
                      setDashboardSubTab('vidya-ai');
                      localStorage.removeItem('teacherDashboardTab'); // Clear saved tab when manually selected
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Vidya AI
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid-responsive-4 gap-responsive">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative overflow-hidden bg-gradient-to-br from-orange-400 to-orange-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-responsive-xs font-medium">Total Students</p>
                        <p className="text-responsive-xl font-bold text-white">
                          {stats.totalStudents}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <GraduationCap className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-responsive-xs font-medium">Active Classes</p>
                        <p className="text-responsive-xl font-bold text-white">
                          {stats.totalClasses}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-responsive-xs font-medium">Videos</p>
                        <p className="text-responsive-xl font-bold text-white">
                          {stats.totalVideos}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="group relative overflow-hidden bg-gradient-to-br from-orange-400 to-orange-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Target className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-right">
                        <p className="text-white/90 text-responsive-xs font-medium">Assessments</p>
                        <p className="text-responsive-xl font-bold text-white">
                          {stats.totalAssessments || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>

              {/* Dashboard Tab - Stats Cards, My Classes, and Learning Paths */}
              {dashboardSubTab === 'ai-classes' && (
                <>
                {/* Stats Cards are shown above, outside conditional */}

              {/* My Classes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">My Classes</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignedClasses.length > 0 ? (
                    assignedClasses.map((classItem, index) => (
                      <div key={classItem.id || index} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900">{classItem.name}</h3>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Students:</span>
                            <span className="font-medium">{classItem.studentCount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Subject:</span>
                            <span className="font-medium">{classItem.subject}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Schedule:</span>
                            <span className="font-medium">{classItem.schedule}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Room:</span>
                            <span className="font-medium">{classItem.room}</span>
                          </div>
                        </div>
                        
                        {/* Students List - Conditionally Rendered */}
                        {expandedClasses.has(classItem.id || index.toString()) && classItem.students && classItem.students.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="font-semibold text-gray-900 text-sm">Students:</h4>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {classItem.students.map(student => (
                                <div key={student.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                    <p className="text-xs text-gray-600">{student.email}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                                    {student.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              const classId = classItem.id || index.toString();
                              setExpandedClasses(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(classId)) {
                                  newSet.delete(classId);
                                } else {
                                  newSet.add(classId);
                                }
                                return newSet;
                              });
                            }}
                          >
                            {expandedClasses.has(classItem.id || index.toString()) ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Hide Students
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                View Students
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Assigned</h3>
                      <p className="text-gray-600 mb-4">You haven't been assigned to any classes yet. Contact your administrator.</p>
                      <Button className="bg-gradient-to-r from-sky-400 to-blue-400 hover:from-sky-500 hover:to-blue-500 text-white">
                        Request Class Assignment
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Learning Paths Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Learning Paths</h3>
                  </div>
                </div>

                {isLoadingSubjects ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl p-6 animate-pulse">
                        <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : subjectsWithContent.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                    <p className="text-gray-500">No subjects have been assigned to you yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjectsWithContent.map((subject: any) => {
                      const getSubjectIcon = (subjectName: string) => {
                        if (subjectName.toLowerCase().includes('math')) return Target;
                        if (subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('physics') || subjectName.toLowerCase().includes('chemistry')) return Zap;
                        if (subjectName.toLowerCase().includes('english')) return BookOpen;
                        return BookOpen;
                      };
                      
                      const Icon = getSubjectIcon(subject.name);
                      
                      return (
                        <div key={subject._id || subject.id} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-200 hover:scale-105">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {subject.totalContent || 0} items
                            </Badge>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 mb-2">{subject.name}</h4>
                          <p className="text-gray-600 text-sm mb-4">{subject.description || `Content for ${subject.name}`}</p>
                          
                          {/* Content Stats */}
                          <div className="grid grid-cols-3 gap-2 text-center mb-4">
                            <div className="bg-blue-50 rounded-lg p-2">
                              <Play className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                              <p className="text-xs font-medium text-blue-800">{subject.videos?.length || 0}</p>
                              <p className="text-xs text-blue-600">Videos</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                              <FileText className="w-4 h-4 text-green-600 mx-auto mb-1" />
                              <p className="text-xs font-medium text-green-800">{subject.assessments?.length || 0}</p>
                              <p className="text-xs text-green-600">Quizzes</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2">
                              <BarChart3 className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                              <p className="text-xs font-medium text-orange-800">{subject.asliPrepContent?.length || 0}</p>
                              <p className="text-xs text-orange-600">Content</p>
                            </div>
                          </div>

                          {/* Recent Content Preview */}
                          {subject.videos?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Recent Videos:</p>
                              <div className="space-y-1">
                                {subject.videos.slice(0, 2).map((video: any, idx: number) => (
                                  <div key={video._id || idx} className="bg-gray-50 rounded-lg p-2 text-xs">
                                    <p className="text-gray-900 font-medium truncate">{video.title || 'Untitled Video'}</p>
                                    {video.duration && (
                                      <p className="text-gray-600 text-xs">Duration: {video.duration} min</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                            onClick={() => setLocation(`/teacher/subject/${subject._id || subject.id}`)}
                          >
                            View Content
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </motion.div>
                </>
              )}

              {/* Vidya AI Tab */}
              {dashboardSubTab === 'vidya-ai' && (
                <>
              {/* Vidya AI */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img 
                      src="/ROBOT.gif" 
                      alt="Vidya AI Robot" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Vidya AI</h3>
                </div>

                {/* Tabs for Teacher Tools and Chat */}
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setVidyaAiTab('teacher-tools')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'teacher-tools'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Wrench className="w-4 h-4 inline mr-2" />
                      Teacher Tools
                    </button>
                    <button
                      onClick={() => setVidyaAiTab('chat')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'chat'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 inline mr-2" />
                      Chat
                    </button>
                  </div>
                </div>

                {/* Teacher Tools Content */}
                {vidyaAiTab === 'teacher-tools' && (
                  <div className="space-y-8">
                    {/* Header */}
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Teacher Tools</h2>
                      <p className="text-gray-600">AI-powered tools to enhance your teaching experience</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6 shadow-lg"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                      </div>
                          <p className="text-3xl font-bold text-white">15</p>
                    </div>
                        <h3 className="text-white font-semibold mb-1">Total Tools</h3>
                        <p className="text-white/90 text-sm">AI-powered features</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-sky-400 to-sky-500 rounded-xl p-6 shadow-lg"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                          <p className="text-3xl font-bold text-white">50%</p>
                    </div>
                        <h3 className="text-white font-semibold mb-1">Time Saved</h3>
                        <p className="text-white/90 text-sm">Average per week</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl p-6 shadow-lg"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                      </div>
                          <p className="text-3xl font-bold text-white">1000+</p>
                    </div>
                        <h3 className="text-white font-semibold mb-1">Resources Created</h3>
                        <p className="text-white/90 text-sm">This month</p>
                      </motion.div>
                    </div>

                    {/* Available Tools Section */}
                      <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Available Tools</h3>
                      <p className="text-gray-600 mb-6">Select a tool to get started with AI-assisted teaching resources</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Tool 1: Activity & Project Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/activity-project-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                              <h4 className="font-bold text-gray-900 mb-1">Activity & Project Generator</h4>
                              <p className="text-sm text-gray-600">Create engaging activities and projects tailored to your curriculum.</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Tool 2: Worksheet Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/worksheet-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                              <h4 className="font-bold text-gray-900 mb-1">Worksheet Generator</h4>
                              <p className="text-sm text-gray-600">Design custom worksheets with exercises and problems.</p>
                      </div>
                      </div>
                        </motion.div>

                        {/* Tool 3: Concept Mastery Helper */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/concept-mastery-helper');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Lightbulb className="w-6 h-6 text-teal-600" />
                      </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Concept Mastery Helper</h4>
                              <p className="text-sm text-gray-600">Break down complex concepts into digestible lessons.</p>
                        </div>
                      </div>
                        </motion.div>

                        {/* Tool 4: Lesson Planner */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/lesson-planner');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-6 h-6 text-orange-600" />
                          </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Lesson Planner</h4>
                              <p className="text-sm text-gray-600">Plan structured lessons with objectives and activities.</p>
                                  </div>
                          </div>
                        </motion.div>

                        {/* Tool 5: Exam Question Paper Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/exam-question-paper-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileQuestion className="w-6 h-6 text-blue-600" />
                                          </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Exam Question Paper Generator</h4>
                              <p className="text-sm text-gray-600">Create comprehensive exam papers with varying difficulty.</p>
                                    </div>
                          </div>
                        </motion.div>

                        {/* Tool 6: Daily Class Plan Maker */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/daily-class-plan-maker');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CheckSquare className="w-6 h-6 text-teal-600" />
                                    </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Daily Class Plan Maker</h4>
                              <p className="text-sm text-gray-600">Organize your daily teaching schedule efficiently.</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tool 7: Homework Creator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.0 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/homework-creator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Rocket className="w-6 h-6 text-orange-600" />
                                </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Homework Creator</h4>
                              <p className="text-sm text-gray-600">Generate meaningful homework assignments.</p>
                              </div>
                            </div>
                        </motion.div>

                        {/* Tool 8: Rubrics & Evaluation Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.1 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/rubrics-evaluation-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Scale className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Rubrics & Evaluation Generator</h4>
                              <p className="text-sm text-gray-600">Create clear assessment criteria and rubrics.</p>
                        </div>
                      </div>
              </motion.div>

                        {/* Tool 9: Learning Outcomes Generator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.2 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/learning-outcomes-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Target className="w-6 h-6 text-teal-600" />
                    </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Learning Outcomes Generator</h4>
                              <p className="text-sm text-gray-600">Define measurable learning outcomes for your courses.</p>
                  </div>
                </div>
                        </motion.div>

                        {/* Tool 10: Story & Passage Creator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.3 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/story-passage-creator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-6 h-6 text-orange-600" />
                        </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Story & Passage Creator</h4>
                              <p className="text-sm text-gray-600">Generate engaging stories and reading passages.</p>
                          </div>
                          </div>
                        </motion.div>

                        {/* Tool 11: MCQ Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.4 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/mcq-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                                  <div>
                              <h4 className="font-bold text-gray-900 mb-1">MCQ Generator</h4>
                              <p className="text-sm text-gray-600">Create multiple-choice questions with detailed explanations.</p>
                                  </div>
                                </div>
                        </motion.div>

                        {/* Tool 12: Short Notes & Summaries Maker */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.5 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                            onClick={() => {
                            setLocation('/teacher/tools/short-notes-summaries-maker');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Layers className="w-6 h-6 text-teal-600" />
                        </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Short Notes & Summaries Maker</h4>
                              <p className="text-sm text-gray-600">Condense complex topics into concise notes.</p>
                      </div>
                </div>
              </motion.div>

                        {/* Tool 13: Flashcard Generator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.6 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/flashcard-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <CreditCard className="w-6 h-6 text-orange-600" />
                    </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Flashcard Generator</h4>
                              <p className="text-sm text-gray-600">Build study flashcards for quick revision.</p>
                  </div>
                </div>
                        </motion.div>

                        {/* Tool 14: Report Card Generator */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.7 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/report-card-generator');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileCheck className="w-6 h-6 text-blue-600" />
                      </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Report Card Generator</h4>
                              <p className="text-sm text-gray-600">Generate comprehensive student progress reports with feedback.</p>
                  </div>
                  </div>
                        </motion.div>

                        {/* Tool 15: Student Skill Tracker */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.8 }}
                          className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
                          onClick={() => {
                            setLocation('/teacher/tools/student-skill-tracker');
                          }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 mb-1">Student Skill Tracker</h4>
                              <p className="text-sm text-gray-600">Monitor and track student skill development.</p>
                          </div>
                            </div>
                        </motion.div>
                            </div>
                            </div>
                  </div>
                )}

                {/* Chat Content */}
                {vidyaAiTab === 'chat' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Chat Assistant</h2>
                      <p className="text-gray-600">Get instant help with teaching questions, lesson planning, and educational guidance</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md border border-gray-200" style={{ minHeight: '600px' }}>
                      {teacherId ? (
                        <AIChat
                          userId={teacherId}
                          className="flex-1 h-full"
                          context={{
                            studentName: teacherUser?.fullName || teacherUser?.email?.split('@')[0] || "Teacher",
                            currentSubject: teacherSubjects.length > 0 ? teacherSubjects[0].name : "General",
                            currentTopic: undefined
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[600px]">
                          <div className="text-center">
                            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Loading chat...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
                </>
              )}

              {/* My Students Tab */}
              {dashboardSubTab === 'students' && (
                <div className="space-y-8">
                  {/* Students Sub-Tabs */}
                  <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/20">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={studentsSubTab === 'list' ? 'default' : 'outline'}
                        className={studentsSubTab === 'list' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'}
                        onClick={() => setStudentsSubTab('list')}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Student List
                      </Button>
                      <Button
                        variant={studentsSubTab === 'track-progress' ? 'default' : 'outline'}
                        className={studentsSubTab === 'track-progress' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'}
                        onClick={() => setStudentsSubTab('track-progress')}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Track Progress
                      </Button>
                      <Button
                        variant={studentsSubTab === 'submissions' ? 'default' : 'outline'}
                        className={studentsSubTab === 'submissions' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'}
                        onClick={() => setStudentsSubTab('submissions')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Submissions
                      </Button>
                    </div>
                  </div>

                  {/* Student List Sub-Tab */}
                  {studentsSubTab === 'list' && (
                    <>
                      {/* Search Bar */}
                      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                          <Input
                            placeholder="Search students by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full rounded-xl bg-white/70 border-gray-200 text-gray-900 backdrop-blur-sm"
                          />
                        </div>
                      </div>

                  <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Student</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Class</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Overall Progress</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Average</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Last Login</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students
                            .filter(student => 
                              student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              student.phone?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((student) => {
                              const perf = student.performance || {};
                              const classDisplay = student.assignedClass 
                                ? `${student.assignedClass.classNumber || student.classNumber}${student.assignedClass.section || ''}`
                                : student.classNumber;
                              
                              return (
                                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4">
                                    <div>
                                      <p className="font-medium text-gray-900">{student.name || student.fullName}</p>
                                      <p className="text-sm text-gray-600">{student.email}</p>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div>
                                      {student.phone ? (
                                        <p className="text-sm text-gray-900">{student.phone}</p>
                                      ) : (
                                        <p className="text-sm text-gray-400">No phone</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge className="bg-blue-100 text-blue-800">{classDisplay}</Badge>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge className={student.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {student.isActive !== false ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4">
                                    {perf.overallProgress !== null && perf.overallProgress !== undefined && perf.overallProgress > 0 ? (
                                      <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <span className="text-sm font-medium text-gray-900">Overall Progress:</span>
                                          <Badge className={perf.overallProgress >= 70 ? 'bg-green-100 text-green-800' : 
                                                           perf.overallProgress >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                                                           'bg-red-100 text-red-800'}>
                                            {perf.overallProgress.toFixed(1)}%
                                          </Badge>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full ${
                                              perf.overallProgress >= 70 ? 'bg-green-500' : 
                                              perf.overallProgress >= 50 ? 'bg-yellow-500' : 
                                              'bg-red-500'
                                            }`}
                                            style={{ width: `${perf.overallProgress}%` }}
                                          />
                                        </div>
                                        {perf.totalExams > 0 && (
                                          <p className="text-xs text-gray-500 mt-1">{perf.totalExams} exam{perf.totalExams !== 1 ? 's' : ''} completed</p>
                                        )}
                                        {perf.learningProgress !== null && perf.learningProgress !== undefined && perf.learningProgress > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs text-gray-600">Learning Progress:</span>
                                              <Badge className={
                                                perf.learningProgress >= 70 ? 'bg-blue-100 text-blue-800' : 
                                                perf.learningProgress >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-red-100 text-red-800'
                                              }>
                                                {perf.learningProgress.toFixed(0)}%
                                              </Badge>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                              <div 
                                                className={`h-1.5 rounded-full ${
                                                  perf.learningProgress >= 70 ? 'bg-blue-500' : 
                                                  perf.learningProgress >= 50 ? 'bg-yellow-500' : 
                                                  'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min(perf.learningProgress, 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-sm text-gray-400">No progress data</span>
                                        {perf.totalExams === 0 && (
                                          <p className="text-xs text-gray-400 mt-1">No exams taken</p>
                                        )}
                                        {perf.learningProgress === 0 && (
                                          <p className="text-xs text-gray-400 mt-1">No content completed</p>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {perf.totalExams > 0 ? (
                                      <div>
                                        <span className="text-sm font-medium text-gray-900">
                                          {perf.averageMarks?.toFixed(1) || '0'}
                                        </span>
                                        <p className="text-xs text-gray-500">{perf.totalExams} exam{perf.totalExams !== 1 ? 's' : ''}</p>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {student.lastLogin ? (
                                      <div>
                                        <p className="text-sm text-gray-900">
                                          {new Date(student.lastLogin).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {new Date(student.lastLogin).toLocaleTimeString()}
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">Never</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0"
                                      onClick={() => {
                                        setSelectedStudentForRemark(student);
                                        setIsRemarkDialogOpen(true);
                                      }}
                                    >
                                      <MessageSquare className="w-4 h-4 mr-1" />
                                      Add Remark
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Remark Dialog */}
                  <Dialog open={isRemarkDialogOpen} onOpenChange={setIsRemarkDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          Add Remark for {selectedStudentForRemark?.name || selectedStudentForRemark?.fullName}
                        </DialogTitle>
                        <DialogDescription>
                          Add a remark that will be visible to the student on their dashboard.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="remark-type">Remark Type</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={isPositiveRemark ? "default" : "outline"}
                              className={isPositiveRemark ? "bg-green-500 hover:bg-green-600" : ""}
                              onClick={() => setIsPositiveRemark(true)}
                            >
                              Positive
                            </Button>
                            <Button
                              type="button"
                              variant={!isPositiveRemark ? "default" : "outline"}
                              className={!isPositiveRemark ? "bg-orange-500 hover:bg-orange-600" : ""}
                              onClick={() => setIsPositiveRemark(false)}
                            >
                              Needs Improvement
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject (Optional)</Label>
                          <Select value={selectedSubjectForRemark} onValueChange={setSelectedSubjectForRemark}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Remark</SelectItem>
                              {teacherSubjects.map((subject) => (
                                <SelectItem key={subject._id || subject.id} value={subject._id || subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="remark">Remark</Label>
                          <Textarea
                            id="remark"
                            placeholder="Enter your remark here..."
                            value={remarkText}
                            onChange={(e) => setRemarkText(e.target.value)}
                            className="min-h-[120px]"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsRemarkDialogOpen(false);
                              setRemarkText('');
                              setSelectedSubjectForRemark('general');
                              setSelectedStudentForRemark(null);
                              setIsPositiveRemark(true);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            onClick={async () => {
                              if (!remarkText.trim() || !selectedStudentForRemark) return;
                              
                              setIsSubmittingRemark(true);
                              try {
                                const token = localStorage.getItem('authToken');
                                const response = await fetch(
                                  `${API_BASE_URL}/api/teacher/students/${selectedStudentForRemark.id || selectedStudentForRemark._id}/remarks`,
                                  {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                      remark: remarkText,
                                      subject: selectedSubjectForRemark && selectedSubjectForRemark !== 'general' ? selectedSubjectForRemark : null,
                                      isPositive: isPositiveRemark
                                    })
                                  }
                                );

                                const data = await response.json();
                                if (response.ok && data.success) {
                                  // Success - close dialog and reset
                                  setIsRemarkDialogOpen(false);
                                  setRemarkText('');
                                  setSelectedSubjectForRemark('general');
                                  setSelectedStudentForRemark(null);
                                  setIsPositiveRemark(true);
                                  // Show success message (you can add toast here)
                                  alert('Remark added successfully!');
                                } else {
                                  alert(data.message || 'Failed to add remark');
                                }
                              } catch (error) {
                                console.error('Error adding remark:', error);
                                alert('Failed to add remark. Please try again.');
                              } finally {
                                setIsSubmittingRemark(false);
                              }
                            }}
                            disabled={!remarkText.trim() || isSubmittingRemark}
                          >
                            {isSubmittingRemark ? 'Adding...' : 'Add Remark'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                    </>
                  )}

                  {/* Track Progress Sub-Tab */}
                  {studentsSubTab === 'track-progress' && (
                    <div className="space-y-8">
                      {/* Header */}
                      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Track Student Progress</h2>
                            <p className="text-gray-600">Monitor and analyze student performance over time</p>
                          </div>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                          <Input
                            placeholder="Search students by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full rounded-xl bg-white/70 border-gray-200 text-gray-900 backdrop-blur-sm"
                          />
                        </div>
                      </div>

                      {isLoadingProgress ? (
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/20 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                            <p className="text-gray-600">Loading student progress data...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                      {/* Visual Graphs and Analyses */}
                      {(() => {
                        // Calculate class-wide statistics
                        const studentsWithData = students.filter(s => {
                          const perf = s.performance || {};
                          return perf.totalExams > 0 || perf.overallProgress > 0 || (perf.dailyAverageWatchTime && perf.dailyAverageWatchTime > 0);
                        });

                        // Exam Performance Analysis
                        const examPerformanceData = [
                          {
                            category: 'Excellent (≥70%)',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              return perf.averagePercentage && perf.averagePercentage >= 70;
                            }).length,
                            color: '#10b981'
                          },
                          {
                            category: 'Good (50-69%)',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              return perf.averagePercentage && perf.averagePercentage >= 50 && perf.averagePercentage < 70;
                            }).length,
                            color: '#f59e0b'
                          },
                          {
                            category: 'Needs Improvement (<50%)',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              return perf.averagePercentage && perf.averagePercentage < 50;
                            }).length,
                            color: '#ef4444'
                          },
                          {
                            category: 'No Exams',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              return !perf.averagePercentage || perf.totalExams === 0;
                            }).length,
                            color: '#9ca3af'
                          }
                        ];

                        const avgExamScore = studentsWithData.length > 0
                          ? studentsWithData.reduce((sum, s) => {
                              const perf = s.performance || {};
                              return sum + (perf.averagePercentage || 0);
                            }, 0) / studentsWithData.filter(s => (s.performance || {}).averagePercentage).length
                          : 0;

                        // Progress Distribution
                        const progressDistribution = [
                          {
                            name: 'Excellent (≥70%)',
                            value: students.filter(s => {
                              const perf = s.performance || {};
                              return perf.overallProgress && perf.overallProgress >= 70;
                            }).length,
                            color: '#10b981'
                          },
                          {
                            name: 'Good (50-69%)',
                            value: students.filter(s => {
                              const perf = s.performance || {};
                              return perf.overallProgress && perf.overallProgress >= 50 && perf.overallProgress < 70;
                            }).length,
                            color: '#f59e0b'
                          },
                          {
                            name: 'Needs Improvement (<50%)',
                            value: students.filter(s => {
                              const perf = s.performance || {};
                              return !perf.overallProgress || perf.overallProgress < 50;
                            }).length,
                            color: '#ef4444'
                          }
                        ];

                        const avgProgress = studentsWithData.length > 0
                          ? studentsWithData.reduce((sum, s) => {
                              const perf = s.performance || {};
                              return sum + (perf.overallProgress || 0);
                            }, 0) / studentsWithData.length
                          : 0;

                        // Watch Time Analysis
                        const watchTimeData = students
                          .filter(s => {
                            const perf = s.performance || {};
                            return perf.dailyAverageWatchTime && perf.dailyAverageWatchTime > 0;
                          })
                          .map(s => ({
                            name: s.name || s.fullName || 'Student',
                            watchTime: (s.performance || {}).dailyAverageWatchTime || 0
                          }))
                          .sort((a, b) => b.watchTime - a.watchTime)
                          .slice(0, 10); // Top 10 students

                        const avgWatchTime = studentsWithData.length > 0
                          ? studentsWithData.reduce((sum, s) => {
                              const perf = s.performance || {};
                              return sum + (perf.dailyAverageWatchTime || 0);
                            }, 0) / studentsWithData.filter(s => (s.performance || {}).dailyAverageWatchTime).length
                          : 0;

                        const watchTimeDistribution = [
                          {
                            range: '0-15 min',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              const time = perf.dailyAverageWatchTime || 0;
                              return time > 0 && time <= 15;
                            }).length,
                            color: '#ef4444'
                          },
                          {
                            range: '16-30 min',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              const time = perf.dailyAverageWatchTime || 0;
                              return time > 15 && time <= 30;
                            }).length,
                            color: '#f59e0b'
                          },
                          {
                            range: '31-60 min',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              const time = perf.dailyAverageWatchTime || 0;
                              return time > 30 && time <= 60;
                            }).length,
                            color: '#3b82f6'
                          },
                          {
                            range: '60+ min',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              const time = perf.dailyAverageWatchTime || 0;
                              return time > 60;
                            }).length,
                            color: '#10b981'
                          },
                          {
                            range: 'No Data',
                            count: students.filter(s => {
                              const perf = s.performance || {};
                              return !perf.dailyAverageWatchTime || perf.dailyAverageWatchTime === 0;
                            }).length,
                            color: '#9ca3af'
                          }
                        ];

                        return (
                          <div className="space-y-8">
                            {/* Class Performance Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                                    <Target className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">
                                      {avgExamScore.toFixed(1)}%
                                    </p>
                                    <p className="text-sm text-gray-600">Avg Exam Score</p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {studentsWithData.filter(s => (s.performance || {}).averagePercentage).length} students with exam data
                                </p>
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">
                                      {avgProgress.toFixed(1)}%
                                    </p>
                                    <p className="text-sm text-gray-600">Avg Progress</p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {studentsWithData.length} students tracked
                                </p>
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl">
                                    <Clock className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900">
                                      {avgWatchTime.toFixed(1)} min
                                    </p>
                                    <p className="text-sm text-gray-600">Avg Watch Time</p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {studentsWithData.filter(s => (s.performance || {}).dailyAverageWatchTime).length} students with watch data
                                </p>
                              </motion.div>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Exam Performance Distribution */}
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                                  Exam Performance Distribution
                                </h3>
                                <ChartContainer
                                  config={{
                                    count: { label: "Students", color: "hsl(var(--chart-1))" }
                                  }}
                                  className="h-[300px]"
                                >
                                  <BarChart data={examPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                    <XAxis 
                                      dataKey="category" 
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                      angle={-45}
                                      textAnchor="end"
                                      height={80}
                                    />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                      {examPerformanceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ChartContainer>
                                <div className="mt-4 text-sm text-gray-600">
                                  <p>Total students with exams: {students.filter(s => (s.performance || {}).totalExams > 0).length}</p>
                                </div>
                              </motion.div>

                              {/* Progress Distribution Pie Chart */}
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Target className="w-5 h-5 text-emerald-600" />
                                  Overall Progress Distribution
                                </h3>
                                <ChartContainer
                                  config={{
                                    excellent: { label: "Excellent", color: "#10b981" },
                                    good: { label: "Good", color: "#f59e0b" },
                                    needsImprovement: { label: "Needs Improvement", color: "#ef4444" }
                                  }}
                                  className="h-[300px]"
                                >
                                  <PieChart>
                                    <Pie
                                      data={progressDistribution}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={100}
                                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                      {progressDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                  </PieChart>
                                </ChartContainer>
                                <div className="mt-4 text-sm text-gray-600">
                                  <p>Total students: {students.length}</p>
                                </div>
                              </motion.div>

                              {/* Watch Time Distribution */}
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                              >
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-emerald-600" />
                                  Daily Watch Time Distribution
                                </h3>
                                <ChartContainer
                                  config={{
                                    count: { label: "Students", color: "hsl(var(--chart-1))" }
                                  }}
                                  className="h-[300px]"
                                >
                                  <BarChart data={watchTimeDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                    <XAxis 
                                      dataKey="range" 
                                      tick={{ fill: '#6b7280', fontSize: 12 }}
                                    />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                      {watchTimeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ChartContainer>
                                <div className="mt-4 text-sm text-gray-600">
                                  <p>Students with watch data: {students.filter(s => (s.performance || {}).dailyAverageWatchTime).length}</p>
                                </div>
                              </motion.div>

                              {/* Top Watch Time Students */}
                              {watchTimeData.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                                >
                                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    Top 10 Watch Time Leaders
                                  </h3>
                                  <ChartContainer
                                    config={{
                                      watchTime: { label: "Watch Time (min)", color: "#8b5cf6" }
                                    }}
                                    className="h-[300px]"
                                  >
                                    <BarChart data={watchTimeData} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                      <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                        width={120}
                                      />
                                      <ChartTooltip content={<ChartTooltipContent />} />
                                      <Bar dataKey="watchTime" radius={[0, 8, 8, 0]} fill="#8b5cf6" />
                                    </BarChart>
                                  </ChartContainer>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Progress Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl">
                              <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                {students.filter(s => {
                                  const perf = s.performance || {};
                                  return perf.overallProgress && perf.overallProgress >= 70;
                                }).length}
                              </p>
                              <p className="text-sm text-gray-600">High Performers</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Students with ≥70% progress</p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl">
                              <Target className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                {students.filter(s => {
                                  const perf = s.performance || {};
                                  return perf.overallProgress && perf.overallProgress >= 50 && perf.overallProgress < 70;
                                }).length}
                              </p>
                              <p className="text-sm text-gray-600">Average Performers</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Students with 50-69% progress</p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-br from-red-400 to-pink-400 rounded-xl">
                              <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                {students.filter(s => {
                                  const perf = s.performance || {};
                                  return !perf.overallProgress || perf.overallProgress < 50;
                                }).length}
                              </p>
                              <p className="text-sm text-gray-600">Need Attention</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Students with &lt;50% progress</p>
                        </motion.div>
                      </div>

                      {/* Student Progress Table */}
                      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Detailed Progress Report</h3>
                          <p className="text-sm text-gray-600">View individual student progress and performance metrics</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Student</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Class</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Overall Progress</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Learning Progress</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Average Score</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Exams Taken</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Daily Avg Watch Time</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Last Activity</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {students
                                .filter(student => 
                                  student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  student.phone?.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((student) => {
                                  const perf = student.performance || {};
                                  const classDisplay = student.assignedClass 
                                    ? `${student.assignedClass.classNumber || student.classNumber}${student.assignedClass.section || ''}`
                                    : student.classNumber;
                                  // Get data from database
                                  const progress = perf.overallProgress !== null && perf.overallProgress !== undefined ? perf.overallProgress : 0;
                                  const avgScore = perf.averagePercentage !== null && perf.averagePercentage !== undefined ? perf.averagePercentage : 0;
                                  const examsTaken = perf.totalExams !== null && perf.totalExams !== undefined ? perf.totalExams : 0;
                                  const watchTime = perf.dailyAverageWatchTime !== null && perf.dailyAverageWatchTime !== undefined ? perf.dailyAverageWatchTime : 0;
                                  
                                  // Debug: Log watch time for troubleshooting
                                  if (student.name) {
                                    console.log(`Student: ${student.name}, Watch Time: ${watchTime}, Performance:`, perf);
                                  }
                                  
                                  return (
                                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                      <td className="py-3 px-4">
                                        <div>
                                          <p className="font-medium text-gray-900">{student.name || student.fullName}</p>
                                          <p className="text-sm text-gray-600">{student.email}</p>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Badge className="bg-blue-100 text-blue-800">{classDisplay}</Badge>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-900">{progress.toFixed(1)}%</span>
                                            <Badge className={
                                              progress >= 70 ? 'bg-green-100 text-green-800' : 
                                              progress >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                                              'bg-red-100 text-red-800'
                                            }>
                                              {progress >= 70 ? 'Excellent' : progress >= 50 ? 'Good' : 'Needs Improvement'}
                                            </Badge>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full transition-all ${
                                                progress >= 70 ? 'bg-green-500' : 
                                                progress >= 50 ? 'bg-yellow-500' : 
                                                'bg-red-500'
                                              }`}
                                              style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        {(() => {
                                          const learningProgress = perf.learningProgress !== null && perf.learningProgress !== undefined ? perf.learningProgress : 0;
                                          return learningProgress > 0 ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{learningProgress.toFixed(1)}%</span>
                                                <Badge className={
                                                  learningProgress >= 70 ? 'bg-blue-100 text-blue-800' : 
                                                  learningProgress >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                                                  'bg-red-100 text-red-800'
                                                }>
                                                  {learningProgress >= 70 ? 'High' : learningProgress >= 50 ? 'Medium' : 'Low'}
                                                </Badge>
                                              </div>
                                              <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                  className={`h-2 rounded-full transition-all ${
                                                    learningProgress >= 70 ? 'bg-blue-500' : 
                                                    learningProgress >= 50 ? 'bg-yellow-500' : 
                                                    'bg-red-500'
                                                  }`}
                                                  style={{ width: `${Math.min(learningProgress, 100)}%` }}
                                                />
                                              </div>
                                              <p className="text-xs text-gray-500">Content Completion</p>
                                            </div>
                                          ) : (
                                            <span className="text-sm text-gray-400">No data</span>
                                          );
                                        })()}
                                      </td>
                                      <td className="py-3 px-4">
                                        {examsTaken > 0 ? (
                                          <div>
                                            <span className="text-sm font-medium text-gray-900">
                                              {avgScore.toFixed(1)}%
                                            </span>
                                            <p className="text-xs text-gray-500">Average Score</p>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">No data</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                          <ClipboardCheck className="w-4 h-4 text-gray-500" />
                                          <span className="text-sm font-medium text-gray-900">{examsTaken}</span>
                                          {examsTaken > 0 && (
                                            <span className="text-xs text-gray-500">exam{examsTaken !== 1 ? 's' : ''}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        {watchTime !== null && watchTime !== undefined && watchTime > 0 ? (
                                          <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-900">
                                              {watchTime.toFixed(1)} min
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-400">0 min</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {student.lastLogin ? (
                                          <div>
                                            <p className="text-sm text-gray-900">
                                              {new Date(student.lastLogin).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {new Date(student.lastLogin).toLocaleTimeString()}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">Never</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        <Badge className={student.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                          {student.isActive !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                          {students.length === 0 && (
                            <div className="text-center py-12">
                              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">No students found</p>
                            </div>
                          )}
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Submissions Sub-Tab */}
                  {studentsSubTab === 'submissions' && (
                    <div className="space-y-8">
                      {/* Header */}
                      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Homework Submissions</h2>
                              <p className="text-gray-600">View and manage student homework submissions</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setIsHomeworkModalOpen(true)}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Homework
                          </Button>
                        </div>
                      </div>

                      {isLoadingSubmissions ? (
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/20 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                            <p className="text-gray-600">Loading submissions...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {/* Homework Submissions Section */}
                          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-purple-600" />
                              Homework Submissions
                            </h3>
                            <div className="space-y-4">
                              {homeworkSubmissions.homeworks && homeworkSubmissions.homeworks.length > 0 ? (
                                homeworkSubmissions.homeworks
                                  .sort((a: any, b: any) => {
                                    // Sort by deadline (most recent first), then by creation date
                                    const deadlineA = a.homework?.deadline ? new Date(a.homework.deadline).getTime() : 0;
                                    const deadlineB = b.homework?.deadline ? new Date(b.homework.deadline).getTime() : 0;
                                    if (deadlineB !== deadlineA) return deadlineB - deadlineA;
                                    const createdA = a.homework?.createdAt ? new Date(a.homework.createdAt).getTime() : 0;
                                    const createdB = b.homework?.createdAt ? new Date(b.homework.createdAt).getTime() : 0;
                                    return createdB - createdA;
                                  })
                                  .map((item: any) => {
                                    const homework = item.homework || {};
                                    const submissions = item.submissions || [];
                                    const homeworkId = homework._id || homework.id;
                                    const isExpanded = expandedHomework.has(homeworkId);
                                    const deadline = homework.deadline ? new Date(homework.deadline) : null;
                                    const isOverdue = deadline && deadline < new Date() && submissions.length === 0;
                                    
                                    return (
                                      <div key={homeworkId} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div
                                          className={`p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 cursor-pointer transition-all ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
                                          onClick={() => {
                                            const newExpanded = new Set(expandedHomework);
                                            if (isExpanded) {
                                              newExpanded.delete(homeworkId);
                                            } else {
                                              newExpanded.add(homeworkId);
                                            }
                                            setExpandedHomework(newExpanded);
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-semibold text-gray-900">{homework.title || 'Untitled Homework'}</h4>
                                                {isOverdue && (
                                                  <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                                                )}
                                                {deadline && deadline >= new Date() && (
                                                  <Badge className="bg-yellow-100 text-yellow-800">Active</Badge>
                                                )}
                                              </div>
                                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <span className="font-medium">Subject: {homework.subject?.name || homework.subject || 'N/A'}</span>
                                                {homework.classNumber && (
                                                  <Badge variant="outline" className="bg-gray-50">
                                                    Class: {homework.classNumber}
                                                  </Badge>
                                                )}
                                                {homework.topic && (
                                                  <span className="text-gray-500">Topic: {homework.topic}</span>
                                                )}
                                                {deadline && (
                                                  <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                                    Deadline: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                )}
                                              </div>
                                              {homework.description && (
                                                <p className="text-sm text-gray-600 mt-2 italic">{homework.description}</p>
                                              )}
                                              {homework.fileUrl && (
                                                <div className="mt-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(homework.fileUrl, '_blank');
                                                    }}
                                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                                  >
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    View Homework File
                                                  </Button>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-3 mt-2">
                                                <Badge className={`${submissions.length > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                                                  {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                                                </Badge>
                                                {submissions.length > 0 && (
                                                  <span className="text-xs text-gray-500">
                                                    {students.length - submissions.length} pending
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <ChevronDown
                                              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                            />
                                          </div>
                                        </div>
                                        {isExpanded && (
                                          <div className="p-4 bg-white border-t border-gray-200">
                                            {submissions.length > 0 ? (
                                              <div className="space-y-3">
                                                {submissions.map((submission: any) => (
                                                  <div key={submission._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-start justify-between">
                                                      <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                          <p className="font-medium text-gray-900">
                                                            {submission.studentId?.fullName || submission.studentId?.name || 'Unknown Student'}
                                                          </p>
                                                          <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                                                          {submission.grade !== null && submission.grade !== undefined && (
                                                            <Badge className="bg-blue-100 text-blue-800">
                                                              Grade: {submission.grade}%
                                                            </Badge>
                                                          )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">
                                                          {submission.studentId?.email || ''}
                                                        </p>
                                                        {submission.description && (
                                                          <p className="text-sm text-gray-700 mb-2">{submission.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                                          <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
                                                          {submission.feedback && (
                                                            <span className="text-gray-600">Feedback: {submission.feedback}</span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="ml-4">
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(submission.submissionLink, '_blank');
                                                          }}
                                                          className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                                                        >
                                                          <Eye className="w-4 h-4 mr-1" />
                                                          View Submission
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-gray-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                                <p>No submissions yet for this homework</p>
                                                {deadline && deadline < new Date() && (
                                                  <p className="text-sm text-red-600 mt-2">This homework is overdue</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                              ) : (
                                <div className="text-center py-12 text-gray-500">
                                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                  <p>No homework assignments found for your assigned subjects</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Submissions by Students Section */}
                          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <Users className="w-5 h-5 text-purple-600" />
                              Submissions by Students
                            </h3>
                            <div className="space-y-2">
                              {students.length > 0 ? (
                                students.map((student) => {
                                  const studentId = student.id || student._id;
                                  const isExpanded = expandedStudent.has(studentId);
                                  
                                  // Find submissions for this student
                                  const studentSubmissions = homeworkSubmissions.students?.find(
                                    (item: any) => (item.student?._id || item.student?.id) === studentId
                                  )?.submissions || [];
                                  
                                  return (
                                    <div key={studentId} className="border border-gray-200 rounded-xl overflow-hidden">
                                      <div
                                        className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 cursor-pointer transition-all"
                                        onClick={() => {
                                          const newExpanded = new Set(expandedStudent);
                                          if (isExpanded) {
                                            newExpanded.delete(studentId);
                                          } else {
                                            newExpanded.add(studentId);
                                          }
                                          setExpandedStudent(newExpanded);
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                              <h4 className="font-semibold text-gray-900">
                                                {student.name || student.fullName || 'Unknown Student'}
                                              </h4>
                                              {student.assignedClass && (
                                                <Badge className="bg-gray-100 text-gray-700">
                                                  {student.assignedClass.classNumber || student.classNumber}
                                                  {student.assignedClass.section || ''}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{student.email || ''}</p>
                                            <Badge className={`mt-2 ${studentSubmissions.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                              {studentSubmissions.length} homework{studentSubmissions.length !== 1 ? 's' : ''} submitted
                                            </Badge>
                                          </div>
                                          <ChevronDown
                                            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                                          />
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="p-4 bg-white border-t border-gray-200">
                                          {studentSubmissions.length > 0 ? (
                                            <div className="space-y-3">
                                              {studentSubmissions.map((submission: any) => (
                                                <div key={submission._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <h5 className="font-medium text-gray-900 mb-2">
                                                        {submission.homeworkId?.title || 'Untitled Homework'}
                                                      </h5>
                                                      <div className="flex items-center gap-4 mb-2 text-sm text-gray-600">
                                                        <span>Subject: {submission.subjectId?.name || submission.subjectId || 'N/A'}</span>
                                                        {submission.homeworkId?.deadline && (
                                                          <span>Deadline: {new Date(submission.homeworkId.deadline).toLocaleDateString()}</span>
                                                        )}
                                                      </div>
                                                      {submission.description && (
                                                        <p className="text-sm text-gray-700 mb-2">{submission.description}</p>
                                                      )}
                                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
                                                        {submission.grade !== null && submission.grade !== undefined && (
                                                          <span>Grade: {submission.grade}%</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="ml-4">
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          window.open(submission.submissionLink, '_blank');
                                                        }}
                                                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                                                      >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-8 text-gray-500">
                                              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                              <p>No submissions from this student</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-12 text-gray-500">
                                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                  <p>No students found</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* EduOTT Tab */}
              {dashboardSubTab === 'eduott' && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <VideoIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">EduOTT</h2>
                        <p className="text-gray-600">Educational videos and live sessions</p>
                      </div>
                    </div>

                    {/* Tabs */}
                    <Tabs value={eduottActiveTab} onValueChange={(value) => setEduottActiveTab(value as 'videos' | 'live-sessions')} className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="live-sessions">Live Sessions</TabsTrigger>
                      </TabsList>

                      {/* Videos Tab */}
                      <TabsContent value="videos" className="space-y-6">
                        {/* Search and Filter */}
                        <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="text"
                          placeholder="Search videos by title..."
                          value={eduottSearchTerm}
                          onChange={(e) => setEduottSearchTerm(e.target.value)}
                          className="pl-10 w-full"
                        />
                      </div>
                      <div className="md:w-64">
                        <Select value={eduottSelectedSubject} onValueChange={setEduottSelectedSubject}>
                          <SelectTrigger className="w-full">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {teacherSubjects.map((subject) => (
                              <SelectItem key={subject._id || subject.id} value={subject.name}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        Showing {eduottVideos.filter((video) => {
                          const matchesSearch = video.title.toLowerCase().includes(eduottSearchTerm.toLowerCase()) ||
                                               (video.description || '').toLowerCase().includes(eduottSearchTerm.toLowerCase());
                          const matchesSubject = eduottSelectedSubject === 'all' || 
                                                video.subjectName === eduottSelectedSubject ||
                                                video.subject === eduottSelectedSubject;
                          return matchesSearch && matchesSubject;
                        }).length} of {eduottVideos.length} videos
                      </p>
                    </div>

                    {/* Videos Grid */}
                    {isLoadingEduott ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Card key={i} className="overflow-hidden">
                            <div className="w-full h-48 bg-gray-200 animate-pulse" />
                            <CardHeader>
                              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                            </CardHeader>
                            <CardContent>
                              <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
                              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (() => {
                      const filteredVideos = eduottVideos.filter((video) => {
                        const matchesSearch = video.title.toLowerCase().includes(eduottSearchTerm.toLowerCase()) ||
                                             (video.description || '').toLowerCase().includes(eduottSearchTerm.toLowerCase());
                        const matchesSubject = eduottSelectedSubject === 'all' || 
                                              video.subjectName === eduottSelectedSubject ||
                                              video.subject === eduottSelectedSubject;
                        return matchesSearch && matchesSubject;
                      });

                      if (filteredVideos.length === 0) {
                        return (
                          <div className="text-center py-16 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 mt-6">
                            <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">
                              {eduottVideos.length === 0 ? 'No Videos Available' : 'No Videos Found'}
                            </h3>
                            <p className="text-gray-500">
                              {eduottVideos.length === 0 
                                ? 'No videos have been assigned to your subjects yet.' 
                                : 'Try adjusting your search or filter criteria.'}
                            </p>
                          </div>
                        );
                      }

                      const formatDuration = (minutes: number) => {
                        if (!minutes || minutes === 0) return '0:00';
                        const hrs = Math.floor(minutes / 60);
                        const mins = Math.floor(minutes % 60);
                        return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}` : `${mins}:00`;
                      };

                      const extractYouTubeId = (url: string) => {
                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                        const match = url.match(regExp);
                        return (match && match[2].length === 11) ? match[2] : null;
                      };

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                          {filteredVideos.map((video) => (
                            <Card 
                              key={video._id || video.id} 
                              className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                              onClick={() => {
                                setSelectedEduottVideo(video);
                                setIsEduottVideoModalOpen(true);
                              }}
                            >
                              {/* Video Thumbnail */}
                              <div className="relative">
                                {video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-full h-48 object-cover"
                                  />
                                ) : video.isYouTubeVideo && video.youtubeUrl ? (
                                  <img
                                    src={`https://img.youtube.com/vi/${extractYouTubeId(video.youtubeUrl)}/maxresdefault.jpg`}
                                    alt={video.title}
                                    className="w-full h-48 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                                    <Play className="w-16 h-16 text-white" fill="currentColor" />
                                  </div>
                                )}
                                
                                {/* Play Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                                    <Play className="w-8 h-8 text-purple-600 ml-1" fill="currentColor" />
                                  </div>
                                </div>

                                {/* Duration Badge */}
                                {(video.duration || video.durationSeconds) && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(video.duration || (video.durationSeconds ? video.durationSeconds / 60 : 0))}
                                  </div>
                                )}
                              </div>

                              <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                                    {video.title}
                                  </CardTitle>
                                </div>
                                {(video.subjectName || video.subject) && (
                                  <Badge variant="outline" className="mt-2 w-fit">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    {video.subjectName || video.subject}
                                  </Badge>
                                )}
                              </CardHeader>

                              <CardContent>
                                {video.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                    {video.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    <span>{video.views || 0} views</span>
                                  </div>
                                  {video.createdAt && (
                                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                      </TabsContent>

                      {/* Live Sessions Tab */}
                      <TabsContent value="live-sessions" className="space-y-6">
                        {/* Search and Filter */}
                        <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              type="text"
                              placeholder="Search live sessions..."
                              value={sessionSearchTerm}
                              onChange={(e) => setSessionSearchTerm(e.target.value)}
                              className="pl-10 w-full"
                            />
                          </div>
                          <div className="md:w-64">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                              <SelectTrigger className="w-full">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="ended">Ended</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Live Sessions List */}
                        {isLoadingLiveSessions ? (
                          <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Card key={i} className="overflow-hidden">
                                <Skeleton className="w-full h-32" />
                              </Card>
                            ))}
                          </div>
                        ) : liveSessions.filter((session) => {
                          const matchesSearch = session.title?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
                            session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
                          const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
                          return matchesSearch && matchesStatus;
                        }).length === 0 ? (
                          <div className="text-center py-16 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
                            <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">
                              {liveSessions.length === 0 ? 'No Live Sessions Available' : 'No Live Sessions Found'}
                            </h3>
                            <p className="text-gray-500">
                              {liveSessions.length === 0 
                                ? 'No live sessions have been scheduled for your subjects yet.' 
                                : 'Try adjusting your search or filter criteria.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {liveSessions.filter((session) => {
                              const matchesSearch = session.title?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
                                session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
                              const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
                              return matchesSearch && matchesStatus;
                            }).map((session) => {
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'live':
                                    return 'bg-red-100 text-red-700';
                                  case 'scheduled':
                                    return 'bg-blue-100 text-blue-700';
                                  case 'ended':
                                    return 'bg-gray-100 text-gray-700';
                                  case 'cancelled':
                                    return 'bg-orange-100 text-orange-700';
                                  default:
                                    return 'bg-gray-100 text-gray-700';
                                }
                              };

                              return (
                                <Card key={session._id || session.id} className="hover:shadow-lg transition-shadow">
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                                          <Badge className={getStatusColor(session.status)}>
                                            {session.status?.toUpperCase() || 'UNKNOWN'}
                                          </Badge>
                                        </div>
                                        {session.description && (
                                          <p className="text-gray-600 mb-4">{session.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                          {session.streamer?.fullName || session.streamer?.email ? (
                                            <div className="flex items-center gap-1">
                                              <Users className="w-4 h-4" />
                                              <span>{session.streamer?.fullName || session.streamer?.email}</span>
                                            </div>
                                          ) : null}
                                          {session.subject?.name && (
                                            <div className="flex items-center gap-1">
                                              <BookOpen className="w-4 h-4" />
                                              <span>{session.subject.name}</span>
                                            </div>
                                          )}
                                          {session.classNumber && (
                                            <Badge variant="outline">Class {session.classNumber}</Badge>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            <span>{session.viewerCount || 0} viewers</span>
                                          </div>
                                          {(session.scheduledTime || session.scheduledStartTime) && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="w-4 h-4" />
                                              <span>
                                                {new Date(session.scheduledTime || session.scheduledStartTime || '').toLocaleString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {session.status === 'live' && (session.hlsUrl || session.playbackUrl) && (
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            const streamUrl = session.hlsUrl || session.playbackUrl;
                                            if (streamUrl) {
                                              window.open(streamUrl, '_blank');
                                            }
                                          }}
                                        >
                                          <Play className="w-4 h-4 mr-2" />
                                          Watch Live
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
            </div>

        {/* Add Video Modal */}
        <Dialog open={isAddVideoModalOpen} onOpenChange={setIsAddVideoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Add New Video</DialogTitle>
            <DialogDescription>
              Create a new educational video for your students.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateVideo} className="space-y-4">
            <div>
              <Label htmlFor="video-title" className="text-gray-700 font-medium">Title *</Label>
              <Input
                id="video-title"
                value={videoForm.title}
                onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="video-description" className="text-gray-700 font-medium">Description</Label>
              <Textarea
                id="video-description"
                value={videoForm.description}
                onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter video description"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="video-url" className="text-gray-700 font-medium">Video URL *</Label>
              <Input
                id="video-url"
                type="url"
                value={videoForm.videoUrl}
                onChange={(e) => setVideoForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="video-subject" className="text-gray-700 font-medium">Subject *</Label>
              {teacherSubjects.length === 0 && (
                <div className="mt-1 mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>No subjects assigned:</strong> You need to be assigned subjects by an admin before creating videos. 
                    Please contact your administrator to assign subjects to your account.
                  </p>
                </div>
              )}
              <Select value={videoForm.subject} onValueChange={(value) => setVideoForm(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {teacherSubjects.length > 0 ? (
                    teacherSubjects.map(subject => (
                      <SelectItem key={subject._id || subject.id} value={subject.name}>
                        {subject.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-subjects" disabled>
                      No subjects assigned - Contact admin to assign subjects
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="video-duration" className="text-gray-700 font-medium">Duration (minutes) *</Label>
              <Input
                id="video-duration"
                type="number"
                value={videoForm.duration}
                onChange={(e) => setVideoForm(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="60"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="video-difficulty" className="text-gray-700 font-medium">Difficulty</Label>
              <Select value={videoForm.difficulty} onValueChange={(value) => setVideoForm(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddVideoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingVideo || teacherSubjects.length === 0} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                {isCreatingVideo ? 'Creating...' : teacherSubjects.length === 0 ? 'No Subjects Assigned' : 'Create Video'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>


      {/* Video Viewer Modal */}
      <Dialog open={isVideoViewerOpen} onOpenChange={setIsVideoViewerOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">
              {selectedVideo?.title || 'Video Viewer'}
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.description || 'Watch your uploaded video'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {selectedVideo.videoUrl ? (
                  <iframe
                    src={selectedVideo.videoUrl}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-4" />
                      <p>Video URL not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Video Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Subject:</span>
                  <span className="ml-2 text-gray-900">{selectedVideo.subject}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-900">{selectedVideo.duration} minutes</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Difficulty:</span>
                  <span className="ml-2 text-gray-900 capitalize">{selectedVideo.difficulty}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Views:</span>
                  <span className="ml-2 text-gray-900">{selectedVideo.views || 0}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsVideoViewerOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Homework Modal */}
      <Dialog open={isHomeworkModalOpen} onOpenChange={setIsHomeworkModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create Homework</DialogTitle>
            <DialogDescription>
              Create homework assignment for your assigned classes and students
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateHomework} className="space-y-4">
            <div>
              <Label htmlFor="homework-title">Title *</Label>
              <Input
                id="homework-title"
                value={homeworkForm.title}
                onChange={(e) => setHomeworkForm({ ...homeworkForm, title: e.target.value })}
                placeholder="Enter homework title"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="homework-description">Description</Label>
              <Textarea
                id="homework-description"
                value={homeworkForm.description}
                onChange={(e) => setHomeworkForm({ ...homeworkForm, description: e.target.value })}
                placeholder="Enter homework description"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homework-subject">Subject *</Label>
                <Select
                  value={homeworkForm.subject}
                  onValueChange={(value) => setHomeworkForm({ ...homeworkForm, subject: value })}
                >
                  <SelectTrigger id="homework-subject" className="mt-1">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherSubjects.map((subject) => (
                      <SelectItem key={subject._id || subject.id} value={subject._id || subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="homework-class">Class (Optional)</Label>
                <Select
                  value={homeworkForm.classNumber || 'all'}
                  onValueChange={(value) => setHomeworkForm({ ...homeworkForm, classNumber: value === 'all' ? '' : value })}
                >
                  <SelectTrigger id="homework-class" className="mt-1">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {assignedClasses.map((classItem) => (
                      <SelectItem key={classItem._id || classItem.id} value={classItem.classNumber || classItem.name}>
                        {classItem.name || classItem.classNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="homework-topic">Topic (Optional)</Label>
              <Input
                id="homework-topic"
                value={homeworkForm.topic}
                onChange={(e) => setHomeworkForm({ ...homeworkForm, topic: e.target.value })}
                placeholder="e.g., Algebra, Mechanics"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homework-date">Date *</Label>
                <Input
                  id="homework-date"
                  type="date"
                  value={homeworkForm.date}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, date: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="homework-deadline">Deadline *</Label>
                <Input
                  id="homework-deadline"
                  type="date"
                  value={homeworkForm.deadline}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, deadline: e.target.value })}
                  min={homeworkForm.date}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="homework-file">File *</Label>
              <div className="space-y-2">
                <Input
                  id="homework-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedHomeworkFile(file);
                      setHomeworkForm({ ...homeworkForm, fileUrl: '' });
                    }
                  }}
                  className="cursor-pointer mt-1"
                />
                {selectedHomeworkFile && (
                  <p className="text-xs text-green-600">
                    Selected: {selectedHomeworkFile.name} ({(selectedHomeworkFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <div className="text-xs text-gray-500">
                  <p className="font-semibold mb-1">Or enter a URL:</p>
                  <Input
                    id="homework-fileUrl"
                    value={homeworkForm.fileUrl}
                    onChange={(e) => {
                      setHomeworkForm({ ...homeworkForm, fileUrl: e.target.value });
                      if (e.target.value) setSelectedHomeworkFile(null);
                    }}
                    placeholder="https://example.com/homework.pdf or Google Drive link"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsHomeworkModalOpen(false);
                  setHomeworkForm({
                    title: '',
                    description: '',
                    subject: '',
                    classNumber: '',
                    topic: '',
                    date: new Date().toISOString().split('T')[0],
                    deadline: '',
                    fileUrl: ''
                  });
                  setSelectedHomeworkFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingHomework || isUploadingHomeworkFile}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {isCreatingHomework || isUploadingHomeworkFile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isUploadingHomeworkFile ? 'Uploading...' : 'Creating...'}
                  </>
                ) : (
                  'Create Homework'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EduOTT Video Modal */}
      <VideoModal
        isOpen={isEduottVideoModalOpen}
        onClose={() => {
          setIsEduottVideoModalOpen(false);
          setSelectedEduottVideo(null);
        }}
        video={selectedEduottVideo ? {
          id: selectedEduottVideo._id || selectedEduottVideo.id,
          title: selectedEduottVideo.title || '',
          description: selectedEduottVideo.description || '',
          duration: selectedEduottVideo.duration && selectedEduottVideo.duration > 0 
            ? Math.round(selectedEduottVideo.duration) 
            : (selectedEduottVideo.durationSeconds && selectedEduottVideo.durationSeconds > 0
              ? Math.round(selectedEduottVideo.durationSeconds / 60)
              : 0), // Convert from seconds to minutes if needed, or use duration in minutes
          subject: selectedEduottVideo.subjectName || selectedEduottVideo.subject || 'Unknown Subject',
          videoUrl: selectedEduottVideo.videoUrl || selectedEduottVideo.fileUrl,
          youtubeUrl: selectedEduottVideo.youtubeUrl || (selectedEduottVideo.isYouTubeVideo ? (selectedEduottVideo.videoUrl || selectedEduottVideo.fileUrl) : undefined),
          isYouTubeVideo: selectedEduottVideo.isYouTubeVideo || false
        } : null}
      />
      </div>
    </div>
  );
};

export default TeacherDashboard;
