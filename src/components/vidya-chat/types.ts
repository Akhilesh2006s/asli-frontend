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
  currentSubject?: string;
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
  currentSubject: string;
  userInitial: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleSendMessage: () => void;
  sendSpecificMessage: (text: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVoiceInput: () => void;
  onPromptClick: (question: string) => void;
  formatMessage: (text: string) => string;
}
