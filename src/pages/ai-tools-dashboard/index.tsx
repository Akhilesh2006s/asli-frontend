import StudentShell from "@/components/layout/StudentShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MessageCircle,
  BarChart3,
  Shield,
  LineChart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

interface ToolCardProps {
  title: string;
  description: string;
  badge?: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
}

function ToolCard({
  title,
  description,
  badge,
  icon: Icon,
  href,
  gradient,
}: ToolCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card className="group relative overflow-hidden border border-slate-200/80 bg-white/95 transition-all hover:-translate-y-1 hover:border-indigo-blue-300 hover:shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
            >
              <Icon className="h-7 w-7" />
            </div>
            {badge && (
              <Badge
                variant="secondary"
                className="border border-indigo-blue-200 bg-indigo-blue-50 text-indigo-blue-700"
              >
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p>
        <Button
          size="sm"
          className="group/button mt-2 inline-flex items-center gap-2 rounded-xl px-5 text-base font-bold"
          onClick={() => setLocation(href)}
        >
          Open tool
          <ArrowRight className="h-5 w-5 transition-transform group-hover/button:translate-x-0.5" />
        </Button>
      </CardContent>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-sky-50/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl" />
    </Card>
  );
}

export default function AIToolsDashboard() {
  return (
    <StudentShell>
      <div className="asli-app-bg min-h-screen">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 pb-16 sm:px-8 ">
          <header className="max-w-4xl space-y-4">
            <Badge className="rounded-full bg-indigo-blue-100 text-indigo-blue-800 ring-1 ring-indigo-blue-200">
              ASLILEARN AI workspace
            </Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Start with the right{" "}
              <span className="bg-gradient-to-r from-indigo-blue-600 to-sky-500 bg-clip-text text-transparent">
                AI workspace
              </span>
            </h1>
            <p className="max-w-3xl text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
              Students get guided learning, teachers create classroom-ready material, and school leaders
              manage learning operations from one clear platform.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
            <div className="space-y-4">
              <Card className="border border-sky-100 bg-white/90 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                    <Sparkles className="h-6 w-6 text-orange-500" />
                    One platform, role-aware AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Every user enters a workspace designed for the job they need to complete, with clear
                    prompts, curriculum context, and structured AI results.
                  </p>
                  <p>
                    Choose your workspace to continue. Access is protected by your existing account role.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ToolCard
                title="Student AI"
                description="Ask Vidya, build study guides, practise concepts, and continue your learning path."
                badge="Student"
                icon={Brain}
                href="/ai-tutor"
                gradient="from-indigo-blue-600 to-sky-500"
              />
              <ToolCard
                title="Teacher AI Studio"
                description="Create lessons, worksheets, assessments, and classroom resources with guided forms."
                badge="Teacher"
                icon={MessageCircle}
                href="/teacher/dashboard?tab=vidya-ai"
                gradient="from-violet-500 to-indigo-blue-600"
              />
              <ToolCard
                title="School AI Control Center"
                description="Review learning activity, manage school operations, and open role-based insights."
                badge="School Admin"
                icon={Shield}
                href="/admin/dashboard"
                gradient="from-orange-500 to-amber-500"
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                  <MessageCircle className="h-6 w-6 text-indigo-blue-600" />
                  Student AI experiences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-slate-600">
                  AI chat assistant, smart study guide generator, concept
                  breakdowns, and more — all accessible through the AI Tutor
                  entry.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                  <BarChart3 className="h-6 w-6 text-indigo-blue-600" />
                  Teacher & admin tooling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-slate-600">
                  Use AI to analyze exam results, monitor class performance, and
                  get recommended actions for interventions.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                  <Shield className="h-6 w-6 text-indigo-blue-600" />
                  Governance & safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-slate-600">
                  Super-admin risk dashboards to keep AI usage safe, compliant,
                  and aligned with institutional policies.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </StudentShell>  );
}

