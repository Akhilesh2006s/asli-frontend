import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, Mic, Send } from "lucide-react";
import { useState } from "react";
import type { UseVidyaChatResult } from "./types";

interface TeacherChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

type TeachingTab = "lesson" | "quiz" | "help";

export function TeacherChatUI({ model, className }: TeacherChatUIProps) {
  const [teachingTab, setTeachingTab] = useState<TeachingTab>("lesson");

  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-sm`}>
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-900">Teaching Assistant AI</h3>
        <p className="text-xs text-slate-600">Compact workspace for fast lesson support</p>
      </div>

      <div className="px-4 pt-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTeachingTab("lesson")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              teachingTab === "lesson" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Lesson
          </button>
          <button
            onClick={() => setTeachingTab("quiz")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              teachingTab === "quiz" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Quiz
          </button>
          <button
            onClick={() => setTeachingTab("help")}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              teachingTab === "help" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Help
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Badge className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
            {model.currentSubject || "Biology"} - Grade 7
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="cursor-pointer border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              onClick={() => model.onPromptClick("Generate quiz questions")}
            >
              Create Quiz
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
              onClick={() => model.onPromptClick("Explain topic in simple terms")}
            >
              Explain Topic
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {model.displayMessages.length === 0 ? (
          <div className="mx-auto max-w-2xl py-10 text-center">
            <h4 className="text-lg font-semibold text-slate-900">Start with a teaching prompt</h4>
            <p className="mt-1 text-sm text-slate-600">Choose a prompt to generate your next classroom resource.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={() => model.onPromptClick(question)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium text-slate-700 transition ${
                    index % 3 === 0
                      ? "border-blue-100 bg-blue-50 hover:bg-blue-100"
                      : index % 3 === 1
                        ? "border-violet-100 bg-violet-50 hover:bg-violet-100"
                        : "border-teal-100 bg-teal-50 hover:bg-teal-100"
                  }`}
                >
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
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {msg.role === "user" ? model.userInitial : "AI"}
                </div>
                <div className={msg.role === "user" ? "text-right" : ""}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-800"
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

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
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
            className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
          >
            {model.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
