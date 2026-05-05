import type React from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "voice" | "image";
}

export type AIChatPromptVariant = "student" | "teacher" | "admin" | "super-admin";
export type VidyaChatRole = "super_admin" | "admin" | "teacher" | "student";

export interface AIChatContext {
  studentName?: string;
  /** Initial / default subject when the chat opens */
  currentSubject?: string;
  /** All subjects the student can pick; Vidya stays within the selected one */
  subjectOptions?: string[];
  currentTopic?: string;
  recentTest?: string;
}

export interface AIChatProps {
  userId: string;
  context?: AIChatContext;
  className?: string;
  promptVariant?: AIChatPromptVariant;
}

export interface UseVidyaChatResult {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  isListening: boolean;
  isLoading: boolean;
  isPending: boolean;
  displayMessages: Message[];
  quickQuestions: string[];
  inputPlaceholder: string;
  /** Subject currently driving Vidya’s answers */
  currentSubject: string;
  subjectOptions: string[];
  setSelectedSubject: (subject: string) => void;
  userInitial: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: () => void;
  sendSpecificMessage: (text: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVoiceInput: () => void;
  onPromptClick: (question: string) => void;
  clearChat: () => void;
  isClearingChat?: boolean;
  formatMessage: (text: string) => string;
  /** Admin / Super-admin “Control Console”: answers grounded in MongoDB aggregates. */
  isDatabaseBackedAssistant?: boolean;
  /** Latency from last control query (Gemini classify + Mongo + Gemini format). */
  lastControlLatencyMs?: number | null;
  todayFocusAction?: string;
  todayFocusReason?: string;
  studyStreakMessage?: string;
  proactivePrompt?: string;
}
