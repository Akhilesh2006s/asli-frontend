import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CircleHelp, ClipboardCheck, Image as ImageIcon, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { UseVidyaChatResult } from "./types";

interface TeacherChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

type TeachingTab = "lesson" | "quiz" | "help";

const MODE_UI: Record<
  TeachingTab,
  {
    title: string;
    subtitle: string;
    header: string;
    activeTab: string;
    quickA: { label: string; prompt: string; className: string };
    quickB: { label: string; prompt: string; className: string };
    Icon: typeof BookOpen;
  }
> = {
  lesson: {
    title: "Lesson Planner AI",
    subtitle: "Design structured class flow, outcomes, and activities.",
    header: "bg-gradient-to-r from-teal-green-50 to-cyan-50",
    activeTab: "bg-gradient-to-r from-teal-green-600 to-indigo-blue-600 text-white shadow-glow",
    quickA: {
      label: "Plan Lesson",
      prompt: "Create a 45-minute lesson plan with learning outcomes and activities.",
      className: "border-teal-green-200 bg-teal-green-50 text-teal-green-800 hover:bg-teal-green-100",
    },
    quickB: {
      label: "Explain Topic",
      prompt: "Explain this topic with examples and misconceptions to avoid.",
      className: "border-indigo-blue-200 bg-indigo-blue-50 text-indigo-blue-800 hover:bg-indigo-blue-100",
    },
    Icon: BookOpen,
  },
  quiz: {
    title: "Assessment Builder AI",
    subtitle: "Generate quizzes, MCQs, and rubric-ready assessment sets.",
    header: "bg-gradient-to-r from-amber-50 to-orange-50",
    activeTab: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg",
    quickA: {
      label: "Create Quiz",
      prompt: "Generate 10 MCQs with answers, bloom level, and difficulty tags.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    quickB: {
      label: "Worksheet Ideas",
      prompt: "Create a worksheet with 3 easy, 3 medium, and 2 challenge questions.",
      className: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    },
    Icon: ClipboardCheck,
  },
  help: {
    title: "Classroom Mentor AI",
    subtitle: "Get support for classroom management and teaching decisions.",
    header: "bg-gradient-to-r from-rose-50 to-amber-50",
    activeTab: "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg",
    quickA: {
      label: "Classroom Help",
      prompt: "Suggest practical strategies to improve classroom engagement.",
      className: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
    },
    quickB: {
      label: "Student Support",
      prompt: "How should I support mixed-ability learners in this lesson?",
      className: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
    Icon: CircleHelp,
  },
};

export function TeacherChatUI({ model, className }: TeacherChatUIProps) {
  const [teachingTab, setTeachingTab] = useState<TeachingTab>("lesson");
  const modeUi = MODE_UI[teachingTab];
  const ModeIcon = modeUi.Icon;

  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-7 w-7 animate-spin text-teal-green-600" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-elevated`}>
      <div className={`border-b border-ink/10 px-5 py-5 sm:px-7 ${modeUi.header}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <ModeIcon className="h-6 w-6 text-teal-green-700" />
          </div>
          <div>
            <p className="mb-0.5 flex items-center gap-1 text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-teal-green-700">
              <Sparkles className="h-3.5 w-3.5" />
              Interactive AI
            </p>
            <h3 className="font-display text-xl font-bold text-ink sm:text-2xl">{modeUi.title}</h3>
          </div>
        </div>
        <p className="mt-2 text-base text-muted-foreground">{modeUi.subtitle}</p>
      </div>

      <div className="px-5 pt-5 sm:px-7">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-mist p-1.5">
          <button
            type="button"
            onClick={() => setTeachingTab("lesson")}
            className={`rounded-xl px-3 py-3 text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
              teachingTab === "lesson" ? modeUi.activeTab : "text-ink/65 hover:bg-white"
            }`}
          >
            Lesson
          </button>
          <button
            type="button"
            onClick={() => setTeachingTab("quiz")}
            className={`rounded-xl px-3 py-3 text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
              teachingTab === "quiz" ? modeUi.activeTab : "text-ink/65 hover:bg-white"
            }`}
          >
            Quiz
          </button>
          <button
            type="button"
            onClick={() => setTeachingTab("help")}
            className={`rounded-xl px-3 py-3 text-base font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
              teachingTab === "help" ? modeUi.activeTab : "text-ink/65 hover:bg-white"
            }`}
          >
            Help
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-mist/70 px-4 py-3">
          <Badge className="border border-teal-green-200 bg-teal-green-50 px-3 py-1.5 text-[0.9375rem] text-teal-green-800 hover:bg-teal-green-50">
            {model.currentSubject || "Biology"} - Grade 7
          </Badge>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-[0.9375rem] font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${modeUi.quickA.className}`}
              onClick={() => model.onPromptClick(modeUi.quickA.prompt)}
            >
              {modeUi.quickA.label}
            </button>
            <button
              type="button"
              className={`rounded-xl border px-3 py-2 text-[0.9375rem] font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${modeUi.quickB.className}`}
              onClick={() => model.onPromptClick(modeUi.quickB.prompt)}
            >
              {modeUi.quickB.label}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        {model.displayMessages.length === 0 ? (
          <div className="mx-auto max-w-2xl py-9 text-center">
            <h4 className="font-display text-xl font-bold text-ink sm:text-2xl">What would you like to create?</h4>
            <p className="mt-2 text-base text-muted-foreground">Tap any idea below — Vidya will begin immediately.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => model.onPromptClick(question)}
                  className={`group flex min-h-20 items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-base font-semibold text-ink transition-all hover:-translate-y-1 hover:shadow-elevated active:scale-[0.99] ${
                    index % 3 === 0
                      ? "border-teal-green-100 bg-teal-green-50 hover:border-teal-green-300"
                      : index % 3 === 1
                        ? "border-amber-100 bg-amber-50 hover:border-amber-300"
                        : "border-rose-100 bg-rose-50 hover:border-rose-300"
                  }`}
                >
                  <span>{question}</span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-ink/35 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {model.displayMessages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {msg.role === "user" ? model.userInitial : "AI"}
                </div>
                <div className={msg.role === "user" ? "text-right" : ""}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
                      msg.role === "user" ? "bg-gradient-to-r from-teal-green-600 to-indigo-blue-600 text-white" : "bg-mist text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-left">
                      {model.formatMessage(msg.content)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={model.messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-ink/10 bg-mist/60 px-5 py-4 sm:px-7">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border-2 border-ink/10 bg-white px-2.5 py-2.5 shadow-sm transition focus-within:border-teal-green-400 focus-within:shadow-glow">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => model.fileInputRef.current?.click()}
            disabled={model.isPending}
          >
            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={model.handleVoiceInput}
            disabled={model.isPending || model.isListening}
          >
            <Mic className={`h-3 w-3 sm:h-4 sm:w-4 ${model.isListening ? "text-red-500" : "text-slate-500"}`} />
          </Button>
          <input
            ref={model.fileInputRef}
            type="file"
            accept="image/*"
            onChange={model.handleImageUpload}
            className="hidden"
          />
          <textarea
            value={model.message}
            onChange={(e) => model.setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                model.handleSendMessage();
              }
            }}
            placeholder={model.inputPlaceholder}
            className="min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base text-ink outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="icon"
            className="h-11 w-11 bg-gradient-to-br from-teal-green-600 to-indigo-blue-600 text-white hover:shadow-glow"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
          >
            {model.isPending ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Send className="h-3 w-3 sm:h-4 sm:w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
