import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Cpu,
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
  const analyticsCards = [
    {
      label: "AI Requests",
      value: model.displayMessages.length > 0 ? `${model.displayMessages.length}` : "124",
      icon: Activity,
      tone: "text-orange-600",
    },
    {
      label: "Anomaly Alerts",
      value: "3",
      icon: AlertTriangle,
      tone: "text-amber-600",
    },
    {
      label: "Model Health",
      value: "98.2%",
      icon: ShieldCheck,
      tone: "text-green-600",
    },
    {
      label: "Avg Response",
      value: "1.4s",
      icon: BarChart3,
      tone: "text-slate-700",
    },
  ];

  if (model.isLoading) {
    return (
      <div className={`${className ?? ""} flex h-full min-h-[320px] items-center justify-center bg-white`}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
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
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI System Control Panel</h3>
              <p className="text-xs text-orange-100">Live governance, model supervision, and AI fleet monitoring</p>
            </div>
          </div>
          <Badge className="border border-white/30 bg-white/20 text-white hover:bg-white/20">Control Mode: Active</Badge>
        </div>
      </div>

      <div className="border-b border-orange-100 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analyticsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-orange-100 bg-white px-4 py-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                  <Icon className={`h-4 w-4 ${card.tone}`} />
                </div>
                <p className="text-xl font-bold text-slate-900">{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 px-5 py-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Control Console</h4>
                  <p className="text-xs text-slate-600">Run command-style prompts for system diagnostics</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Audit Channel</Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {model.displayMessages.length === 0 ? (
                <div className="mx-auto max-w-4xl py-12 text-center">
                  <h4 className="text-lg font-semibold text-slate-900">System Control Assistant Ready</h4>
                  <p className="mt-1 text-sm text-slate-600">Run diagnostics, audits, and platform-wide AI checks.</p>
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {model.quickQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => model.onPromptClick(question)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50"
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
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          msg.role === "user" ? "bg-slate-700 text-white" : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {msg.role === "user" ? model.userInitial : "AI"}
                      </div>
                      <div className={msg.role === "user" ? "text-right" : ""}>
                        <div
                          className={`inline-block rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            msg.role === "user" ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-800"
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
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
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
                  className="h-8 w-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                  onClick={model.handleSendMessage}
                  disabled={model.isPending || !model.message.trim()}
                >
                  {model.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-semibold text-slate-900">AI Operations Sidebar</h4>
              <p className="text-xs text-slate-600">Monitoring signal and model telemetry</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">AI Status</p>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Online</Badge>
              </div>
              <p className="text-sm font-medium text-slate-800">Inference Cluster Healthy</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">Primary Model</p>
                <Cpu className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">Vidya-OPS v3.2.1</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">Usage Window</p>
                <BrainCircuit className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-sm font-medium text-slate-800">124 Active Requests</p>
            </div>

            <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-3 text-xs text-orange-700">
              Live control mode enabled. Commands trigger analytics and compliance-aware responses.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
