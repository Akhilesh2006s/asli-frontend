import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, ChevronRight, FileStack, Wrench, BookOpen } from "lucide-react";
import { fetchBranch, fetchMeta } from "./api";
import type { BranchItem } from "./api";
import { ToolSection } from "./ToolSection";

const TOOL_LABELS: Record<string, string> = {
  "activity-project-generator": "Activity & Project Generator",
  "worksheet-mcq-generator": "Worksheet & MCQ Generator",
  "concept-mastery-helper": "Concept Mastery Helper",
  "lesson-planner": "Lesson Planner",
  "homework-creator": "Homework Creator",
  "rubrics-evaluation-generator": "Rubrics, Evaluation & Report Card",
  "story-passage-creator": "Story & Passage Creator",
  "short-notes-summaries-maker": "Short Notes & Summaries",
  "flashcard-generator": "Flashcard Generator",
  "daily-class-plan-maker": "Daily Class Plan",
  "exam-question-paper-generator": "Exam Question Paper",
};

const STEPS = ["Tool", "Class", "Subject", "Topic", "Subtopic", "Records"] as const;

export default function AiToolGenerationsPanel() {
  const [loading, setLoading] = useState(true);
  const [metaTotal, setMetaTotal] = useState<number | null>(null);
  const [metaTopicsCount, setMetaTopicsCount] = useState<number | null>(null);
  const [tools, setTools] = useState<BranchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meta, branch] = await Promise.all([fetchMeta(), fetchBranch({})]);
        if (cancelled) return;
        setMetaTotal(meta.data.total);
        setMetaTopicsCount(meta.data.topicsCount ?? 0);
        setTools(branch.data.items || []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedTools = useMemo(() => {
    if (!tools) return [];
    return [...tools].sort((a, b) => a.value.localeCompare(b.value));
  }, [tools]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 flex flex-col">
      <div className="w-full flex-1 px-5 sm:px-8 lg:px-10 xl:px-12 py-6 md:py-8 pb-12 space-y-8">
        <header className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400"
            aria-hidden
          />
          <div className="px-6 py-7 md:px-10 md:py-8 space-y-6">
            <div className="space-y-4 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 ring-1 ring-orange-200/60">
                <Layers className="h-3.5 w-3.5" />
                Super Admin · Saved AI output
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  AI tool data
                </h1>
                <p className="mt-2 text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl">
                  Browse generations from teacher tools (this release onward). Open each tool to drill
                  down; use <span className="font-medium text-slate-700">PDF</span> on a subtopic to
                  export that slice.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-5 md:p-6 shadow-sm ring-1 ring-slate-100/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
                    <FileStack className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total generations
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  How many AI runs are stored—each run may include many questions, cards, or sections
                  depending on the tool.
                </p>
                {loading ? (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <p className="mt-2 text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-slate-900">
                    {metaTotal !== null ? metaTotal : "—"}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-orange-50/10 p-5 md:p-6 shadow-sm ring-1 ring-slate-100/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-md">
                    <Wrench className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tools with data
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  Distinct teacher tools that have at least one saved generation
                </p>
                {loading ? (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <p className="mt-2 text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-slate-900">
                    {sortedTools.length}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 p-5 md:p-6 shadow-sm ring-1 ring-slate-100/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Topics covered
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  Distinct topic names across all saved AI tool generations
                </p>
                {loading ? (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <p className="mt-2 text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-slate-900">
                    {metaTopicsCount !== null ? metaTopicsCount : "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Browse path
              </span>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-0.5">
                {STEPS.map((s, i) => (
                  <span key={s} className="inline-flex items-center gap-1">
                    {i > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" aria-hidden />
                    )}
                    <Badge
                      variant="secondary"
                      className="rounded-md border-slate-200 bg-slate-50/90 font-normal text-slate-700 hover:bg-slate-50"
                    >
                      {s}
                    </Badge>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="px-0.5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              By tool
            </h2>
          </div>

          <Card className="w-full border-slate-200/90 shadow-sm">
            <CardContent className="p-4 md:p-8 space-y-4">
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                  <p className="text-sm font-medium">Loading hierarchy…</p>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && sortedTools.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
                  <Layers className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-800">No saved generations yet</p>
                  <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                    When teachers generate content from AI tools, new runs are stored here automatically.
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                sortedTools.map((t) => (
                  <ToolSection
                    key={t.value}
                    tool={t}
                    displayName={TOOL_LABELS[t.value]}
                  />
                ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
