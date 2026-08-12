import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Layers, ChevronRight, FileStack, Wrench, BookOpen, GraduationCap, Users } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { fetchBootstrap, fetchSectionGapSummaries } from "./api";
import type { BranchItem, ToolSectionGapSummary } from "./api";
import { ToolSection } from "./ToolSection";
import { getAuthToken } from "@/lib/auth-utils";
import {
  BOOK_BASED_STUDENT_TOOL_IDS,
  BOOK_BASED_TEACHER_TOOL_IDS,
} from "@/lib/book-based-tools";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  "activity-project-generator": "Activity & Project Generator",
  "worksheet-mcq-generator": "Worksheet & MCQ Generator",
  "concept-mastery-helper": "Concept Mastery Helper",
  "lesson-planner": "Lesson Planner",
  "homework-creator": "Homework Creator",
  "reading-practice-room": "Reading Practice Room",
  "story-passage-creator": "Story & Passage Creator",
  "short-notes-summaries-maker": "Short Notes & Summaries",
  "my-study-decks": "My Study Decks",
  "flashcard-generator": "Flash Card Generator",
  "daily-class-plan-maker": "Daily Class Plan",
  "mock-test-builder": "Mock Test Builder",
  "exam-question-paper-generator": "Exam Question Paper Generator",
  "smart-study-guide-generator": "Smart Study Guide Generator",
  "concept-breakdown-explainer": "Concept Breakdown Explainer",
  "smart-qa-practice-generator": "Smart Q&A Practice Generator",
  "chapter-summary-creator": "Chapter Summary Creator",
  "key-points-formula-extractor": "Key Points Extractor",
  "quick-assignment-builder": "Quick Assignment Builder",
  "project-idea-lab": "Project Idea Lab",
  "study-schedule-maker": "Study Schedule Maker",
};

const STUDENT_TOOL_SET = new Set<string>(BOOK_BASED_STUDENT_TOOL_IDS);
const TEACHER_TOOL_SET = new Set<string>(BOOK_BASED_TEACHER_TOOL_IDS);

/** Teacher-only tools that may appear in AI Tool Data outside book-based list */
const EXTRA_TEACHER_TOOLS = new Set([
  "quick-assignment-builder",
  "key-points-formula-extractor",
]);

type AudienceTab = "teacher" | "student" | "other";

function classifyTool(toolId: string): AudienceTab {
  if (STUDENT_TOOL_SET.has(toolId)) return "student";
  if (TEACHER_TOOL_SET.has(toolId) || EXTRA_TEACHER_TOOLS.has(toolId)) return "teacher";
  // Heuristics for legacy / renamed slugs
  if (
    /study-guide|qa-practice|concept-breakdown|chapter-summary|study-deck|mock-test|project-idea|reading-practice|study-schedule/i.test(
      toolId,
    )
  ) {
    return "student";
  }
  if (
    /worksheet|lesson|homework|exam-question|class-plan|flashcard|story-passage|short-notes|activity|concept-mastery|assignment/i.test(
      toolId,
    )
  ) {
    return "teacher";
  }
  return "other";
}

const STEPS = ["Tool", "Class", "Subject", "Topic", "Subtopic", "Records"] as const;

export default function AiToolGenerationsPanel() {
  const [loading, setLoading] = useState(true);
  const [metaTotal, setMetaTotal] = useState<number | null>(null);
  const [metaTopicsCount, setMetaTopicsCount] = useState<number | null>(null);
  const [tools, setTools] = useState<BranchItem[] | null>(null);
  const [board, setBoard] = useState("");
  const [boards, setBoards] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gapByTool, setGapByTool] = useState<Record<string, ToolSectionGapSummary | null>>({});
  const [gapLoading, setGapLoading] = useState(false);
  const [audienceTab, setAudienceTab] = useState<AudienceTab>("teacher");
  const gapFetchKey = useRef("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [bootstrap, boardBranch] = await Promise.all([
          fetchBootstrap({ ...(board ? { board } : {}) }),
          fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/options`, {
            headers: {
              "Content-Type": "application/json",
              ...(getAuthToken()
                ? { Authorization: `Bearer ${getAuthToken()}` }
                : {}),
            },
          }).then((r) => (r.ok ? r.json() : Promise.resolve({ data: { boards: [] } }))),
        ]);
        if (cancelled) return;
        setMetaTotal(bootstrap.data.total);
        setMetaTopicsCount(bootstrap.data.topicsCount ?? 0);
        setTools(bootstrap.data.items || []);
        setBoards(Array.isArray(boardBranch?.data?.boards) ? boardBranch.data.boards : []);
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load";
          setError(
            message === "Failed to fetch"
              ? "Could not reach the API. Restart the backend (npm run server) and refresh this page."
              : message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board]);

  const grouped = useMemo(() => {
    const list = tools ? [...tools] : [];
    list.sort((a, b) => a.value.localeCompare(b.value));
    const teacher: BranchItem[] = [];
    const student: BranchItem[] = [];
    const other: BranchItem[] = [];
    for (const t of list) {
      const bucket = classifyTool(t.value);
      if (bucket === "student") student.push(t);
      else if (bucket === "teacher") teacher.push(t);
      else other.push(t);
    }
    return { teacher, student, other };
  }, [tools]);

  const visibleTools =
    audienceTab === "teacher"
      ? grouped.teacher
      : audienceTab === "student"
        ? grouped.student
        : grouped.other;

  useEffect(() => {
    if (loading || !tools?.length) {
      setGapByTool({});
      setGapLoading(false);
      return;
    }

    const fetchKey = board || "__all__";
    if (gapFetchKey.current === fetchKey) return;
    gapFetchKey.current = fetchKey;

    let cancelled = false;
    setGapLoading(true);
    setGapByTool({});

    (async () => {
      try {
        const res = await fetchSectionGapSummaries(board);
        if (!cancelled) {
          setGapByTool(res.data.byTool || {});
          setGapLoading(false);
        }
      } catch {
        if (!cancelled) {
          setGapByTool({});
          setGapLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [board, loading, tools?.length]);

  // If Other is empty, don't leave user on a blank tab after load
  useEffect(() => {
    if (loading) return;
    if (audienceTab === "other" && grouped.other.length === 0) {
      setAudienceTab(grouped.teacher.length ? "teacher" : "student");
    }
  }, [loading, audienceTab, grouped.other.length, grouped.teacher.length]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80 flex flex-col">
      <div className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 pb-10 space-y-4 sm:space-y-5">
        <header className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400"
            aria-hidden
          />
          <div className="px-4 sm:px-6 py-5 space-y-4">
            <div className="space-y-2 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-800 ring-1 ring-orange-200/60">
                <Layers className="h-3.5 w-3.5" />
                Super Admin · Saved AI output
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  AI tool data
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                  Browse teacher and student tools separately. Same data powers dashboards after Book-Based /
                  AI Generator runs.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-orange-50/40 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Generations
                </p>
                {loading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-orange-500" />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                    {metaTotal !== null ? metaTotal : "—"}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Tools
                </p>
                {loading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-orange-500" />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                    {(tools || []).length}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-indigo-50/40 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Topics
                </p>
                {loading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-orange-500" />
                ) : (
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                    {metaTopicsCount !== null ? metaTopicsCount : "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mr-1">
                Path
              </span>
              {STEPS.map((s, i) => (
                <span key={s} className="inline-flex items-center gap-0.5">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden />}
                  <Badge
                    variant="secondary"
                    className="rounded px-1.5 py-0 text-[10px] font-normal text-slate-600"
                  >
                    {s}
                  </Badge>
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-semibold",
                  audienceTab === "teacher" && "bg-white text-slate-900 shadow-sm",
                )}
                onClick={() => setAudienceTab("teacher")}
              >
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                Teacher ({grouped.teacher.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-md px-3 text-xs font-semibold",
                  audienceTab === "student" && "bg-white text-slate-900 shadow-sm",
                )}
                onClick={() => setAudienceTab("student")}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Student ({grouped.student.length})
              </Button>
              {grouped.other.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold",
                    audienceTab === "other" && "bg-white text-slate-900 shadow-sm",
                  )}
                  onClick={() => setAudienceTab("other")}
                >
                  <Wrench className="mr-1.5 h-3.5 w-3.5" />
                  Other ({grouped.other.length})
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Board</span>
              <div className="w-full sm:w-[180px]">
                <Select value={board || "__all__"} onValueChange={(v) => setBoard(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All boards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All boards</SelectItem>
                    {boards.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {audienceTab === "teacher"
                ? "teacher tools"
                : audienceTab === "student"
                  ? "student tools"
                  : "other / legacy tools"}
            </span>
            {board ? (
              <>
                {" "}
                · Board <span className="font-medium text-slate-700">{board}</span>
              </>
            ) : null}
            <span className="text-slate-300 mx-1.5">·</span>
            Red flag = missing required sections
          </p>

          <Card className="w-full border-slate-200/90 shadow-sm">
            <CardContent className="p-3 sm:p-5 space-y-3">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-sm font-medium">Loading hierarchy…</p>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && visibleTools.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-800">No {audienceTab} tools with data</p>
                  <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                    Generate content from Book-Based Generator or AI Generator for this audience, then refresh.
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                visibleTools.map((t) => (
                  <ToolSection
                    key={t.value}
                    tool={t}
                    displayName={TOOL_LABELS[t.value]}
                    board={board}
                    gapSummary={gapByTool[t.value]}
                    gapLoading={gapLoading && !(t.value in gapByTool)}
                  />
                ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
