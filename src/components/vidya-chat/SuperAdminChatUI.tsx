import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Loader2,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { UseVidyaChatResult } from "./types";

interface SuperAdminChatUIProps {
  model: UseVidyaChatResult;
  className?: string;
}

export function SuperAdminChatUI({ model, className }: SuperAdminChatUIProps) {
  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div
      className={`${className ?? ""} flex h-full min-h-0 flex-col rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/70 to-slate-50`}
    >
      <div className="border-b border-orange-100 bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">AI System Control Panel</h3>
              <p className="text-xs text-orange-100">
                Database-backed control assistant: Gemini classifies intent; answers use live MongoDB aggregates.
              </p>
            </div>
          </div>
          <Badge className="border border-white/30 bg-white/20 text-white hover:bg-white/20">Control Mode: Active</Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-5 py-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4">
          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900">Control Console</h4>
                  <p className="text-xs text-slate-600">
                    Ask platform metrics; every number is computed server-side (not invented by the model).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={model.clearChat}
                    disabled={model.isPending || model.isClearingChat || model.displayMessages.length === 0}
                  >
                    {model.isClearingChat ? "Clearing..." : "Clear Chat"}
                  </Button>
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Audit Channel</Badge>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {model.displayMessages.length === 0 ? (
                <div className="mx-auto max-w-4xl py-12 text-center">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-900">System Control Assistant Ready</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">Run diagnostics, audits, and platform-wide AI checks.</p>
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {model.quickQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => model.onPromptClick(question)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-4">
                  {model.displayMessages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          msg.role === "user" ? "bg-slate-700 text-white" : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {msg.role === "user" ? model.userInitial : "AI"}
                      </div>
                      <div className={msg.role === "user" ? "text-right" : ""}>
                        <div
                          className={`inline-block rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-sm ${
                            msg.role === "user" ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-800"
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

            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
                  onClick={() => model.fileInputRef.current?.click()}
                  disabled={model.isPending}
                >
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
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
                  className="min-h-[40px] max-h-28 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-xs sm:text-sm outline-none"
                />
                <Button
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                  onClick={model.handleSendMessage}
                  disabled={model.isPending || !model.message.trim()}
                >
                  {model.isPending ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Send className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
