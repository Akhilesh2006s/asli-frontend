import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, apiFetch } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-utils";
import { isLikelyMongoObjectId } from "@/lib/vidya-subjects";
import { ChatMessageContent } from "./ChatMessageContent";
import type {
  AIChatContext,
  UseVidyaChatResult,
  VidyaChatRole,
  Message,
} from "./types";

const CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN = [
  "School dashboard overview",
  "How many students and teachers are active?",
  "How many OMR batches do we have?",
  "How is Class 7 performing?",
  "Tell me about a student by name",
  "How many homework submissions are there?",
  "Show published videos and assessments count",
  "Login attendance summary for today",
];

const CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER = [
  "Platform overview — schools, students, teachers",
  "How many OMR batches and exam results this month?",
  "Details about a school by name",
  "How many trial members are there?",
  "How is a student or teacher doing by name?",
  "How many published videos and assessments?",
  "Login sessions today across the platform",
  "How many risk reports exist?",
];

const QUICK_QUESTIONS_BY_ROLE: Record<VidyaChatRole, string[]> = {
  student: [
    "What should I do today?",
    "What is my homework today?",
    "What are my upcoming exams?",
    "How many subjects do I have?",
    "How many videos in maths?",
    "What is my recent OMR exam result?",
    "What quizzes do I have?",
    "What is on my calendar?",
  ],
  teacher: [
    "What should I do today?",
    "List my classes and students",
    "Who logged in today?",
    "Show homework pending review",
    "What are upcoming exams?",
    "OMR batches for my school",
    "Tell me about a student by name",
    "How is Class 7 performing?",
  ],
  admin: CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN,
  super_admin: CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER,
};

const INPUT_PLACEHOLDER_BY_ROLE: Record<VidyaChatRole, string> = {
  student: "Ask anything about your Asli app: today, homework, exams, videos…",
  teacher: "Ask about your classes, students, homework, exams, OMR…",
  admin: "Ask live school data: students, OMR, exams, homework, classes…",
  super_admin: "Ask live platform data: schools, OMR, exams, trials, AI…",
};

const CONTROL_INPUT_PLACEHOLDER =
  "Ask live app metrics — students, teachers, OMR, exams, homework, videos, risk…";

interface UseVidyaChatOptions {
  userId: string;
  role: VidyaChatRole;
  context?: AIChatContext;
}

type VidyaChatPrefillEvent = CustomEvent<{
  role?: VidyaChatRole;
  message: string;
}>;

function mergeSubjectOptions(
  subjectOptions: string[] | undefined,
  currentSubject: string | undefined
): string[] {
  const opts = (subjectOptions ?? []).map((s) => String(s || "").trim()).filter(Boolean);
  const cur = String(currentSubject || "").trim();
  const list = opts.length > 0 ? [...opts] : cur ? [cur] : ["General Study"];
  const hasCur = cur && list.some((x) => x.localeCompare(cur, undefined, { sensitivity: "accent" }) === 0);
  const merged = cur && !hasCur ? [cur, ...list] : list;
  return Array.from(new Set(merged)).filter((s) => !isLikelyMongoObjectId(s));
}

export function useVidyaChat({
  userId,
  role,
  context,
}: UseVidyaChatOptions): UseVidyaChatResult {
  const isDatabaseBackedAssistant = role === "super_admin" || role === "admin";
  const isStudentMentorMode = role === "student";
  const isTeacherMentorMode = role === "teacher";
  const isAppMentorMode = isStudentMentorMode || isTeacherMentorMode;

  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [lastControlLatencyMs, setLastControlLatencyMs] = useState<number | null>(null);
  const [todayFocusAction, setTodayFocusAction] = useState("");
  const [todayFocusReason, setTodayFocusReason] = useState("");
  const [studyStreakMessage, setStudyStreakMessage] = useState("");
  const [proactivePrompt, setProactivePrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localMessagesRef = useRef<Message[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    localMessagesRef.current = localMessages;
  }, [localMessages]);

  const mergedSubjectOptions = useMemo(
    () => mergeSubjectOptions(context?.subjectOptions, context?.currentSubject),
    [
      context?.currentSubject,
      Array.isArray(context?.subjectOptions) ? context!.subjectOptions!.join("\u0001") : "",
    ]
  );

  const [selectedSubject, setSelectedSubject] = useState(
    () => mergedSubjectOptions[0] || "General Study"
  );
  const selectedSubjectRef = useRef(selectedSubject);
  selectedSubjectRef.current = selectedSubject;

  useEffect(() => {
    const fallback = mergedSubjectOptions[0] || "General Study";
    setSelectedSubject((prev) =>
      mergedSubjectOptions.some((s) => s === prev) ? prev : fallback
    );
  }, [mergedSubjectOptions]);

  const { data: sessions, isLoading: sessionsLoading, refetch } = useQuery({
    queryKey: ["/api/users", userId, "chat-sessions"],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/chat-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch chat sessions");
      const data = await response.json();
      return Array.isArray(data?.sessions) ? data.sessions : [];
    },
    refetchInterval: isDatabaseBackedAssistant ? false : 2000,
    enabled: Boolean(userId) && !isDatabaseBackedAssistant,
  });

  const { data: controlHistory, isLoading: controlHistoryLoading } = useQuery({
    queryKey: ["vidya-control-history", userId],
    queryFn: async () => {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/vidya/control/history?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch control history");
      return response.json() as Promise<{
        success: boolean;
        items: Array<{ prompt: string; responseText: string; createdAt?: string }>;
      }>;
    },
    enabled: Boolean(userId) && isDatabaseBackedAssistant,
  });

  useEffect(() => {
    if (role !== "student") return;
    let mounted = true;
    apiFetch("/api/vidya/student/focus-card")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !data?.success) return;
        setTodayFocusAction(data.focusCard?.action || data.todayFocus?.action || "");
        setTodayFocusReason(data.focusCard?.reason || "");
        const streakCount = Number(data.studyStreak?.count || 0);
        setStudyStreakMessage(streakCount > 0 ? `🔥 ${streakCount}-day streak!` : data.studyStreak?.message || "");
        setProactivePrompt(data.proactivePrompt?.promptText || "");
        if (data.autoGreeting && localMessagesRef.current.length === 0) {
          setLocalMessages([
            {
              role: "assistant",
              content: String(data.autoGreeting),
              timestamp: new Date(),
            },
          ]);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [role, userId]);

  const currentSession = sessions?.[0];
  const sessionMessages: Message[] = (currentSession?.messages as Message[]) || [];

  useEffect(() => {
    if (isDatabaseBackedAssistant) return;
    if (
      sessionMessages.length > 0 &&
      (localMessages.length === 0 || sessionMessages.length > localMessages.length)
    ) {
      setLocalMessages(sessionMessages);
    }
  }, [isDatabaseBackedAssistant, sessionMessages, localMessages.length]);

  useEffect(() => {
    if (!isDatabaseBackedAssistant) return;
    if (controlHistory === undefined) return;
    if (!controlHistory?.success) return;
    const items = controlHistory.items || [];
    if (items.length === 0) {
      setLocalMessages([]);
      return;
    }
    setLocalMessages((prev) => {
      if (prev.length > 0) return prev;
      const mapped: Message[] = [];
      for (const it of items) {
        const ts = it.createdAt ? new Date(it.createdAt) : new Date();
        mapped.push({ role: "user", content: it.prompt, timestamp: ts });
        mapped.push({ role: "assistant", content: it.responseText, timestamp: ts });
      }
      return mapped;
    });
  }, [isDatabaseBackedAssistant, controlHistory]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: AIChatContext }) => {
      const token = getAuthToken();
      const userMessage: Message = {
        role: "user",
        content: data.message,
        timestamp: new Date(),
      };

      const historyPayload = localMessagesRef.current
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({
          role: m.role,
          content: String(m.content || "").slice(0, 6000),
        }));

      setLocalMessages((prev) => [...prev, userMessage]);

      if (isDatabaseBackedAssistant) {
        const response = await fetch(`${API_BASE_URL}/api/vidya/control/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: data.message,
            history: historyPayload,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Control assistant request failed";
          try {
            const errorJson = await response.json();
            if (errorJson?.message) errorMessage = String(errorJson.message);
          } catch (_) {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (result.message) {
          setLastControlLatencyMs(
            typeof result.latencyMs === "number" ? result.latencyMs : null
          );
          const aiMessage: Message = {
            role: "assistant",
            content: result.message,
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

      if (isStudentMentorMode) {
        const response = await fetch(`${API_BASE_URL}/api/vidya/student/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: data.message,
            studentId: userId,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Student mentor request failed";
          try {
            const errorJson = await response.json();
            if (errorJson?.message) errorMessage = String(errorJson.message);
          } catch (_) {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (result.message) {
          const aiMessage: Message = {
            role: "assistant",
            content: result.message,
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

      if (isTeacherMentorMode) {
        const response = await fetch(`${API_BASE_URL}/api/vidya/teacher/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: data.message,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Teacher assistant request failed";
          try {
            const errorJson = await response.json();
            if (errorJson?.message) errorMessage = String(errorJson.message);
          } catch (_) {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (result.message) {
          const aiMessage: Message = {
            role: "assistant",
            content: result.message,
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

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
            ...context,
            ...data.context,
            studentName: context?.studentName || data.context?.studentName || "Student",
            currentSubject:
              data.context?.currentSubject ??
              selectedSubjectRef.current ??
              context?.currentSubject,
            currentTopic: data.context?.currentTopic ?? context?.currentTopic,
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
    onSuccess: (_data, _vars, _ctx) => {
      if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ["vidya-control-history", userId] });
      } else if (isStudentMentorMode) {
        queryClient.invalidateQueries({ queryKey: ["vidya-student-focus", userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "chat-sessions"] });
        setTimeout(() => refetch(), 1000);
      }
      setMessage("");
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to send message.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: async (data: { image: string; context?: string }) => {
      const token = getAuthToken();
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
        context: { ...context, currentSubject: selectedSubjectRef.current },
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
    if (!text.trim()) return;
    const trimmed = text.trim();
    if (isDatabaseBackedAssistant && role === "admin") {
      const asksExamAnswers =
        /\b(answer\s*key|exam\s+answers?|solved?\s+paper|marking\s+scheme|give\s+me\s+the\s+answers?)\b/i.test(
          trimmed,
        );
      if (asksExamAnswers) {
        setLocalMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: trimmed,
            timestamp: new Date(),
          },
          {
            role: "assistant",
            content:
              "I can report exam **counts and schedules** for your school, but I can’t provide answer keys or solve exam papers. Try: “How many exams are scheduled this week?”",
            timestamp: new Date(),
          },
        ]);
        setMessage("");
        return;
      }
    }
    if (sendMessageMutation.isPending) {
      // Don't drop the request — put it in the composer so the user can send when ready.
      setMessage(trimmed);
      return;
    }
    sendMessageMutation.mutate({
      message: trimmed,
      context: {
        ...context,
        currentSubject: selectedSubjectRef.current || context?.currentSubject || "General Study",
      },
    });
  };

  const handleSendMessage = () => sendSpecificMessage(message);

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!isDatabaseBackedAssistant) return { success: true };
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/vidya/control/history`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        let errorMessage = "Failed to clear chat history";
        try {
          const errorJson = await response.json();
          if (errorJson?.message) errorMessage = String(errorJson.message);
        } catch (_) {
          // ignore json parse errors
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      setLocalMessages([]);
      setMessage("");
      if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ["vidya-control-history", userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "chat-sessions"] });
      }
      toast({
        title: "Chat cleared",
        description: "Conversation history has been cleared.",
      });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : "Failed to clear chat history.";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    },
  });

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
  }, [role, sendMessageMutation.isPending, context, userId, selectedSubject]);

  useEffect(() => {
    const onClear = (event: Event) => {
      const detail = (event as CustomEvent<{ role?: VidyaChatRole }>).detail;
      if (detail?.role && detail.role !== role) return;
      if (clearChatMutation.isPending) return;
      clearChatMutation.mutate();
    };

    window.addEventListener("vidya-chat-clear", onClear);
    return () => window.removeEventListener("vidya-chat-clear", onClear);
  }, [role, clearChatMutation.isPending]);

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
        context: `Subject: ${selectedSubjectRef.current || context?.currentSubject || "General Study"}. Please analyze this educational image and help me understand the concepts.`,
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

    const Win = window as unknown as {
      webkitSpeechRecognition?: new () => { start: () => void; onstart: (() => void) | null };
      SpeechRecognition?: new () => { start: () => void; onstart: (() => void) | null };
    };
    const SpeechRecognitionCtor = Win.webkitSpeechRecognition || Win.SpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    // Minimal typing: Web Speech API is not modeled in TS for all browsers here.
    const recognition = new SpeechRecognitionCtor() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      onstart: ((this: unknown) => void) | null;
      onerror: ((this: unknown) => void) | null;
      onresult: ((this: unknown, event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
      onend: ((this: unknown) => void) | null;
    };
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
    recognition.onresult = (event: {
      results: { 0: { 0: { transcript: string } } };
    }) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setMessage(transcript);
        setTimeout(() => sendSpecificMessage(transcript), 100);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const displayMessages = useMemo(() => {
    if (isDatabaseBackedAssistant) return localMessages;
    return localMessages.length > 0 ? localMessages : sessionMessages;
  }, [isDatabaseBackedAssistant, localMessages, sessionMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages.length]);

  const formatMessage = (text: string) => {
    if (!text) return null;
    return <ChatMessageContent text={text} />;
  };

  const quickQuestions = isDatabaseBackedAssistant
    ? role === "super_admin"
      ? CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER
      : CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN
    : QUICK_QUESTIONS_BY_ROLE[role];

  const inputPlaceholder = isDatabaseBackedAssistant
    ? CONTROL_INPUT_PLACEHOLDER
    : INPUT_PLACEHOLDER_BY_ROLE[role];

  const isLoading = isDatabaseBackedAssistant
    ? controlHistoryLoading && localMessages.length === 0
    : sessionsLoading && localMessages.length === 0;

  return {
    message,
    setMessage,
    isListening,
    isLoading,
    isPending: sendMessageMutation.isPending || analyzeImageMutation.isPending,
    displayMessages,
    quickQuestions,
    inputPlaceholder,
    currentSubject: selectedSubject,
    subjectOptions: mergedSubjectOptions,
    setSelectedSubject,
    userInitial: context?.studentName?.charAt(0)?.toUpperCase() || "A",
    fileInputRef,
    messagesEndRef,
    handleSendMessage,
    sendSpecificMessage,
    handleImageUpload,
    handleVoiceInput,
    onPromptClick,
    clearChat: () => {
      if (clearChatMutation.isPending) return;
      clearChatMutation.mutate();
    },
    isClearingChat: clearChatMutation.isPending,
    formatMessage,
    isDatabaseBackedAssistant,
    lastControlLatencyMs,
    todayFocusAction,
    todayFocusReason,
    studyStreakMessage,
    proactivePrompt,
  };
}
