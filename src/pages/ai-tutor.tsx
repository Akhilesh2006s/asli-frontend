import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/navigation";
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
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { API_BASE_URL } from "@/lib/api-config";

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

  // Student AI Tools - All tools available for Class 6 (normal and IIT-6)
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
    {
      id: 'key-points-formula-extractor',
      name: 'Key Points Extractor',
      icon: Key,
      color: 'from-teal-400 to-teal-500',
      description: 'Extract key points from any topic'
    },
    {
      id: 'quick-assignment-builder',
      name: 'Quick Assignment Builder',
      icon: ClipboardList,
      color: 'from-orange-400 to-orange-500',
      description: 'Build structured assignments quickly and efficiently'
    },
    // Teacher AI Tools - Now available for students
    {
      id: 'flashcard-generator',
      name: 'Flashcard Generator',
      icon: BookMarked,
      color: 'from-pink-400 to-pink-500',
      description: 'Create flashcards for effective memorization'
    },
    {
      id: 'exam-question-paper-generator',
      name: 'Exam Question Paper Generator',
      icon: CheckCircle2,
      color: 'from-red-400 to-red-500',
      description: 'Generate exam question papers'
    },
    {
      id: 'activity-project-generator',
      name: 'Activity & Project Generator',
      icon: Layout,
      color: 'from-yellow-400 to-yellow-500',
      description: 'Generate activities and projects'
    },
    {
      id: 'story-passage-creator',
      name: 'Story & Passage Creator',
      icon: FileText,
      color: 'from-blue-400 to-blue-500',
      description: 'Create stories and passages'
    },
    {
      id: 'lesson-planner',
      name: 'Lesson Planner',
      icon: Calendar,
      color: 'from-violet-400 to-violet-500',
      description: 'Plan your lessons effectively'
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
      <>
        <Navigation />
        <div className="min-h-screen bg-sky-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent mb-2">Loading...</h2>
            <p className="text-gray-600">Preparing Vidya AI...</p>
          </div>
        </div>
      </>
    );
  }

  // Handle tool click
  const handleToolClick = (toolId: string) => {
    if (toolId === 'ai-chat') {
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
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-teal-100 via-teal-50 to-teal-100">
          <div className="container mx-auto px-4 py-6">
            <Button
              variant="outline"
              onClick={() => setSelectedTool(null)}
              className="mb-4"
            >
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Tools
            </Button>
            <div className="bg-white rounded-xl shadow-md border border-gray-200" style={{ minHeight: '600px' }}>
              <AIChat 
                userId={userId}
                className="flex-1 h-full"
                context={{
                  studentName: user?.fullName || user?.email?.split('@')[0] || "Student",
                  currentSubject: getCurrentSubject(),
                  currentTopic: undefined
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-teal-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
              AI Tools
            </h1>
            <p className="text-gray-600">Select a tool to get started with AI-powered learning</p>
          </div>

          {/* Tools Grid - 3 per row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-transparent hover:scale-105 text-left"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${tool.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {tool.description || 'Click to use this AI tool'}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Get Started</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
