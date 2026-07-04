import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { ToolSectionIcon } from '@/components/ai-tool-3d-icons';
import { useMemo, type ReactNode } from 'react';
import {
  ClipboardList,
  FileQuestion,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  Rocket,
  Scale,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  quickAssignmentViewerPayloadFromRecord,
  resolveQuickAssignmentFromPayload,
  type AssignmentQuestion,
  type QuickAssignmentContent,
} from '@/lib/parse-quick-assignment';
import { renderQuickAssignmentMarkdown } from '@/lib/render-quick-assignment-markdown';

export { quickAssignmentViewerPayloadFromRecord };

interface QuickAssignmentViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function SectionCard({
  sectionNum,
  title,
  icon: Icon,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe?: string;
  iconWrap?: string;
  children: ReactNode;
}) {
  return (
    <AiToolStackedSection num={sectionNum} title={title} icon={Icon}>
      {children}
    </AiToolStackedSection>
  );
}

function EmptyHint({ label = 'Not included in this assignment.' }: { label?: string }) {
  return (
    <p className="rounded-md border border-dashed border-rose-200 bg-rose-50/40 px-2 py-1 text-xs italic text-slate-400">
      {label}
    </p>
  );
}

function RichTextBlock({ text }: { text: string }) {
  if (!text.trim()) return <EmptyHint />;
  const hasMarkdown =
    text.includes('|') ||
    /^\s*#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /^\s*[-*•]\s/m.test(text);
  if (hasMarkdown) {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-800 prose-li:text-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>;
}

function BulletList({ items, accent = 'text-rose-500' }: { items: string[]; accent?: string }) {
  if (!items.length) return <EmptyHint />;
  return (
    <ul className="space-y-1.5">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <span className={cn('mt-0.5 shrink-0', accent)}>•</span>
          <span className="whitespace-pre-wrap leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function QuestionCard({ q, index }: { q: AssignmentQuestion; index: number }) {
  const num = displayQuestionSerial(index);
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50/30 px-3 py-2.5 space-y-2">
      <p className="text-sm font-medium text-slate-900">
        <span className="mr-1.5 font-bold text-rose-700">Q{num}.</span>
        {q.question}
      </p>
      {q.options.length > 0 ? (
        <ul className="space-y-1 pl-1">
          {q.options.map((opt, i) => (
            <li key={i} className="text-sm text-slate-700">
              <span className="font-semibold text-rose-600">{String.fromCharCode(65 + i)}.</span> {opt}
            </li>
          ))}
        </ul>
      ) : null}
      {q.answer ? (
        <p className="rounded-md border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-emerald-800">
          <span className="font-semibold">Answer:</span> {q.answer}
        </p>
      ) : null}
      {q.marks != null ? (
        <p className="text-[11px] font-medium text-slate-500">Marks: {q.marks}</p>
      ) : null}
    </div>
  );
}

function buildBodySections(a: QuickAssignmentContent): ReactNode[] {
  return [
    <SectionCard
      key="2"
      sectionNum="Section 2"
      title="Learning Objectives"
      icon={Target}
      stripe="border-red-500"
      iconWrap="bg-red-100 text-red-800"
    >
      <BulletList items={a.learningObjectives} accent="text-red-500" />
    </SectionCard>,
    <SectionCard
      key="3"
      sectionNum="Section 3"
      title="Instructions to Students"
      icon={ClipboardList}
      stripe="border-orange-500"
      iconWrap="bg-orange-100 text-orange-800"
    >
      <div className="rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2">
        <RichTextBlock text={a.instructions} />
      </div>
    </SectionCard>,
    <SectionCard
      key="4"
      sectionNum="Section 4"
      title="Concept-based Questions"
      icon={FileQuestion}
      stripe="border-amber-500"
      iconWrap="bg-amber-100 text-amber-900"
    >
      {a.conceptQuestions.length > 0 ? (
        <div className="space-y-2">
          {a.conceptQuestions.map((q, i) => (
            <QuestionCard key={`q-${i}-${q.question.slice(0, 24)}`} q={q} index={i} />
          ))}
        </div>
      ) : (
        <EmptyHint label="Regenerate to add concept-based questions." />
      )}
    </SectionCard>,
    <SectionCard
      key="5"
      sectionNum="Section 5"
      title="Application-oriented Tasks"
      icon={Sparkles}
      stripe="border-yellow-500"
      iconWrap="bg-yellow-100 text-yellow-900"
    >
      <BulletList items={a.applicationTasks} accent="text-yellow-600" />
    </SectionCard>,
    <SectionCard
      key="6"
      sectionNum="Section 6"
      title="Real-life / Competency-based Activity"
      icon={FlaskConical}
      stripe="border-lime-500"
      iconWrap="bg-lime-100 text-lime-900"
    >
      <div className="rounded-lg border border-lime-100 bg-lime-50/50 px-3 py-2">
        <RichTextBlock text={a.realLifeActivity} />
      </div>
    </SectionCard>,
    <SectionCard
      key="7"
      sectionNum="Section 7"
      title="Creative Thinking Question"
      icon={Lightbulb}
      stripe="border-emerald-500"
      iconWrap="bg-emerald-100 text-emerald-800"
    >
      <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 px-3 py-2">
        <RichTextBlock text={a.creativeQuestion} />
      </div>
    </SectionCard>,
    <SectionCard
      key="8"
      sectionNum="Section 8"
      title="Collaborative / Discussion Task (if suitable)"
      icon={Users}
      stripe="border-teal-500"
      iconWrap="bg-teal-100 text-teal-800"
    >
      <div className="rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-2">
        <RichTextBlock text={a.collaborativeTask} />
      </div>
    </SectionCard>,
    <SectionCard
      key="9"
      sectionNum="Section 9"
      title="Challenge Question for Advanced Learners"
      icon={Rocket}
      stripe="border-cyan-500"
      iconWrap="bg-cyan-100 text-cyan-800"
    >
      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2">
        <RichTextBlock text={a.challengeQuestion} />
      </div>
    </SectionCard>,
    <SectionCard
      key="10"
      sectionNum="Section 10"
      title="Assessment Criteria / Rubric"
      icon={Scale}
      stripe="border-violet-500"
      iconWrap="bg-violet-100 text-violet-800"
    >
      <div className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
        <RichTextBlock text={a.assessmentRubric} />
      </div>
    </SectionCard>,
    <SectionCard
      key="11"
      sectionNum="Section 11"
      title="Expected Learning Outcomes"
      icon={MessageSquare}
      stripe="border-rose-600"
      iconWrap="bg-rose-100 text-rose-900"
    >
      <BulletList items={a.expectedOutcomes} accent="text-rose-600" />
    </SectionCard>,
  ];
}

export function QuickAssignmentViewer({ content, rawContent, className }: QuickAssignmentViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return quickAssignmentViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { assignment, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveQuickAssignmentFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderQuickAssignmentMarkdown(markdownFallback) }}
      />
    );
  }

  if (!assignment) {
    return <p className={cn('text-sm italic text-slate-500', className)}>No assignment to display.</p>;
  }

  const bodySections = buildBodySections(assignment);
  const filledSections = [
    assignment.learningObjectives.length,
    assignment.instructions,
    assignment.conceptQuestions.length,
    assignment.applicationTasks.length,
    assignment.realLifeActivity,
    assignment.creativeQuestion,
    assignment.collaborativeTask,
    assignment.challengeQuestion,
    assignment.assessmentRubric,
    assignment.expectedOutcomes.length,
  ].filter(Boolean).length;

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-rose-200/80 shadow-xl shadow-rose-200/25"
        style={{
          backgroundColor: '#fff1f2',
          backgroundImage: 'radial-gradient(circle, rgba(244,63,94,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-700 via-red-600 to-orange-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-100">
                Quick Assignment Builder
              </p>
              <h3 className="truncate text-lg font-bold">{assignment.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  11 sections
                </Badge>
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {filledSections} filled
                </Badge>
                {assignment.conceptQuestions.length > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {assignment.conceptQuestions.length} questions
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 p-1.5 sm:p-2">
          <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40" />
            <div className="relative p-2.5 sm:p-3">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-rose-100 text-rose-900 hover:bg-rose-100 text-xs">
                Assignment Title
              </Badge>
              <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{assignment.title}</h4>
            </div>
          </div>

          <div className="mt-0.5 flex flex-col gap-0.5">
            {bodySections.map((section) => (
              <div key={(section as { key?: string }).key} className="w-full min-w-0">
                {section}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
