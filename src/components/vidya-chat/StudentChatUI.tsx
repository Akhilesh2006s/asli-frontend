import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, Loader2, Mic, Send } from "lucide-react";
import { useState } from "react";
import type { Message, UseVidyaChatResult } from "./types";

function formatMessageTime(d: Date) {
  try {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

interface StudentChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

type LearningMode = "explain" | "quiz" | "practice";

export function StudentChatUI({ model, className }: StudentChatUIProps) {
  const [learningMode, setLearningMode] = useState<LearningMode>("explain");
  const progressByMode: Record<LearningMode, number> = {
    explain: 68,
    quiz: 74,
    practice: 81,
  };
  const activeProgress = progressByMode[learningMode];

  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div
      className={`${className ?? ""} flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 via-sky-50 to-teal-50`}
    >
      <div className="shrink-0 border-b border-indigo-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-white shadow-sm">
              <img src="/Vidya-ai.jpg" alt="Vidya AI" className="h-full w-full rounded-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-xs sm:text-sm">✨</span>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">Your AI Study Buddy</h3>
            <p className="text-xs text-slate-600">Ask anything, learn faster, and stay confident 🌟</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-3 pt-3">
        {(model.todayFocusAction || model.studyStreakMessage) && (
          <div className="mb-3 grid grid-cols-1 gap-2">
            {model.todayFocusAction && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-amber-700">Today Focus On This</p>
                <p className="text-xs sm:text-sm font-semibold text-amber-900">{model.todayFocusAction}</p>
                {model.todayFocusReason ? <p className="text-xs text-amber-800">{model.todayFocusReason}</p> : null}
              </div>
            )}
            {model.studyStreakMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-medium text-emerald-800">{model.studyStreakMessage}</p>
              </div>
            )}
            {model.proactivePrompt && (
              <button
                onClick={() => model.onPromptClick(model.proactivePrompt || "")}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-xs text-indigo-800 hover:bg-indigo-100"
              >
                {model.proactivePrompt}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
            <label htmlFor="vidya-subject-select" className="text-[11px] uppercase tracking-wide text-slate-500">
              Subject focus
            </label>
            <Select value={model.currentSubject} onValueChange={model.setSelectedSubject}>
              <SelectTrigger
                id="vidya-subject-select"
                className="mt-1 h-9 border-indigo-200 bg-white text-left text-xs sm:text-sm font-medium text-indigo-800"
              >
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent>
                {model.subjectOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">Vidya stays within this subject.</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Learning Progress</p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-700">{activeProgress}% complete 🚀</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-indigo-100 bg-white p-2">
          <button
            onClick={() => setLearningMode("explain")}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm ${
              learningMode === "explain" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Explain
          </button>
          <button
            onClick={() => setLearningMode("quiz")}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm ${
              learningMode === "quiz" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Quiz
          </button>
          <button
            onClick={() => setLearningMode("practice")}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm ${
              learningMode === "practice" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Practice
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">Learning Progress</p>
            <p className="text-xs font-semibold text-emerald-700">{activeProgress}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-all duration-300"
              style={{ width: `${activeProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lower panel: scrollable chat + fixed composer — min-h avoids flex collapse when outer height is tight */}
      <div className="mx-2 mb-2 mt-1 flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-2xl border border-indigo-100/80 bg-white shadow-sm sm:mx-4 sm:mb-3 sm:min-h-[18rem]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-5">
          <div className="mx-auto flex min-h-min max-w-2xl flex-col gap-5">
            {model.displayMessages.length === 0 ? (
              <>
                <div className="flex w-full flex-col items-start gap-1">
                  <div className="max-w-[min(100%,28rem)] rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50 to-indigo-50/80 px-4 py-3 text-xs sm:text-sm leading-relaxed text-slate-800 shadow-sm">
                    {`Hi! I'm Vidya AI 👋 Ask me anything about ${model.currentSubject || "your subject"}.`}
                  </div>
                  <span className="pl-1 text-[10px] text-slate-400">Just now</span>
                </div>
                <div className="space-y-3">
                  <h4 className="text-center text-xs sm:text-sm font-semibold text-slate-700">What do you want to learn today? 📚</h4>
                  <p className="text-center text-xs text-slate-500">Tap a prompt to start the conversation.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {model.quickQuestions.map((question, index) => (
                      <button
                        key={question}
                        onClick={() => model.onPromptClick(question)}
                        className={`rounded-2xl border px-4 py-3 text-left text-xs sm:text-sm font-medium shadow-sm transition ${
                          index === 0
                            ? "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100"
                            : index === 1
                              ? "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                              : index === 2
                                ? "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                                : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        }`}
                      >
                        <span className="mr-2">
                          {index === 0 ? "💡" : index === 1 ? "🧩" : index === 2 ? "📝" : "📘"}
                        </span>
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              model.displayMessages.map((msg, index) => (
                <ChatBubble key={`${msg.role}-${index}`} msg={msg} model={model} />
              ))
            )}
            <div ref={model.messagesEndRef} className="h-px shrink-0" aria-hidden />
          </div>
        </div>

        <div className="shrink-0 border-t border-indigo-100 bg-white px-3 py-3 sm:px-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0"
              onClick={() => model.fileInputRef.current?.click()}
              disabled={model.isPending}
            >
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0"
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
              className="min-h-[40px] max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-xs sm:text-sm outline-none"
              rows={1}
            />
            <Button
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0 bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
              onClick={model.handleSendMessage}
              disabled={model.isPending || !model.message.trim()}
            >
              {model.isPending ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Send className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
          </div>
          <div className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-500">
            Learn with small steps, ask follow-ups, and practice every day. 🌟
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg, model }: { msg: Message; model: UseVidyaChatResult }) {
  const isUser = msg.role === "user";
  const time = formatMessageTime(msg.timestamp);

  return (
    <div className={`flex w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
          isUser
            ? "border border-indigo-200 bg-gradient-to-br from-indigo-500 to-sky-600 text-white"
            : "border border-sky-200/90 bg-gradient-to-br from-white to-sky-50/90 text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{model.formatMessage(msg.content)}</p>
      </div>
      {time ? (
        <span className={`text-[10px] text-slate-400 ${isUser ? "pr-1" : "pl-1"}`}>{time}</span>
      ) : null}
    </div>
  );
}
