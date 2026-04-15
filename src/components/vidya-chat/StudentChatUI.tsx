import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { UseVidyaChatResult } from "./types";

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
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} flex h-full min-h-0 flex-col rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 via-sky-50 to-teal-50`}>
      <div className="border-b border-indigo-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-white shadow-sm">
              <img src="/Vidya-ai.jpg" alt="Vidya AI" className="h-full w-full rounded-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 text-sm">✨</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Your AI Study Buddy</h3>
            <p className="text-xs text-slate-600">Ask anything, learn faster, and stay confident 🌟</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Current Subject</p>
            <p className="text-sm font-semibold text-indigo-700">{model.currentSubject}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Learning Progress</p>
            <p className="text-sm font-semibold text-emerald-700">{activeProgress}% complete 🚀</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-indigo-100 bg-white p-2">
          <button
            onClick={() => setLearningMode("explain")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              learningMode === "explain" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Explain
          </button>
          <button
            onClick={() => setLearningMode("quiz")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              learningMode === "quiz" ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Quiz
          </button>
          <button
            onClick={() => setLearningMode("practice")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
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

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {model.displayMessages.length === 0 ? (
          <div className="mx-auto max-w-2xl py-8 text-center">
            <h4 className="text-lg font-semibold text-slate-900">What do you want to learn today? 📚</h4>
            <p className="mt-1 text-sm text-slate-600">Tap a colorful prompt card to get started.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={() => model.onPromptClick(question)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium shadow-sm transition ${
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
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {model.displayMessages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600"
                  }`}
                >
                  {msg.role === "user" ? model.userInitial : "🤖"}
                </div>
                <div className={msg.role === "user" ? "text-right" : ""}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white"
                        : "bg-white text-slate-800"
                    }`}
                  >
                    {model.formatMessage(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={model.messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-indigo-100 bg-white/90 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => model.fileInputRef.current?.click()}
            disabled={model.isPending}
          >
            <ImageIcon className="h-4 w-4 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={model.handleVoiceInput}
            disabled={model.isPending || model.isListening}
          >
            <Mic className={`h-4 w-4 ${model.isListening ? "text-red-500" : "text-slate-500"}`} />
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
            className="min-h-[40px] max-h-28 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm outline-none"
          />
          <Button
            size="icon"
            className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
          >
            {model.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-500">
          Learn with small steps, ask follow-ups, and practice every day. 🌟
        </div>
      </div>
    </div>
  );
}
