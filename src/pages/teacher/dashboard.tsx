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
  Radio
} from 'lucide-react';
import AIChat from '@/components/ai-chat';
import VideoModal from '@/components/video-modal';
import { Skeleton } from '@/components/ui/skeleton';

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
    overallProgress?: number;
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
  const [dashboardSubTab, setDashboardSubTab] = useState<'ai-classes' | 'students' | 'eduott'>('ai-classes');
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
  const [isLoading, setIsLoading] = useState(true);
  const [teacherEmail, setTeacherEmail] = useState<string>(localStorage.getItem('userEmail') || '');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [subjectsWithContent, setSubjectsWithContent] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

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
  const [vidyaAiTab, setVidyaAiTab] = useState<'assistant' | 'lesson-plans' | 'grading' | 'tutor' | 'parent-comm'>('assistant');
  const [teacherId, setTeacherId] = useState<string>('');
  
  // Grading form state
  const [gradingForm, setGradingForm] = useState({
    rubric: '',
    studentWork: '',
    uploadedFile: null as File | null
  });
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<string>('');

  useEffect(() => {
    fetchTeacherData();
  }, []);

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
          // Update students with performance data
          setStudents(data.data.map((student: any) => ({
            id: student._id || student.id,
            name: student.fullName || student.name,
            email: student.email,
            classNumber: student.classNumber,
            phone: student.phone,
            isActive: student.isActive,
            createdAt: student.createdAt,
            lastLogin: student.lastLogin,
            assignedClass: student.assignedClass,
            performance: student.performance || {
              recentExamTitle: null,
              recentMarks: null,
              recentPercentage: null,
              totalExams: 0,
              averageMarks: 0,
              overallProgress: 0
            }
          })));
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing your teacher dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">ASLI STUD</h1>
                <p className="text-xs text-gray-600 font-medium">Teacher Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{teacherEmail || localStorage.getItem('userEmail') || 'Teacher'}</p>
                <p className="text-xs text-gray-600">Welcome back!</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="border-purple-200 text-purple-800 hover:bg-purple-50 backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent capitalize">
            Overview
          </h1>
          <p className="text-gray-600 text-responsive-sm font-medium mt-2">Manage your classes and track student progress with style</p>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-8">
          {/* Dashboard Sub-Tabs */}
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/20">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={dashboardSubTab === 'ai-classes' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'ai-classes' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'border-purple-200 text-purple-800 hover:bg-purple-50'}
                    onClick={() => setDashboardSubTab('ai-classes')}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant={dashboardSubTab === 'students' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'students' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'border-blue-200 text-blue-800 hover:bg-blue-50'}
                    onClick={() => setDashboardSubTab('students')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    My Students
                  </Button>
                  <Button
                    variant={dashboardSubTab === 'eduott' ? 'default' : 'outline'}
                    className={dashboardSubTab === 'eduott' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg' : 'border-pink-200 text-pink-800 hover:bg-pink-50'}
                    onClick={() => setDashboardSubTab('eduott')}
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    EduOTT
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid-responsive-4 gap-responsive">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
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
                  className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
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
                  className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
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
                  className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-yellow-500 rounded-responsive p-responsive shadow-responsive hover:shadow-xl transition-all duration-300"
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

              {/* Vidya AI & My Classes Tab */}
              {dashboardSubTab === 'ai-classes' && (
                <>
              {/* Vidya AI */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Vidya AI</h3>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setVidyaAiTab('assistant')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'assistant'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Assistant
                    </button>
                    <button
                      onClick={() => setVidyaAiTab('lesson-plans')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'lesson-plans'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Lesson Plans
                    </button>
                    <button
                      onClick={() => setVidyaAiTab('grading')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'grading'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Grading
                    </button>
                    <button
                      onClick={() => setVidyaAiTab('tutor')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'tutor'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tutor
                    </button>
                    <button
                      onClick={() => setVidyaAiTab('parent-comm')}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        vidyaAiTab === 'parent-comm'
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Parent Comm
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {vidyaAiTab === 'assistant' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Teaching Assistant</h4>
                    </div>
                    <p className="text-gray-600 mb-6">Get help with teaching strategies, classroom management, and curriculum planning</p>
                    {teacherId ? (
                      <AIChat userId={teacherId} />
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Loading assistant...</p>
                      </div>
                    )}
                  </div>
                )}

                {vidyaAiTab === 'lesson-plans' && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
                    <h4 className="text-xl font-bold text-gray-900 mb-4">Lesson Plan Generator</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                      <select 
                        value={lessonPlanForm.gradeLevel}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, gradeLevel: e.target.value, subject: '', topic: ''})}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select class</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                        <option value="Dropper Batch">Dropper Batch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                      <select 
                        value={lessonPlanForm.subject}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, subject: e.target.value, topic: ''})}
                        disabled={!lessonPlanForm.gradeLevel}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select subject</option>
                        {lessonPlanForm.gradeLevel && (
                          <>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Mathematics">Mathematics</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
                      <select 
                        value={lessonPlanForm.topic}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, topic: e.target.value})}
                        disabled={!lessonPlanForm.subject}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="">Select topic</option>
                        {lessonPlanForm.subject === 'Physics' && (
                          <>
                            <option value="Mechanics">Mechanics</option>
                            <option value="Thermodynamics">Thermodynamics</option>
                            <option value="Electromagnetism">Electromagnetism</option>
                            <option value="Optics">Optics</option>
                            <option value="Modern Physics">Modern Physics</option>
                          </>
                        )}
                        {lessonPlanForm.subject === 'Chemistry' && (
                          <>
                            <option value="Physical Chemistry">Physical Chemistry</option>
                            <option value="Inorganic Chemistry">Inorganic Chemistry</option>
                            <option value="Organic Chemistry">Organic Chemistry</option>
                          </>
                        )}
                        {lessonPlanForm.subject === 'Mathematics' && (
                          <>
                            <option value="Calculus">Calculus</option>
                            <option value="Algebra">Algebra</option>
                            <option value="Geometry">Geometry</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                      <input
                        type="number"
                        value={lessonPlanForm.duration}
                        onChange={(e) => setLessonPlanForm({...lessonPlanForm, duration: e.target.value})}
                        placeholder="90"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleGenerateLessonPlan}
                    disabled={isGeneratingLessonPlan || !lessonPlanForm.subject || !lessonPlanForm.topic || !lessonPlanForm.gradeLevel}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-xl disabled:opacity-50"
                  >
                    {isGeneratingLessonPlan ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Lesson Plan
                      </>
                    )}
                  </Button>
                  {generatedLessonPlan && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-lg max-h-96 overflow-y-auto">
                      <h5 className="text-lg font-semibold text-gray-900 mb-3">Generated Lesson Plan:</h5>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <div className="prose prose-sm max-w-none">
                          <div className="text-gray-800 leading-relaxed">
                            {generatedLessonPlan.split('\n').map((line, index) => {
                              if (line.startsWith('###')) {
                                return (
                                  <h3 key={index} className="text-lg font-bold text-blue-900 mt-4 mb-2">
                                    {line.replace('###', '').trim()}
                                  </h3>
                                );
                              } else if (line.startsWith('**') && line.endsWith('**')) {
                                return (
                                  <h4 key={index} className="text-base font-semibold text-blue-800 mt-3 mb-1">
                                    {line.replace(/\*\*/g, '').trim()}
                                  </h4>
                                );
                              } else if (line.startsWith('-') || line.startsWith('*')) {
                                return (
                                  <div key={index} className="ml-4 mb-1 text-gray-700">
                                    • {line.replace(/^[-*]\s*/, '').trim()}
                                  </div>
                                );
                              } else if (line.trim() === '') {
                                return <br key={index} />;
                              } else {
                                return (
                                  <p key={index} className="mb-2 text-gray-700">
                                    {line.trim()}
                                  </p>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                )}

                {vidyaAiTab === 'grading' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <FileTextIcon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Automated Grading Assistant</h4>
                    </div>
                    <p className="text-gray-600 mb-6">AI-powered grading with detailed feedback and improvement suggestions</p>
                    
                    <div className="space-y-6">
                      {/* Grading Rubric */}
                      <div>
                        <Label htmlFor="rubric" className="text-sm font-medium text-gray-700 mb-2 block">
                          Grading Rubric (Optional)
                        </Label>
                        <Textarea
                          id="rubric"
                          value={gradingForm.rubric}
                          onChange={(e) => setGradingForm({ ...gradingForm, rubric: e.target.value })}
                          placeholder="Enter your grading criteria or rubric..."
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Student Work */}
                      <div>
                        <Label htmlFor="studentWork" className="text-sm font-medium text-gray-700 mb-2 block">
                          Student Work
                        </Label>
                        <div className="space-y-2">
                          <Textarea
                            id="studentWork"
                            value={gradingForm.studentWork}
                            onChange={(e) => setGradingForm({ ...gradingForm, studentWork: e.target.value })}
                            placeholder="Paste the student's assignment, essay, or answer here..."
                            rows={6}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="flex items-center space-x-2">
                            <Input
                              type="file"
                              id="fileUpload"
                              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setGradingForm({ ...gradingForm, uploadedFile: file });
                                  // Read file content if it's a text file
                                  if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setGradingForm(prev => ({ ...prev, studentWork: event.target?.result as string }));
                                    };
                                    reader.readAsText(file);
                                  }
                                }
                              }}
                              className="hidden"
                            />
                            <Label htmlFor="fileUpload" className="cursor-pointer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex items-center space-x-2"
                              >
                                <Upload className="w-4 h-4" />
                                <span>Upload File</span>
                              </Button>
                            </Label>
                            {gradingForm.uploadedFile && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <FileTextIcon className="w-4 h-4" />
                                <span>{gradingForm.uploadedFile.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setGradingForm({ ...gradingForm, uploadedFile: null })}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Analyze & Grade Button */}
                      <Button
                        onClick={handleGradeWork}
                        disabled={isGrading || (!gradingForm.studentWork && !gradingForm.uploadedFile)}
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white py-3 rounded-lg disabled:opacity-50"
                      >
                        {isGrading ? (
                          <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Analyzing & Grading...
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Analyze & Grade
                          </>
                        )}
                      </Button>

                      {/* Grading Result */}
                      {gradingResult && (
                        <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                          <h5 className="text-lg font-semibold text-gray-900 mb-3">Grading Result:</h5>
                          <div className="prose prose-sm max-w-none">
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {gradingResult}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {vidyaAiTab === 'tutor' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Tutor Assistant</h4>
                    </div>
                    <p className="text-gray-600 mb-6">Get personalized tutoring support and student guidance</p>
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Tutor Features Coming Soon</h3>
                      <p className="text-gray-500">Tutoring assistance and student support tools will be available here</p>
                    </div>
                  </div>
                )}

                {vidyaAiTab === 'parent-comm' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Parent Communication</h4>
                    </div>
                    <p className="text-gray-600 mb-6">AI-assisted parent communication and progress updates</p>
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">Parent Communication Coming Soon</h3>
                      <p className="text-gray-500">Automated parent communication tools will be available here</p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* My Classes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">My Classes</h3>
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
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
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

              {/* My Students Tab */}
              {dashboardSubTab === 'students' && (
                <div className="space-y-8">
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
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-sm text-gray-400">No progress data</span>
                                        {perf.totalExams === 0 && (
                                          <p className="text-xs text-gray-400 mt-1">No exams taken</p>
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
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
