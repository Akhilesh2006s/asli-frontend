import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  Image as ImageIcon,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import type { UseVidyaChatResult } from "./types";

interface StudentChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

export function StudentChatUI({ model, className }: StudentChatUIProps) {
  const [insightsOpen, setInsightsOpen] = useState(true);

  if (model.isLoading) {
    return (
      <div
        className={`${className ?? ""} flex h-full min-h-[200px] items-center justify-center bg-white`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  const hasNotifications =
    model.todayFocusAction || model.studyStreakMessage || model.proactivePrompt;
  const hasMessages = model.displayMessages.length > 0;
  // Keep chat readable on mobile: collapse insights once conversation starts
  const showInsightsExpanded = hasNotifications && (insightsOpen || !hasMessages);

  return (
    <div
      className={`${className ?? ""} flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/40 to-sky-50/50`}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-indigo-100/80 bg-white/90 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-indigo-100 bg-white shadow-sm">
            <img src="/Vidya-ai.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-900">Vidya AI</h3>
            <p className="truncate text-[11px] text-slate-500">Your study buddy</p>
          </div>
          {hasNotifications ? (
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              aria-expanded={showInsightsExpanded}
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              Insights
              {showInsightsExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Compact insights (collapsible when chatting) */}
      {hasNotifications && showInsightsExpanded ? (
        <div className="shrink-0 space-y-1.5 border-b border-indigo-100/70 bg-white/70 px-3 py-2">
          {model.todayFocusAction ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-2.5 py-2">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Today focus
                </p>
                <p className="text-xs font-semibold leading-snug text-amber-950">
                  {model.todayFocusAction}
                </p>
                {model.todayFocusReason ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-amber-800/90">
                    {model.todayFocusReason}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {model.studyStreakMessage ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-2.5 py-2">
              <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <p className="text-[11px] font-medium leading-snug text-emerald-900">
                {model.studyStreakMessage}
              </p>
            </div>
          ) : null}
          {model.proactivePrompt ? (
            <button
              type="button"
              onClick={() => model.onPromptClick(model.proactivePrompt || "")}
              className="w-full rounded-xl border border-indigo-200/80 bg-indigo-50 px-2.5 py-2 text-left text-[11px] leading-snug text-indigo-900 hover:bg-indigo-100"
            >
              {model.proactivePrompt}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Messages */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {!hasMessages ? (
          <div className="px-1 py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">What do you want to learn?</h4>
            <p className="mt-1 text-xs text-slate-500">Tap a prompt to start</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => model.onPromptClick(question)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium shadow-sm transition ${
                    index === 0
                      ? "border-pink-200 bg-pink-50 text-pink-900 hover:bg-pink-100"
                      : index === 1
                        ? "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                        : index === 2
                          ? "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100"
                          : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {model.displayMessages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  {isUser ? (
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
                  <div className={`min-w-0 max-w-[min(92%,22rem)] sm:max-w-[85%] ${isUser ? "" : "w-full"}`}>
                    {!isUser ? (
                      <p className="mb-1 pl-0.5 text-[10px] font-medium text-slate-400">Vidya AI</p>
                    ) : null}
                    <div
                      className={
                        isUser
                          ? "rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-600 to-sky-600 px-3.5 py-2.5 text-left text-sm leading-relaxed text-white shadow-sm"
                          : "rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-3 text-left text-sm text-slate-800 shadow-sm"
                      }
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      ) : (
                        model.formatMessage(msg.content)
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {model.isPending ? (
              <div className="flex items-center gap-2 pl-9 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                Vidya is thinking…
              </div>
            ) : null}
            <div ref={model.messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer — safe area so it doesn't cover the last message */}
      <div className="shrink-0 border-t border-indigo-100/80 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 shadow-sm focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500"
            onClick={() => model.fileInputRef.current?.click()}
            disabled={model.isPending}
            aria-label="Upload image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500"
            onClick={model.handleVoiceInput}
            disabled={model.isPending || model.isListening}
            aria-label="Voice input"
          >
            <Mic className={`h-4 w-4 ${model.isListening ? "text-red-500" : ""}`} />
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
            className="min-h-[36px] max-h-24 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm hover:from-indigo-700 hover:to-sky-700"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
            aria-label="Send"
          >
            {model.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
