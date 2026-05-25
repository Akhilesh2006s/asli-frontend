import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, Mic, Send } from "lucide-react";
import type { UseVidyaChatResult } from "./types";

interface StudentChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

export function StudentChatUI({ model, className }: StudentChatUIProps) {
  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[200px] items-center justify-center bg-white`}>
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  const hasNotifications =
    model.todayFocusAction || model.studyStreakMessage || model.proactivePrompt;

  return (
    <div
      className={`${className ?? ""} flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 via-sky-50 to-teal-50`}
    >
      <div className="shrink-0 border-b border-indigo-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-indigo-200 bg-white shadow-sm">
              <img src="/Vidya-ai.jpg" alt="Vidya AI" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">Your AI Study Buddy</h3>
            <p className="truncate text-[11px] text-slate-600">Ask anything, learn faster 🌟</p>
          </div>
        </div>
      </div>

      {hasNotifications && (
        <div className="custom-scrollbar shrink-0 overflow-y-auto overscroll-contain border-b border-indigo-100/80 px-3 py-2">
          <div className="grid grid-cols-1 gap-1.5">
            {model.todayFocusAction && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-amber-700">Today Focus</p>
                <p className="text-xs font-semibold text-amber-900">{model.todayFocusAction}</p>
                {model.todayFocusReason ? <p className="text-[11px] text-amber-800">{model.todayFocusReason}</p> : null}
              </div>
            )}
            {model.studyStreakMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-emerald-800">{model.studyStreakMessage}</p>
              </div>
            )}
            {model.proactivePrompt && (
              <button
                onClick={() => model.onPromptClick(model.proactivePrompt || "")}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-left text-[11px] leading-snug text-indigo-800 hover:bg-indigo-100"
              >
                {model.proactivePrompt}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {model.displayMessages.length === 0 ? (
          <div className="py-4 text-center">
            <h4 className="text-sm font-semibold text-slate-900">What do you want to learn today?</h4>
            <p className="mt-0.5 text-xs text-slate-600">Tap a prompt to get started.</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={() => model.onPromptClick(question)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium shadow-sm transition ${
                    index === 0
                      ? "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100"
                      : index === 1
                        ? "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                        : index === 2
                          ? "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                          : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {model.displayMessages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "user" ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                    {model.userInitial}
                  </div>
                ) : (
                  <img
                    src="/Vidya-ai.jpg"
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full border border-indigo-100 object-cover"
                  />
                )}
                <div
                  className={`min-w-0 max-w-[88%] ${msg.role === "user" ? "text-right" : ""}`}
                >
                  <div
                    className={`inline-block rounded-xl px-3 py-2 text-sm leading-snug shadow-sm ${
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

      <div className="shrink-0 border-t border-indigo-100 bg-white/90 px-3 py-2">
        <div className="flex items-end gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => model.fileInputRef.current?.click()}
            disabled={model.isPending}
          >
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={model.handleVoiceInput}
            disabled={model.isPending || model.isListening}
          >
            <Mic className={`h-3.5 w-3.5 ${model.isListening ? "text-red-500" : "text-slate-500"}`} />
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
            rows={1}
            className="min-h-[32px] max-h-20 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm leading-snug outline-none"
          />
          <Button
            size="icon"
            className="h-7 w-7 shrink-0 bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
          >
            {model.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
