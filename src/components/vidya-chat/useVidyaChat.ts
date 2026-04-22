import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  AIChatContext,
  UseVidyaChatResult,
  VidyaChatRole,
  Message,
} from "./types";

const QUICK_QUESTIONS_BY_ROLE: Record<VidyaChatRole, string[]> = {
  student: [
    "Explain this topic simply",
    "Help me solve this problem",
    "Give me a quiz",
    "Summarize this chapter",
  ],
  teacher: [
    "Create a lesson plan for Biology",
    "Generate quiz questions",
    "Explain topic in simple terms",
    "Suggest classroom activity",
  ],
  admin: [
    "How do I enroll students into classes?",
    "Generate attendance report",
    "Schedule an exam for Grade 10",
    "Assign teachers to subjects",
  ],
  super_admin: [
    "Show AI usage statistics across schools",
    "Detect anomalies in AI responses",
    "Configure model behavior",
    "Generate system performance report",
  ],
};

const INPUT_PLACEHOLDER_BY_ROLE: Record<VidyaChatRole, string> = {
  student: "Type your question or upload a problem...",
  teacher: "Ask about teaching, lessons, or doubts...",
  admin: "Ask about school management...",
  super_admin: "Ask about system analytics, AI monitoring...",
};

interface UseVidyaChatOptions {
  userId: string;
  role: VidyaChatRole;
  context?: AIChatContext;
}

type VidyaChatPrefillEvent = CustomEvent<{
  role?: VidyaChatRole;
  message: string;
}>;

export function useVidyaChat({
  userId,
  role,
  context,
}: UseVidyaChatOptions): UseVidyaChatResult {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["/api/users", userId, "chat-sessions"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/chat-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch chat sessions");
      return response.json();
    },
    refetchInterval: 2000,
  });

  const currentSession = sessions?.[0];
  const sessionMessages: Message[] = (currentSession?.messages as Message[]) || [];

  useEffect(() => {
    if (
      sessionMessages.length > 0 &&
      (localMessages.length === 0 || sessionMessages.length > localMessages.length)
    ) {
      setLocalMessages(sessionMessages);
    }
  }, [sessionMessages, localMessages.length]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: AIChatContext }) => {
      const token = localStorage.getItem("authToken");
      const userMessage: Message = {
        role: "user",
        content: data.message,
        timestamp: new Date(),
      };
      setLocalMessages((prev) => [...prev, userMessage]);

      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          message: data.message,
          context: {
            ...data.context,
            studentName: context?.studentName || "Student",
            currentSubject: context?.currentSubject || data.context?.currentSubject,
            currentTopic: context?.currentTopic || data.context?.currentTopic,
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to send message";
        try {
          const errorJson = await response.json();
          if (errorJson?.message) {
            errorMessage = String(errorJson.message);
          }
        } catch (_) {
          // Keep default message when response is not JSON.
        }
        throw new Error(errorMessage);
      }
      const result = await response.json();

      if (result.session?.messages) {
        setLocalMessages(result.session.messages);
      } else if (result.message) {
        const aiMessage: Message = {
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
        };
        setLocalMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant" && lastMessage.content === result.message) {
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
      setTimeout(() => refetch(), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: async (data: { image: string; context?: string }) => {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/analyze-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorMessage = "Failed to analyze image";
        try {
          const errorJson = await response.json();
          if (errorJson?.message) {
            errorMessage = String(errorJson.message);
          }
        } catch (_) {
          // Keep default message when response is not JSON.
        }
        throw new Error(errorMessage);
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

  const sendSpecificMessage = (text: string) => {
    if (!text.trim() || sendMessageMutation.isPending) return;
    const subjectContext = context?.currentSubject || "General Preparation";
    sendMessageMutation.mutate({
      message: text.trim(),
      context: {
        ...context,
        currentSubject: subjectContext,
      },
    });
  };

  const handleSendMessage = () => sendSpecificMessage(message);

  useEffect(() => {
    const onPrefill = (event: Event) => {
      const prefillEvent = event as VidyaChatPrefillEvent;
      const payload = prefillEvent.detail;
      if (!payload?.message?.trim()) return;
      if (payload.role && payload.role !== role) return;
      sendSpecificMessage(payload.message);
    };

    window.addEventListener("vidya-chat-prefill", onPrefill);
    return () => {
      window.removeEventListener("vidya-chat-prefill", onPrefill);
    };
  }, [role, sendMessageMutation.isPending, context, userId]);

  const onPromptClick = (question: string) => {
    setMessage(question);
    setTimeout(() => sendSpecificMessage(question), 100);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const base64Data = base64.split(",")[1];
      analyzeImageMutation.mutate({
        image: base64Data,
        context: `Subject: ${context?.currentSubject || "General Preparation"}. Please analyze this educational image and help me understand the concepts.`,
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

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setMessage(transcript);
        setTimeout(() => sendSpecificMessage(transcript), 100);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const displayMessages = localMessages.length > 0 ? localMessages : sessionMessages;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages.length]);

  const formatMessage = (text: string) => {
    if (!text) return "";
    let cleaned = text;
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/^\s*[-*]\s+/gm, "• ");
    cleaned = cleaned.replace(/\s{2,}/g, " ");
    return cleaned.trim();
  };

  return {
    message,
    setMessage,
    isListening,
    isLoading: isLoading && localMessages.length === 0,
    isPending: sendMessageMutation.isPending || analyzeImageMutation.isPending,
    displayMessages,
    quickQuestions: QUICK_QUESTIONS_BY_ROLE[role],
    inputPlaceholder: INPUT_PLACEHOLDER_BY_ROLE[role],
    currentSubject: context?.currentSubject || "General Preparation",
    userInitial: context?.studentName?.charAt(0)?.toUpperCase() || "A",
    fileInputRef,
    messagesEndRef,
    handleSendMessage,
    sendSpecificMessage,
    handleImageUpload,
    handleVoiceInput,
    onPromptClick,
    formatMessage,
  };
}
