import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, CalendarDays, Image as ImageIcon, Loader2, Mic, Send, Sparkles, Users } from "lucide-react";
import type { UseVidyaChatResult } from "./types";

interface AdminChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

export function AdminChatUI({ model, className }: AdminChatUIProps) {
  const quickActions = [
    { label: "Students", icon: Users, tone: "border-sky-200 text-sky-700 hover:bg-sky-50" },
    { label: "Exams", icon: CalendarDays, tone: "border-teal-200 text-teal-700 hover:bg-teal-50" },
    { label: "Reports", icon: BarChart3, tone: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  ];

  const statsStrip = [
    { label: "Students", value: "1,284", icon: Users, tone: "text-sky-700 border-sky-100 bg-sky-50/70" },
    { label: "Classes", value: "42", icon: Sparkles, tone: "text-teal-700 border-teal-100 bg-teal-50/70" },
    { label: "Exams", value: "18", icon: CalendarDays, tone: "text-emerald-700 border-emerald-100 bg-emerald-50/70" },
  ];

  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} flex h-full min-h-0 flex-col rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 via-cyan-50 to-teal-50`}>
      <div className="mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col">
        <div className="border-b border-sky-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">School AI Assistant</h3>
              <p className="text-sm text-slate-600">Manage students, teachers, and school workflows</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className={`rounded-lg bg-white ${action.tone}`}
                  onClick={() => model.onPromptClick(`Show ${action.label.toLowerCase()} overview`)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {statsStrip.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`rounded-lg border px-3 py-2 ${stat.tone}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <Badge className="border border-sky-200 bg-white text-sky-700 hover:bg-white">
            AI assists with administrative tasks and reporting
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
        {model.displayMessages.length === 0 ? (
          <div className="mx-auto max-w-3xl py-8 text-center">
            <h4 className="text-lg font-semibold text-slate-900">How can I support school operations?</h4>
            <p className="mt-1 text-sm text-slate-600">Ask about enrollment, assignments, exams, and reports.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {model.quickQuestions.map((question, index) => (
                <button
                  key={question}
                  onClick={() => model.onPromptClick(question)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition-colors ${
                    index % 2 === 0
                      ? "border-sky-100 bg-sky-50 hover:bg-sky-100"
                      : "border-teal-100 bg-teal-50 hover:bg-teal-100"
                  }`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {model.displayMessages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    msg.role === "user" ? "bg-sky-600 text-white" : "bg-teal-100 text-teal-700"
                  }`}
                >
                  {msg.role === "user" ? model.userInitial : "AI"}
                </div>
                <div className={msg.role === "user" ? "text-right" : ""}>
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-sky-600 to-teal-600 text-white"
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

        <div className="border-t border-sky-100 bg-white/80 px-5 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
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
            className="h-8 w-8 bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600"
            onClick={model.handleSendMessage}
            disabled={model.isPending || !model.message.trim()}
          >
            {model.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
