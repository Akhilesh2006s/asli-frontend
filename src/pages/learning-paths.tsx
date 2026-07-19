import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import StudentShell from "@/components/layout/StudentShell";
import TeacherShell from "@/components/layout/TeacherShell";
import {
  BookOpen,
  ChevronRight,
  Clock,
  Play,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Award,
  FileText,
  BarChart3,
  BookOpen as BookIcon,
  User,
  Calculator,
  Atom,
  FlaskConical,
  Microscope,
  File,
  Image as ImageIcon,
  FileText as FileTextIcon,
  X,
  Eye,
  ClipboardList,
  Headphones,
  ExternalLink,
  Video,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  filterContentsBySchoolProgram,
  getAllowedContentTypes,
  resolveIsAsliPrepExclusive,
  type ContentTypeName,
} from "@/lib/school-program";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-config";
import { getUser } from "@/lib/auth-utils";
import PdfPreviewPanel from "@/components/shared/PdfPreviewPanel";
import VidyaAIFloatingAssistant from "@/components/student/VidyaAIFloatingAssistant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DriveViewer from "@/components/drive-viewer";
import { getStudentDisplayName } from "@/lib/auth-utils";

function isTeacherPortalUser(): boolean {
  const stored = getUser();
  const role = String(stored?.role || localStorage.getItem("userRole") || "").toLowerCase();
  return role.includes("teacher");
}

function apiRoot(): "/api/teacher" | "/api/student" {
  return isTeacherPortalUser() ? "/api/teacher" : "/api/student";
}

export default function LearningPaths() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const isTeacher = isTeacherPortalUser();
  const Shell = isTeacher ? TeacherShell : StudentShell;
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'quizzes'>('subjects');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const isAsliPrepExclusive = resolveIsAsliPrepExclusive(user);
  const allowedBrowseTypes = getAllowedContentTypes(isAsliPrepExclusive);
  const [contentTypeCounts, setContentTypeCounts] = useState({
    TextBook: 0,
    Workbook: 0,
    Material: 0,
    Audio: 0,
    Homework: 0,
    Video: 0,
  });
  const [isLoadingContentCounts, setIsLoadingContentCounts] = useState(true);
  const [selectedContentType, setSelectedContentType] = useState<ContentTypeName | null>(null);
  const [filteredContent, setFilteredContent] = useState<any[]>([]);
  const [isLoadingFilteredContent, setIsLoadingFilteredContent] = useState(false);
  const [allLibraryContent, setAllLibraryContent] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<any | null>(null);
  const [isNavigatingToSubject, setIsNavigatingToSubject] = useState(false);

  const prefetchSubjectPage = () => {
    void import("@/pages/subject-content");
  };

  const handleSubjectClick = (subjectId: string) => {
    setIsNavigatingToSubject(true);
    setLocation(isTeacher ? `/teacher/subject/${subjectId}` : `/subject/${subjectId}`);
  };

  const isYouTubeUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes("youtube.com") || lower.includes("youtu.be");
  };

  const getNormalizedContentUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("//")) return url;
    return url.startsWith("/") ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
  };

  const extractDirectFileUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname.includes("docs.google.com") && parsed.pathname.includes("/gview")) {
        const target = parsed.searchParams.get("url");
        if (target) return target;
      }
    } catch {
      return rawUrl;
    }
    return rawUrl;
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (!match || match[2].length !== 11) return null;
    return `https://www.youtube.com/embed/${match[2]}`;
  };

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
        const subjectsResponse = await fetch(`${API_BASE_URL}${apiRoot()}/subjects`, {
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

            // Show subjects immediately to avoid UI blank while enrichment calls run.
            const baseSubjects = subjectsArray.map((subject: any) => ({
              ...subject,
              videos: [],
              quizzes: [],
              assessments: [],
              totalContent: 0
            }));
            const uniqueBaseSubjects = baseSubjects.filter((subject, index, self) => {
              const subjectId = subject._id || subject.id;
              return index === self.findIndex((s: any) => (s._id || s.id) === subjectId);
            });
            setSubjects(uniqueBaseSubjects);
            setIsLoadingSubjects(false);
            
            // Fetch content for each subject - use Promise.allSettled to ensure all subjects are included
            const subjectsWithContentResults = await Promise.allSettled(
              subjectsArray.map(async (subject: any) => {
                try {
                  const subjectId = subject._id || subject.id || subject.name;
                  
                  // Fetch videos for this subject (from teacher-created content)
                  let videos = [];
                  try {
                    const videosResponse = await fetch(`${API_BASE_URL}${apiRoot()}/videos?subject=${encodeURIComponent(subjectId)}`, {
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
                    const assessmentsResponse = await fetch(`${API_BASE_URL}${apiRoot()}/assessments?subject=${encodeURIComponent(subjectId)}`, {
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
                color: 'bg-blue-100 text-blue-600',
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
              color: 'bg-blue-100 text-blue-600',
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
        const err = error as Error;
        console.error('❌ ERROR fetching subjects:', error);
        console.error('Error details:', {
          message: err?.message || 'Unknown error',
          stack: err?.stack,
          name: err?.name || 'UnknownError'
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
            color: 'bg-blue-100 text-blue-600',
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

  // Fetch assigned quizzes (students only — teachers create quizzes elsewhere)
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (isTeacher) {
        setQuizzes([]);
        setIsLoadingQuizzes(false);
        return;
      }
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
  }, [isTeacher]);

  // Fetch content type counts
  useEffect(() => {
    console.log('Fetching content counts for Digital Library');
    const fetchContentCounts = async () => {
      try {
        setIsLoadingContentCounts(true);
        const token = localStorage.getItem('authToken');
        
        // Fetch all content to count by type
        const response = await fetch(`${API_BASE_URL}${apiRoot()}/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const rawContent = data.data || data || [];
          const allContent = filterContentsBySchoolProgram(
            Array.isArray(rawContent) ? rawContent : [],
            resolveIsAsliPrepExclusive(user),
          );
          setAllLibraryContent(allContent);
          
          // Count by type
          const counts = {
            TextBook: 0,
            Workbook: 0,
            Material: 0,
            Audio: 0,
            Homework: 0,
            Video: 0,
          };
          
          allContent.forEach((content: any) => {
            const contentType = content.type;
            if (counts.hasOwnProperty(contentType)) {
              counts[contentType as keyof typeof counts]++;
            }
          });
          
          setContentTypeCounts(counts);
        } else {
          setAllLibraryContent([]);
        }
      } catch (error) {
        console.error('Failed to fetch content counts:', error);
        setAllLibraryContent([]);
      } finally {
        setIsLoadingContentCounts(false);
      }
    };

    fetchContentCounts();
  }, [user?.isAsliPrepExclusive, user?.assignedAdmin?.isAsliPrepExclusive]);

  // Update filtered content from already-fetched library content
  useEffect(() => {
    if (!selectedContentType) {
      setFilteredContent([]);
      setIsLoadingFilteredContent(false);
      return;
    }

    if (isLoadingContentCounts) {
      setIsLoadingFilteredContent(true);
      return;
    }

    setIsLoadingFilteredContent(true);
    const filtered = allLibraryContent.filter((content: any) => content.type === selectedContentType);
    setFilteredContent(filtered);
    setIsLoadingFilteredContent(false);
  }, [selectedContentType, allLibraryContent, isLoadingContentCounts]);

  return (
    <Shell>
      {isNavigatingToSubject && (
        <div
          className="fixed inset-0 z-[100] bg-sky-50/90 backdrop-blur-sm flex flex-col items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-3" aria-hidden />
          <p className="text-sm text-gray-600 font-medium">Opening subject...</p>
        </div>
      )}
      <div className="relative mx-auto w-full max-w-7xl">
        
        {!isMobile && !isTeacher && <VidyaAIFloatingAssistant />}
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="gradient-primary rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="mb-2 break-words text-2xl font-bold sm:text-3xl">
                {isTeacher
                  ? 'Learning Paths'
                  : `Learning Paths for ${isLoadingUser ? '...' : getStudentDisplayName(user)}`}
              </h1>
              <p className="text-blue-100 mb-6">
                {isTeacher
                  ? 'Browse curriculum content for your assigned subjects'
                  : 'Choose your learning journey and master your subjects with our structured courses'}
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

        {/* Tabs */}
        {!isTeacher ? (
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 min-w-[140px] px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium rounded-md transition-all ${
                activeTab === 'subjects'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Browse by Subject
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex-1 min-w-[140px] px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium rounded-md transition-all ${
                activeTab === 'quizzes'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Quizzes
            </button>
          </div>
        </div>
        ) : null}

        {/* Browse by Subject Tab */}
        {activeTab === 'subjects' && (
        <div className="mb-8">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink">Browse by Subject</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {isLoadingSubjects ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-3" aria-hidden />
                <p className="text-sm text-gray-600 font-medium">Loading subjects...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                <p className="text-gray-500">Check back later for new learning content.</p>
              </div>
            ) : (
              subjects.map((subject: any) => {
                const name = String(subject.name || '').toLowerCase();
                const theme =
                  name.includes('math') ? { Icon: Calculator, chip: 'from-amber-500 to-orange-600', btn: 'bg-amber-500 hover:bg-amber-600', soft: 'bg-amber-50 text-amber-700' }
                  : name.includes('physics') ? { Icon: Atom, chip: 'from-orange-500 to-rose-600', btn: 'bg-orange-500 hover:bg-orange-600', soft: 'bg-orange-50 text-orange-700' }
                  : name.includes('chemistry') ? { Icon: FlaskConical, chip: 'from-sky-500 to-blue-600', btn: 'bg-sky-500 hover:bg-sky-600', soft: 'bg-sky-50 text-sky-700' }
                  : name.includes('biology') ? { Icon: Microscope, chip: 'from-emerald-500 to-green-600', btn: 'bg-emerald-500 hover:bg-emerald-600', soft: 'bg-emerald-50 text-emerald-700' }
                  : name.includes('english') ? { Icon: BookIcon, chip: 'from-violet-500 to-purple-600', btn: 'bg-violet-500 hover:bg-violet-600', soft: 'bg-violet-50 text-violet-700' }
                  : name.includes('social') ? { Icon: BookOpen, chip: 'from-pink-500 to-rose-600', btn: 'bg-pink-500 hover:bg-pink-600', soft: 'bg-pink-50 text-pink-700' }
                  : name.includes('science') ? { Icon: Zap, chip: 'from-teal-500 to-cyan-600', btn: 'bg-teal-500 hover:bg-teal-600', soft: 'bg-teal-50 text-teal-700' }
                  : { Icon: BookOpen, chip: 'from-indigo-blue-500 to-indigo-blue-700', btn: 'bg-indigo-blue-600 hover:bg-indigo-blue-700', soft: 'bg-indigo-blue-50 text-indigo-blue-700' };

                const Icon = theme.Icon;

                // Content subjects are class-scoped ("Maths_6") and live in a
                // different id space from the subject list, so match on the
                // normalised name rather than on _id.
                const normaliseSubject = (n: unknown) =>
                  String(n || '').toLowerCase().replace(/[_\s-]*\d+$/, '').trim();
                const key = normaliseSubject(subject.name);
                const mine = allLibraryContent.filter(
                  (c: any) => normaliseSubject(c?.subject?.name) === key,
                );
                const countOf = (t: string) => mine.filter((c: any) => c?.type === t).length;
                const tiles = [
                  { label: 'Textbooks', value: countOf('TextBook') },
                  { label: 'Materials', value: countOf('Material') },
                  { label: 'Videos', value: countOf('Video') },
                ];
                const recent = mine.slice(0, 2);

                return (
                  <div
                    key={subject._id || subject.id}
                    className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    onMouseEnter={prefetchSubjectPage}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.chip} shadow-sm`}>
                        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-lg font-bold text-ink">{subject.name}</h3>
                        <p className="truncate text-sm text-muted-foreground">Content for {subject.name}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.soft}`}>
                        {mine.length} {mine.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {tiles.map((t) => (
                        <div key={t.label} className="rounded-xl border border-border bg-background px-2 py-2.5 text-center">
                          <p className="font-display text-lg font-bold leading-none text-ink">{t.value}</p>
                          <p className="mt-1 text-micro font-medium text-muted-foreground">{t.label}</p>
                        </div>
                      ))}
                    </div>

                    {recent.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-micro font-bold uppercase tracking-wider text-muted-foreground">
                          Recent content
                        </p>
                        <ul className="space-y-1.5">
                          {recent.map((c: any, i: number) => (
                            <li
                              key={c?._id || c?.id || i}
                              className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2"
                            >
                              <span className="truncate text-sm text-ink-soft">{c?.title || c?.name || 'Untitled'}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSubjectClick(subject._id || subject.id)}
                      className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${theme.btn} ${recent.length ? 'mt-4' : 'mt-4'}`}
                    >
                      View Content
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* My Quizzes Tab */}
        {activeTab === 'quizzes' && (
        <div className="mb-8 max-w-7xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">My Quizzes</h2>
          {isLoadingQuizzes ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
              <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-3" aria-hidden />
              <p className="text-sm text-gray-600 font-medium">Loading quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">No Quizzes Assigned</h3>
              <p className="text-gray-500">Your teacher hasn't assigned any quizzes yet. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
              {quizzes.map((quiz: any) => (
                        <Card key={quiz._id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                        </div>
                      {quiz.hasAttempted && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      </div>
                    <CardTitle className="text-base sm:text-lg">{quiz.title}</CardTitle>
                    <p className="text-gray-600 text-xs sm:text-sm">{quiz.description || `Quiz on ${quiz.subject}`}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs font-medium text-blue-800">{quiz.duration} min</p>
                        <p className="text-xs text-blue-600">Duration</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs font-medium text-blue-800">{quiz.questionCount}</p>
                        <p className="text-xs text-blue-600">Questions</p>
                      </div>
                    </div>
                    
                    {quiz.hasAttempted && quiz.bestScore !== null && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium text-green-800">Best Score:</span>
                          <span className="text-base sm:text-lg font-bold text-green-900">{quiz.bestScore}/{quiz.totalPoints}</span>
                        </div>
                        {quiz.completedAt && (
                          <p className="text-xs text-green-600 mt-1">
                            Completed: {new Date(quiz.completedAt).toLocaleDateString()}
                          </p>
                                )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {quiz.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quiz.subject}
                      </Badge>
                              </div>

                    <Link href={`/student-exams?quiz=${quiz._id}`}>
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg">
                        {quiz.hasAttempted ? 'Retake Quiz' : 'Start Quiz'}
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                            ))}
                          </div>
          )}
                        </div>
                      )}

        {/* Digital Library - Browse by Type - Always Visible */}
        {(() => {
          console.log('Digital Library section rendering - visible on page');
          return null;
        })()}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-blue-500 to-violet-600 shadow-sm">
              <BookOpen className="h-[1.35rem] w-[1.35rem] text-white" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Digital Library</h2>
              <p className="text-sm text-muted-foreground">Browse everything by type · tap a card to filter</p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {([
              { key: 'TextBook', label: 'Textbooks', Icon: BookOpen, chip: 'from-sky-500 to-blue-600', ring: 'ring-sky-500', tint: 'bg-sky-50' },
              { key: 'Video', label: 'Videos', Icon: Video, chip: 'from-rose-500 to-pink-600', ring: 'ring-rose-500', tint: 'bg-rose-50' },
              { key: 'Workbook', label: 'Workbooks', Icon: FileTextIcon, chip: 'from-violet-500 to-purple-600', ring: 'ring-violet-500', tint: 'bg-violet-50' },
              { key: 'Material', label: 'Materials', Icon: File, chip: 'from-amber-500 to-orange-600', ring: 'ring-amber-500', tint: 'bg-amber-50' },
              { key: 'Audio', label: 'Audio', Icon: Headphones, chip: 'from-teal-500 to-emerald-600', ring: 'ring-teal-500', tint: 'bg-teal-50' },
              { key: 'Homework', label: 'Homework', Icon: ClipboardList, chip: 'from-indigo-blue-500 to-indigo-blue-700', ring: 'ring-indigo-blue-500', tint: 'bg-indigo-blue-50' },
            ] as const)
              .filter((t) => t.key === 'TextBook' || t.key === 'Audio' || t.key === 'Homework' || allowedBrowseTypes.includes(t.key))
              .map(({ key, label, Icon, chip, ring, tint }) => {
                const count = contentTypeCounts[key as keyof typeof contentTypeCounts];
                const active = selectedContentType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedContentType(active ? null : key)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? `${tint} ring-2 ${ring}` : 'bg-background'
                    }`}
                  >
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${chip} shadow-sm`}>
                      <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                    <span className="font-display text-2xl font-bold leading-none text-ink">
                      {isLoadingContentCounts ? '—' : count}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  </button>
                );
              })}
          </div>

          {/* Filtered Content Display */}
          {selectedContentType && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  All {selectedContentType}
                </h3>
                <Button
                  variant="outline"
                  onClick={() => setSelectedContentType(null)}
                  className="flex items-center space-x-2"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Clear Filter</span>
                </Button>
                              </div>

              {isLoadingFilteredContent ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">No Content Found</h3>
                  <p className="text-gray-500">No {selectedContentType} available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6 items-stretch">
                  {filteredContent.map((content: any) => (
                    <Card key={content._id} className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                            {selectedContentType === 'TextBook' ? (
                              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : selectedContentType === 'Workbook' ? (
                              <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : selectedContentType === 'Material' ? (
                              <File className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : selectedContentType === 'Audio' ? (
                              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : selectedContentType === 'Homework' ? (
                              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : (
                              <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {content.type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base sm:text-lg">{content.title}</CardTitle>
                        {content.description && (
                          <p className="text-gray-600 text-xs sm:text-sm mt-2">{content.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3 flex-1 flex flex-col">
                        <div className="space-y-3 flex-1">
                        {content.subject && (
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            <span className="text-xs sm:text-sm text-gray-600">
                              {typeof content.subject === 'object' ? content.subject.name : 'Subject'}
                            </span>
                          </div>
                        )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (!content.fileUrl) return;
                              setPreviewContent(content);
                              setIsPreviewOpen(true);
                            }}
                            disabled={!content.fileUrl}
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            View
                        </Button>
                          {content.fileUrl && isYouTubeUrl(content.fileUrl) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPreviewContent(content);
                                  setIsPreviewOpen(true);
                                }}
                                title="Preview in this page"
                              >
                                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                          )}
                        </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
            )}
          </div>
          )}
        </div>

      </div>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) setPreviewContent(null);
        }}
      >
        <DialogContent className="w-[90vw] h-[95vh] max-w-none bg-white rounded-2xl overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 lg:px-8 pt-5 pb-3 border-b border-gray-200">
            <DialogTitle className="pl-2 pt-1">{previewContent?.title || "Content Preview"}</DialogTitle>
          </DialogHeader>
          <div
            className={`flex-1 min-h-0 px-4 py-4 ${
              (() => {
                const previewUrl = extractDirectFileUrl(getNormalizedContentUrl(previewContent?.fileUrl));
                const previewLower = previewUrl.toLowerCase();
                const previewIsPdf =
                  previewLower.endsWith(".pdf") ||
                  previewLower.includes(".pdf") ||
                  previewContent?.type === "PDF";
                return previewIsPdf
                  ? "flex min-h-0 flex-col overflow-hidden"
                  : "overflow-x-hidden overflow-y-auto";
              })()
            }`}
          >

          {(() => {
            const fileUrl = extractDirectFileUrl(getNormalizedContentUrl(previewContent?.fileUrl));
            const lower = fileUrl.toLowerCase();
            const isPdf =
              lower.endsWith(".pdf") || lower.includes(".pdf") || previewContent?.type === "PDF";
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(lower);
            const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower) || previewContent?.type === "Audio";
            const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower) || previewContent?.type === "Video";
            const isYouTube = isYouTubeUrl(fileUrl);
            const youtubeEmbedUrl = getYouTubeEmbedUrl(fileUrl);
            const isGoogleDrive = lower.includes("drive.google.com");

            if (!fileUrl) {
              return <p className="text-xs sm:text-sm text-gray-500">No preview URL available.</p>;
            }

            if (isYouTube && youtubeEmbedUrl) {
              return (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <iframe
                    className="w-full h-full border-0"
                    src={youtubeEmbedUrl}
                    title={previewContent?.title || "YouTube content"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }

            if (isPdf) {
              return (
                <PdfPreviewPanel
                  fileUrl={previewContent?.fileUrl || fileUrl}
                  title={previewContent?.title}
                  className="h-full min-h-0 w-full flex-1"
                />
              );
            }

            if (isImage) {
              return (
                <div className="w-full max-w-full overflow-hidden rounded-lg bg-gray-100 p-2">
                  <img
                    src={fileUrl}
                    alt={previewContent?.title || "Preview"}
                    className="mx-auto h-auto w-full max-h-[min(66dvh,720px)] max-w-full object-contain"
                    draggable={false}
                  />
                </div>
              );
            }

            if (isAudio) {
              return (
                <div className="w-full rounded-lg bg-gray-100 p-4 sm:p-6 lg:p-8">
                  <audio src={fileUrl} controls className="w-full" />
                </div>
              );
            }

            if (isVideo) {
              return (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <video src={fileUrl} controls className="w-full h-full" />
                </div>
              );
            }

            if (isGoogleDrive) {
              return (
                <DriveViewer
                  driveUrl={fileUrl}
                  title={previewContent?.title || "Drive content"}
                />
              );
            }

            return (
              <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                Preview is not available for this file type.
              </div>
            );
          })()}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
