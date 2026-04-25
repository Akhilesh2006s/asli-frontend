import Navigation from "@/components/navigation";
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
    <Card className="group relative overflow-hidden border border-slate-200/80 bg-white/90 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
            >
              <Icon className="h-5 w-5" />
            </div>
            {badge && (
              <Badge
                variant="secondary"
                className="border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700"
              >
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
        <Button
          size="sm"
          className="group/button mt-2 inline-flex items-center gap-1 rounded-full bg-sky-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
          onClick={() => setLocation(href)}
        >
          Open tool
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/button:translate-x-0.5" />
        </Button>
      </CardContent>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-sky-50/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl" />
    </Card>
  );
}

export default function AIToolsDashboard() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-sky-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10 lg:py-12">
          <header className="space-y-3">
            <Badge className="rounded-full bg-sky-100 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
              Central AI Tools Hub
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              All AI tools in{" "}
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                one dashboard
              </span>
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 md:text-base">
              Quickly access every AI experience we provide — from student AI
              tutor to teacher analytics and super-admin risk monitoring —
              through a single shareable page.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-[2fr,3fr]">
            <div className="space-y-4">
              <Card className="border border-sky-100 bg-white/90 shadow-sm">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    What&apos;s inside this folder?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>
                    This `ai-tools-dashboard` page is self-contained on the
                    frontend: you can{" "}
                    <span className="font-semibold">
                      share just this folder
                    </span>{" "}
                    with a colleague to show how all AI tools are wired
                    together.
                  </p>
                  <p>
                    It links to the existing pages like{" "}
                    <span className="font-medium">AI Tutor</span>,{" "}
                    <span className="font-medium">AI Analytics Dashboard</span>,
                    and detailed analytics views.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ToolCard
                title="AI Tutor (Student)"
                description="Student-facing AI tutor with chat assistant and smart learning tools."
                badge="Student"
                icon={Brain}
                href="/ai-tutor"
                gradient="from-sky-500 to-cyan-500"
              />
              <ToolCard
                title="AI Analytics Dashboard"
                description="Teacher / admin analytics powered by AI for performance and insights."
                badge="Teacher / Admin"
                icon={BarChart3}
                href="/ai-analytics-dashboard"
                gradient="from-indigo-500 to-sky-500"
              />
              <ToolCard
                title="Detailed AI Analytics"
                description="Deeper AI-driven insights and breakdowns of student performance."
                badge="Advanced"
                icon={LineChart}
                href="/detailed-ai-analytics"
                gradient="from-violet-500 to-fuchsia-500"
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageCircle className="h-4 w-4 text-sky-500" />
                  Student AI experiences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600">
                  AI chat assistant, smart study guide generator, concept
                  breakdowns, and more — all accessible through the AI Tutor
                  entry.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4 text-sky-500" />
                  Teacher & admin tooling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600">
                  Use AI to analyze exam results, monitor class performance, and
                  get recommended actions for interventions.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 bg-white/90">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Shield className="h-4 w-4 text-sky-500" />
                  Governance & safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600">
                  Super-admin risk dashboards to keep AI usage safe, compliant,
                  and aligned with institutional policies.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

