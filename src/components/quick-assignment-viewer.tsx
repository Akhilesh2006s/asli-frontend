import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { ToolSectionIcon } from '@/components/ai-tool-3d-icons';
import { useMemo, useState, type ReactNode } from 'react';
import {
  ClipboardList,
  Eye,
  EyeOff,
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  quickAssignmentViewerPayloadFromRecord,
  resolveQuickAssignmentFromPayload,
  type AssignmentQuestion,
  type QuickAssignmentContent,
} from '@/lib/parse-quick-assignment';
import { renderQuickAssignmentMarkdown } from '@/lib/render-quick-assignment-markdown';
import { ExpandableText, SelfCheckList } from '@/components/ai-tool-interactive';

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

function QuestionCard({ q, index }: { q: AssignmentQuestion; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const num = displayQuestionSerial(index);
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50/30 px-3 py-2.5 space-y-2">
      <p className="text-base font-medium text-slate-900">
        <span className="mr-1.5 font-bold text-rose-700">Q{num}.</span>
        {q.question}
      </p>
      {q.options.length > 0 ? (
        <ul className="space-y-1 pl-1">
          {q.options.map((opt, i) => (
            <li key={i} className="text-base text-slate-700">
              <span className="font-semibold text-rose-600">{String.fromCharCode(65 + i)}.</span> {opt}
            </li>
          ))}
        </ul>
      ) : null}
      {q.answer ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-md border-rose-200 bg-white px-2 text-micro"
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
            {revealed ? 'Hide answer' : 'Reveal answer'}
          </Button>
          {revealed ? (
            <p className="mt-1.5 rounded-md border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs text-emerald-800">
              <span className="font-semibold">Answer:</span> {q.answer}
            </p>
          ) : null}
        </div>
      ) : null}
      {q.marks != null ? (
        <p className="text-mini font-medium text-slate-500">Marks: {q.marks}</p>
      ) : null}
    </div>
  );
}

function buildBodySections(a: QuickAssignmentContent): ReactNode[] {
  const defs: Array<{
    key: string;
    title: string;
    icon: LucideIcon;
    stripe?: string;
    iconWrap?: string;
    hasContent: boolean;
    body: ReactNode;
  }> = [
    {
      key: 'lo',
      title: 'Learning Objectives',
      icon: Target,
      stripe: 'border-red-500',
      iconWrap: 'bg-red-100 text-red-800',
      hasContent: a.learningObjectives.length > 0,
      body: <SelfCheckList items={a.learningObjectives} tone="rose" />,
    },
    {
      key: 'inst',
      title: 'Instructions to Students',
      icon: ClipboardList,
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      hasContent: !!a.instructions.trim(),
      body: (
        <div className="rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2">
          <ExpandableText text={a.instructions} />
        </div>
      ),
    },
    {
      key: 'concept',
      title: 'Concept-based Questions',
      icon: FileQuestion,
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-900',
      hasContent: a.conceptQuestions.length > 0,
      body: (
        <div className="space-y-2">
          {a.conceptQuestions.map((q, i) => (
            <QuestionCard key={`q-${i}-${q.question.slice(0, 24)}`} q={q} index={i} />
          ))}
        </div>
      ),
    },
    {
      key: 'app',
      title: 'Application-oriented Tasks',
      icon: Sparkles,
      stripe: 'border-yellow-500',
      iconWrap: 'bg-yellow-100 text-yellow-900',
      hasContent: a.applicationTasks.length > 0,
      body: <SelfCheckList items={a.applicationTasks} tone="amber" prompt="Tap each task once it's done" />,
    },
    {
      key: 'real',
      title: 'Real-life / Competency-based Activity',
      icon: FlaskConical,
      stripe: 'border-lime-500',
      iconWrap: 'bg-lime-100 text-lime-900',
      hasContent: !!a.realLifeActivity.trim(),
      body: (
        <div className="rounded-lg border border-lime-100 bg-lime-50/50 px-3 py-2">
          <ExpandableText text={a.realLifeActivity} />
        </div>
      ),
    },
    {
      key: 'creative',
      title: 'Creative Thinking Question',
      icon: Lightbulb,
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      hasContent: !!a.creativeQuestion.trim(),
      body: (
        <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 px-3 py-2">
          <ExpandableText text={a.creativeQuestion} />
        </div>
      ),
    },
    {
      key: 'collab',
      title: 'Collaborative / Discussion Task (if suitable)',
      icon: Users,
      stripe: 'border-teal-500',
      iconWrap: 'bg-teal-100 text-teal-800',
      hasContent: !!a.collaborativeTask.trim(),
      body: (
        <div className="rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-2">
          <ExpandableText text={a.collaborativeTask} />
        </div>
      ),
    },
    {
      key: 'challenge',
      title: 'Challenge Question for Advanced Learners',
      icon: Rocket,
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      hasContent: !!a.challengeQuestion.trim(),
      body: (
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2">
          <ExpandableText text={a.challengeQuestion} />
        </div>
      ),
    },
    {
      key: 'rubric',
      title: 'Assessment Criteria / Rubric',
      icon: Scale,
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      hasContent: !!a.assessmentRubric.trim(),
      body: (
        <div className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
          <ExpandableText text={a.assessmentRubric} />
        </div>
      ),
    },
    {
      key: 'outcomes',
      title: 'Expected Learning Outcomes',
      icon: MessageSquare,
      stripe: 'border-rose-600',
      iconWrap: 'bg-rose-100 text-rose-900',
      hasContent: a.expectedOutcomes.length > 0,
      body: <SelfCheckList items={a.expectedOutcomes} tone="rose" prompt="Tap each outcome you feel confident about" />,
    },
  ];

  return defs
    .filter((d) => d.hasContent)
    .map((d, i) => (
      <SectionCard
        key={d.key}
        sectionNum={`Section ${i + 2}`}
        title={d.title}
        icon={d.icon}
        stripe={d.stripe}
        iconWrap={d.iconWrap}
      >
        {d.body}
      </SectionCard>
    ));
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
    <div className={cn('w-full space-y-5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-rose-100 text-rose-900 hover:bg-rose-100 text-xs font-semibold">
          {filledSections} section{filledSections === 1 ? '' : 's'}
        </Badge>
        {assignment.conceptQuestions.length > 0 ? (
          <Badge className="border-0 bg-orange-100 text-orange-900 hover:bg-orange-100 text-xs font-semibold">
            {assignment.conceptQuestions.length} questions
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        {bodySections.map((section, i) => (
          <div key={(section as { key?: string }).key || `section-${i}`} className="w-full min-w-0">
            {section}
          </div>
        ))}
      </div>
    </div>
  );
}
