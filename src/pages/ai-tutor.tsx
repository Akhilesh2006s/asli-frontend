import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import StudentShell from "@/components/layout/StudentShell";
import AIChat from "@/components/ai-chat";
import { 
  MessageCircle, 
  Zap, 
  TrendingUp,
  Lightbulb,
  Brain,
  Target,
  Clock,
  Star,
  BookMarked,
  Calendar,
  HelpCircle,
  FileText,
  Key,
  ClipboardList,
  CheckCircle2,
  Layout,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { API_BASE_URL } from "@/lib/api-config";
import { collectVidyaSubjectLabels } from "@/lib/vidya-subjects";
import { getStudentDisplayName } from "@/lib/auth-utils";
import { isAiToolVisibleForSubjects } from "@/lib/ai-tool-subject-rules";
import { isVidyaEnabledForUser } from "@/lib/vidya-access";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";

export default function AITutor() {
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const prefilledPrompt = useMemo(() => {
    const params = new URLSearchParams(search || "");
    return params.get("prompt");
  }, [search]);
  const openChatFromUrl = useMemo(() => {
    const params = new URLSearchParams(search || "");
    return params.get("tool") === "chat";
  }, [search]);

  // Student AI Tools — Class 6–10
  const studentTools = [
    // Chat tool - first in the list
    {
      id: 'ai-chat',
      name: 'AI Chat Assistant',
      icon: MessageCircle,
      color: 'from-blue-400 to-blue-500',
      description: 'Get instant help with your questions and doubts'
    },
    // Original student tools
    {
      id: 'smart-study-guide-generator',
      name: 'Smart Study Guide Generator',
      icon: BookMarked,
      color: 'from-orange-400 to-orange-500',
      description: 'Create personalized study guides tailored to your needs'
    },
    {
      id: 'concept-breakdown-explainer',
      name: 'Concept Breakdown Explainer',
      icon: Brain,
      color: 'from-blue-500 to-blue-600',
      description: 'Break down complex concepts into simple explanations'
    },
    {
      id: 'smart-qa-practice-generator',
      name: 'Smart Q&A Practice Generator',
      icon: HelpCircle,
      color: 'from-orange-400 to-orange-500',
      description: 'Generate practice questions with detailed answers'
    },
    {
      id: 'chapter-summary-creator',
      name: 'Chapter Summary Creator',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      description: 'Create concise summaries of chapters and topics'
    },
    // Key Points Extractor and Quick Assignment Builder are retired — kept out
    // of the grid so students can't generate into a discontinued tool.
    {
      id: 'my-study-decks',
      name: 'My Study Decks',
      icon: BookMarked,
      color: 'from-pink-400 to-pink-500',
      description: 'Create personalized flashcards for revision'
    },
    {
      id: 'mock-test-builder',
      name: 'Mock Test Builder',
      icon: CheckCircle2,
      color: 'from-red-400 to-red-500',
      description: 'Generate mock tests with exam-style questions'
    },
    {
      id: 'project-idea-lab',
      name: 'Project Idea Lab',
      icon: Layout,
      color: 'from-yellow-400 to-yellow-500',
      description: 'Discover activity and project ideas by topic'
    },
    {
      id: 'reading-practice-room',
      name: 'Reading Practice Room',
      icon: FileText,
      color: 'from-blue-400 to-blue-500',
      description: 'Practice stories and passages (English, Hindi & Telugu only)'
    },
    {
      id: 'study-schedule-maker',
      name: 'Study Schedule Maker',
      icon: Calendar,
      color: 'from-violet-400 to-violet-500',
      description: 'Build a focused lesson and study schedule'
    }
  ];

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('No auth token found, using mock data');
          setUser({ 
            fullName: "Student", 
            email: "student@example.com"
          });
          setIsLoadingUser(false);
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
          console.log('User data fetched:', userData.user);
          setUser(userData.user);
        } else {
          console.log('Auth check failed, using mock data');
          setUser({ 
            fullName: "Student", 
            email: "student@example.com"
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser({ 
          fullName: "Student", 
          email: "student@example.com"
        });
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!prefilledPrompt) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("vidya-chat-prefill", {
          detail: { role: "student", message: prefilledPrompt },
        })
      );
    }, 600);
    return () => window.clearTimeout(t);
  }, [prefilledPrompt]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const subjectsData = data.data || data || [];
          setSubjects(subjectsData);
          console.log('Subjects fetched:', subjectsData);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      }
    };

    if (user) {
      fetchSubjects();
    }
  }, [user]);

  // Fetch subject progress (from exam results)
  useEffect(() => {
    const fetchSubjectProgress = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const [resultsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exam-results`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (resultsRes.ok) {
          const resultsData = await resultsRes.json();
          const results = resultsData.data || resultsData || [];
          
          // Extract unique subjects from exam results
          const subjectMap = new Map();
          results.forEach((result: any) => {
            if (result.subjectWiseScore && typeof result.subjectWiseScore === 'object') {
              Object.keys(result.subjectWiseScore).forEach((subject) => {
                if (!subjectMap.has(subject)) {
                  subjectMap.set(subject, { name: subject, id: subject });
                }
              });
            }
          });
          
          const progressArray = Array.from(subjectMap.values());
          setSubjectProgress(progressArray);
          console.log('Subject progress fetched:', progressArray);
        }
      } catch (error) {
        console.error('Failed to fetch subject progress:', error);
      }
    };

    if (user) {
      fetchSubjectProgress();
    }
  }, [user]);

  const userId = user?._id || user?.id || MOCK_USER_ID;

  const vidyaSubjectNames = useMemo(
    () =>
      collectVidyaSubjectLabels({
        subjectProgress,
        subjects,
        assignedSubjects: user?.assignedSubjects,
        assignedClassSubjects: user?.assignedClass?.assignedSubjects,
      }),
    [subjectProgress, subjects, user?.assignedSubjects, user?.assignedClass?.assignedSubjects]
  );

  const vidyaChatEnabled = isVidyaEnabledForUser(user);

  // `?tool=chat` (used by the sidebar's "Ask Vidya AI") opens the chat directly.
  useEffect(() => {
    if (openChatFromUrl && vidyaChatEnabled) setSelectedTool('ai-chat');
  }, [openChatFromUrl, vidyaChatEnabled]);

  const visibleStudentTools = useMemo(() => {
    return studentTools.filter((tool) => {
      if (tool.id === 'ai-chat' && !vidyaChatEnabled) return false;
      return isAiToolVisibleForSubjects(tool.id, vidyaSubjectNames);
    });
  }, [vidyaSubjectNames, vidyaChatEnabled]);

  // Fetch user's chat sessions
  const { data: chatSessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/users", userId, "chat-sessions"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return [];
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/chat-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || data || [];
      }
      return [];
    },
    enabled: !!userId && !!user, // Only fetch when user is loaded
  });

  // Removed problematic dashboard query that was causing 404 errors
  // User data is handled by other queries
  const recentSession = (chatSessions as any[])[0];

  const tutorFeatures = [
    {
      icon: MessageCircle,
      title: "Real-time Doubt Solving",
      description: "Get instant answers to your questions with detailed explanations",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Brain,
      title: "Concept Reinforcement",
      description: "AI provides targeted practice based on your weak areas",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Lightbulb,
      title: "Study Guidance",
      description: "Personalized study tips and learning strategies",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Target,
      title: "Progress Tracking",
      description: "Monitor your learning progress and identify areas for improvement",
      color: "bg-blue-100 text-blue-600"
    }
  ];

  const quickQuestions = [
    "Explain the concept of rotational motion with examples",
    "What's the difference between alcohols and ethers?",
    "How do I solve integration by parts problems?",
    "Can you help me understand Newton's laws of motion?",
    "What are the key formulas for organic chemistry?",
    "Explain the photoelectric effect in simple terms"
  ];

  const studyTips = [
    {
      icon: Target,
      title: "Set Daily Goals",
      description: "Break down your study plan into achievable daily targets"
    },
    {
      icon: Clock,
      title: "Time Management",
      description: "Use the Pomodoro technique for focused study sessions"
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "Regularly review your performance analytics"
    },
    {
      icon: Star,
      title: "Consistent Practice",
      description: "Maintain a daily study routine for best results"
    }
  ];

  if (isLoadingUser) {
    return (
      <StudentShell>
        <div className="min-h-screen bg-sky-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing Vidya AI...</p>
          </div>
        </div>
      </StudentShell>    );
  }

  // Handle tool click
  const handleToolClick = (toolId: string) => {

    if (toolId === 'ai-chat') {
      if (!vidyaChatEnabled) return;
      setSelectedTool('ai-chat');
    } else {
      setLocation(`/student/tools/${toolId}`);
    }
  };

  // Get current subject for chat context
  const getCurrentSubject = () => {
    if (subjectProgress && subjectProgress.length > 0) {
      return subjectProgress[0].name;
    }
    if (subjects && subjects.length > 0) {
      const firstSubject = subjects[0];
      return typeof firstSubject === 'object' ? firstSubject.name : firstSubject;
    }
    if (user?.assignedSubjects && user.assignedSubjects.length > 0) {
      const firstSubject = user.assignedSubjects[0];
      return typeof firstSubject === 'object' ? firstSubject.name : firstSubject;
    }
    if (user?.assignedClass?.assignedSubjects && user.assignedClass.assignedSubjects.length > 0) {
      const firstSubject = user.assignedClass.assignedSubjects[0];
      return typeof firstSubject === 'object' ? firstSubject.name : firstSubject;
    }
    return 'General Preparation';
  };

  // If chat tool is selected, show chat interface
  if (selectedTool === 'ai-chat') {
    return (
      <StudentShell>
        {/* Height is viewport minus the shell topbar + page padding, so the
            composer stays pinned without the page itself scrolling. */}
        <div className="mx-auto flex h-[calc(100dvh-9.5rem)] w-full max-w-5xl flex-col">
            <div className="mb-4 flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTool(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-ink-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Back to tools"
              >
                <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-blue-500 to-violet-600 shadow-sm">
                <Sparkles className="h-[1.35rem] w-[1.35rem] text-white" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-bold text-ink">Ask Vidya AI</h1>
                <p className="truncate text-sm text-muted-foreground">
                  Your study assistant · ask anything, learn faster
                </p>
              </div>
            </div>
            <div className="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <AIChat 
                userId={userId}
                className="flex h-full min-h-0 max-h-full w-full flex-1 flex-col overflow-hidden"
                context={{
                  studentName: user?.fullName || user?.email?.split('@')[0] || "Student",
                  subjectOptions: vidyaSubjectNames,
                  currentSubject:
                    vidyaSubjectNames[0] ||
                    getCurrentSubject(),
                  currentTopic: undefined
                }}
              />
            </div>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div>
        <div className="mx-auto w-full max-w-7xl">
          {/* Hero */}
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-blue-100 via-violet-50 to-sky-100 p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/55 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-200/45 blur-3xl" />

            <div className="relative z-[1]">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-sm font-bold text-indigo-blue-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Hello {getStudentDisplayName(user) || 'there'}!
              </p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Vidya <span className="text-violet-600">AI</span>
              </h1>
              <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
                Smart revision, practice and study support — all in one place.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
                {[
                  { Icon: Clock, title: 'Save Time', copy: 'Automate revision & notes' },
                  { Icon: Brain, title: 'Practice Smarter', copy: 'Questions built for you' },
                  { Icon: TrendingUp, title: 'Better Outcomes', copy: 'Track progress & improve' },
                ].map(({ Icon, title, copy }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-blue-50 text-indigo-blue-600">
                      <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-bold text-ink">{title}</span>
                      <span className="block text-sm text-muted-foreground">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {visibleStudentTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left min-h-[210px] sm:min-h-[230px]"
                >
                  <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${tool.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-mini font-medium text-sky-700">
                          AI Powered
                        </span>
                        {(tool as any).category && (
                          <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-micro font-medium text-slate-600">
                            {(tool as any).category}
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                      {tool.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 min-h-[38px] sm:min-h-[40px]">
                      {tool.description || 'Click to use this AI tool'}
                    </p>
                    <div className="mt-4 sm:mt-5 flex items-center text-blue-600 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                      <span className="text-xs sm:text-sm font-semibold">Get Started</span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StudentShell>  );
}
