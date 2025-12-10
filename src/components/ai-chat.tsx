import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Mic, Image as ImageIcon, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "voice" | "image";
}

interface AIChatProps {
  userId: string;
  context?: {
    studentName?: string;
    currentSubject?: string;
    currentTopic?: string;
    recentTest?: string;
  };
  className?: string;
}

export default function AIChat({ userId, context, className }: AIChatProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get chat sessions with auto-refresh
  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["/api/users", userId, "chat-sessions"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/chat-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds to get new messages
  });

  const currentSession = sessions?.[0];
  const sessionMessages: Message[] = (currentSession?.messages as Message[]) || [];

  // Merge local and session messages - only if localMessages is empty or session has more messages
  useEffect(() => {
    if (sessionMessages.length > 0 && (localMessages.length === 0 || sessionMessages.length > localMessages.length)) {
      setLocalMessages(sessionMessages);
    }
  }, [sessionMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: any }) => {
      const token = localStorage.getItem('authToken');
      
      // Add user message immediately to local state
      const userMessage: Message = {
        role: 'user',
        content: data.message,
        timestamp: new Date(),
      };
      setLocalMessages(prev => [...prev, userMessage]);

      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message: data.message,
          context: {
            ...data.context,
            studentName: context?.studentName || 'Student',
            currentSubject: context?.currentSubject || data.context?.currentSubject,
            currentTopic: context?.currentTopic || data.context?.currentTopic,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      // Add AI response to local state immediately
      if (result.session?.messages) {
        // Use session messages which includes both user and AI messages
        setLocalMessages(result.session.messages);
      } else if (result.message) {
        // Fallback: add AI message if session messages not available
        const aiMessage: Message = {
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };
        setLocalMessages(prev => {
          // Avoid duplicates - check if this message already exists
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.content === result.message) {
            return prev;
          }
          return [...prev, aiMessage];
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "chat-sessions"] });
      setMessage("");
      // Refetch to get latest session, but with a delay to avoid race conditions
      setTimeout(() => refetch(), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      // Remove the user message if sending failed
      setLocalMessages(prev => prev.slice(0, -1));
    },
  });

  // Image analysis mutation
  const analyzeImageMutation = useMutation({
    mutationFn: async (data: { image: string; context?: string }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/analyze-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      return response.json();
    },
    onSuccess: (data) => {
      sendMessageMutation.mutate({
        message: `Please analyze this image: ${data.analysis}`,
        context,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    const subjectContext = context?.currentSubject || 'General Preparation';
    sendMessageMutation.mutate({ 
      message: message.trim(),
      context: {
        ...context,
        currentSubject: subjectContext,
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const base64Data = base64.split(",")[1];
      analyzeImageMutation.mutate({
        image: base64Data,
        context: `Subject: ${context?.currentSubject || 'General Preparation'}. Please analyze this educational image and help me understand the concepts.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setMessage(transcript);
        setTimeout(() => {
          handleSendMessage();
        }, 100);
      }
    };

    recognition.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (isLoading && localMessages.length === 0) {
    return (
      <div className={`${className} flex flex-col bg-white`}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        </div>
      </div>
    );
  }

  const displayMessages = localMessages.length > 0 ? localMessages : sessionMessages;
  const currentSubject = context?.currentSubject || 'General Preparation';

  // Clean up AI output to be student‑friendly: remove markdown stars and turn lists into neat bullets
  const formatMessage = (text: string) => {
    if (!text) return "";
    let cleaned = text;
    // Remove bold markers like **Study Tip**
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    // Replace markdown bullets (- or *) at line start with a simple bullet
    cleaned = cleaned.replace(/^\s*[-*]\s+/gm, "• ");
    // Collapse multiple spaces introduced by removals
    cleaned = cleaned.replace(/\s{2,}/g, " ");
    return cleaned.trim();
  };

  const quickQuestions = [
    "Explain the concept of rotational motion with examples",
    "What's the difference between alcohols and ethers?",
    "How do I solve integration by parts problems?",
    "Can you help me understand Newton's laws of motion?",
    "What are the key formulas for organic chemistry?",
    "Explain the photoelectric effect in simple terms"
  ];

  return (
    <div className={`${className} flex flex-col bg-gradient-to-b from-blue-50 via-cyan-50 to-teal-50 relative h-full min-h-0`}>
      {/* Decorative column borders */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-200/30 to-transparent hidden lg:block" />
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-teal-200/30 to-transparent hidden lg:block" />
      
      {/* Chat Messages Area - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-8 relative">
          {/* Decorative center column line (subtle) */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-200/30 to-transparent hidden xl:block -translate-x-1/2" />
          {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] py-16 text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-6 border-2 border-orange-200">
              <img 
                src="/Vidya-ai.jpg" 
                alt="Vidya AI" 
                className="w-full h-full object-cover"
              />
            </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">How can I help you today?</h2>
              <p className="text-gray-600 mb-8">Ask me anything about {currentSubject}</p>
              
              {/* Quick Suggestions - Design Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {quickQuestions.slice(0, 4).map((question, index) => {
                  const colors = [
                    'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200',
                    'from-sky-50 to-sky-100 border-sky-200 hover:from-sky-100 hover:to-sky-200',
                    'from-teal-50 to-teal-100 border-teal-200 hover:from-teal-100 hover:to-teal-200',
                    'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200'
                  ];
                  const colorClass = colors[index % 4];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setMessage(question);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                      className={`text-left p-4 rounded-xl border-2 bg-white/90 backdrop-blur-sm ${colorClass} transition-all duration-200 text-sm text-gray-800 font-medium hover:shadow-md hover:scale-[1.02] group relative overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-300" />
                      <div className="relative z-10">
                        {question}
                </div>
                    </button>
                  );
                })}
              </div>
              </div>
            ) : (
            <div className="space-y-6">
              {displayMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-orange-200/50">
                      <img 
                        src="/Vidya-ai.jpg" 
                        alt="Vidya AI" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold border-2 border-blue-200/50">
                      {context?.studentName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  
                  {/* Message */}
                  <div className={`flex-1 ${msg.role === "user" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                          : "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {formatMessage(msg.content)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            
            {/* Loading Indicator */}
            {sendMessageMutation.isPending && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-orange-200/50">
                  <img 
                    src="/Vidya-ai.jpg" 
                    alt="Vidya AI" 
                    className="w-full h-full object-cover"
                  />
                </div>
                  <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          )}
        </div>
          </div>

      {/* Input Area - ChatGPT Style */}
      <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all focus-within:border-blue-300 focus-within:shadow-md">
            <div className="flex items-center gap-1 px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
                className="h-8 w-8 rounded-lg hover:bg-gray-100"
              onClick={handleVoiceInput}
              disabled={isListening || sendMessageMutation.isPending}
              title="Voice input"
            >
                <Mic className={`w-4 h-4 text-gray-500 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
                className="h-8 w-8 rounded-lg hover:bg-gray-100"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending}
              title="Upload image"
            >
                <ImageIcon className="w-4 h-4 text-gray-500" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message Vidya AI...`}
              className="flex-1 min-h-[44px] max-h-32 py-3 px-2 resize-none border-0 focus:outline-none focus:ring-0 text-sm"
              disabled={sendMessageMutation.isPending}
              rows={1}
            />
            <div className="px-3 py-2">
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
                className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-sm hover:shadow-md transition-all"
              size="icon"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
          <p className="text-xs text-gray-600 text-center mt-2">
            Vidya AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
