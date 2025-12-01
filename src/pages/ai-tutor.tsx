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
  Star
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { API_BASE_URL } from "@/lib/api-config";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "user-1";

export default function AITutor() {
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const isMobile = useIsMobile();

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

  return (
    <>
      <Navigation />
      <div className="flex h-screen bg-white overflow-hidden">
        {/* Sidebar - ChatGPT style with design enhancements */}
        {!isMobile && (
          <div className="w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 flex flex-col shadow-sm">
            {/* New Chat Button */}
            <div className="p-3 border-b border-gray-800 bg-black/50 backdrop-blur-sm">
              <Button
                className="w-full justify-start bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white border-0 shadow-md hover:shadow-lg transition-all"
                onClick={() => {
                  // Clear current session - this would need to be implemented
                  window.location.reload();
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-2 bg-gradient-to-b from-gray-900 via-black to-black">
              <div className="text-xs font-semibold text-white uppercase tracking-wider px-3 py-3 border-b border-gray-800 mb-2">
                Recent Chats
              </div>
              {sessionsLoading ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : chatSessions.length > 0 ? (
                <div className="space-y-1 px-2">
                  {(chatSessions as any[]).slice(0, 10).map((session: any, index: number) => (
                    <button
                      key={session.id}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm text-white truncate transition-all duration-200 border border-transparent hover:border-gray-700 hover:shadow-sm group"
                      onClick={() => {
                        // Load this session - would need to implement
                        console.log('Load session:', session.id);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-white flex-shrink-0 transition-colors" />
                        <span className="truncate group-hover:text-white font-medium">
                          {session.messages?.[0]?.content?.substring(0, 30) || `Chat ${index + 1}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="font-medium text-gray-300">No chat history</p>
                  <p className="text-xs text-gray-500 mt-1">Start a conversation to see it here</p>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="p-3 border-t border-gray-800 bg-black/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-gray-700">
                  {user?.fullName?.charAt(0).toUpperCase() || 'S'}
          </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.fullName || 'Student'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email || 'student@example.com'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area - Full Screen ChatGPT Style with design columns */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-teal-100 via-teal-50 to-teal-100 relative min-h-0 overflow-hidden">
          {/* Decorative left column border */}
          {!isMobile && (
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
          )}
            {(() => {
              // Determine the current subject from available data
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
              
              const currentSubject = getCurrentSubject();
              
              return (
                <AIChat 
                  userId={userId}
                className="flex-1 h-full"
                  context={{
                    studentName: user?.fullName || user?.email?.split('@')[0] || "Student",
                    currentSubject: currentSubject,
                    currentTopic: undefined
                  }}
                />
              );
            })()}
        </div>
      </div>
    </>
  );
}
