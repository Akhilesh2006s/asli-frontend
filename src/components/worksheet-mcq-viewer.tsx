import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import {
  AiToolV2InsightTail,
  parseBloomLevelsFromText,
} from '@/components/ai-v2';
import { useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  ListChecks,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  countWorksheetQuestions,
  resolveWorksheetFromPayload,
  worksheetHasVisibleContent,
  type NormalizedWorksheet,
  type WorksheetQuestion,
} from '@/lib/parse-worksheet-mcq';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { StructuredContentRequired } from '@/components/structured-content-required';

export interface WorksheetMcqViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
  variant?: 'default' | 'student' | 'teacher';
}

const WORKSHEET_FLOW_PHASES = [
  {
    id: 'setup',
    label: 'Worksheet setup',
    hint: 'Title, objectives & student instructions',
    dotClass: 'bg-emerald-600 ring-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-200',
  },
  {
    id: 'practice',
    label: 'Question sections',
    hint: 'MCQs, blanks, short answers & application',
    dotClass: 'bg-teal-600 ring-teal-200',
    badgeClass: 'bg-teal-100 text-teal-950 border-teal-200',
  },
  {
    id: 'scoring',
    label: 'Scoring & tags',
    hint: 'Answer key, Bloom level & difficulty',
    dotClass: 'bg-sky-600 ring-sky-200',
    badgeClass: 'bg-sky-100 text-sky-950 border-sky-200',
  },
] as const;

function QuestionCard({ q, index }: { q: WorksheetQuestion; index: number }) {
  const num = displayQuestionSerial(index);
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white">
            {num}
          </span>
          <p className="text-sm font-medium text-slate-900 leading-relaxed pt-0.5">{q.question}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {q.type ? (
            <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
              {q.type}
            </Badge>
          ) : null}
          {q.marks != null ? (
            <Badge className="text-[10px] bg-amber-100 text-amber-900 border-0 hover:bg-amber-100">
              {q.marks} mark{q.marks === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>
      </div>
      {q.options.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-400 text-[10px] font-bold text-slate-600">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="leading-snug">{opt.replace(/^[A-D][\).]\s*/i, '')}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {q.answer ? (
        <p className="text-xs text-emerald-800 flex items-start gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
          <CircleCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            <span className="font-semibold">Answer:</span> {q.answer}
          </span>
        </p>
      ) : null}
      {q.explanation ? (
        <p className="text-xs text-slate-600 rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
          <span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}
        </p>
      ) : null}
    </div>
  );
}

function WorksheetTimelineStep({
  stepNum,
  title,
  icon: Icon,
  children,
}: {
  stepNum: number | string;
  title: string;
  icon: typeof Target;
  dotClass?: string;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <AiToolStackedSection num={String(stepNum)} title={title} icon={Icon}>
      {children}
    </AiToolStackedSection>
  );
}

type TimelineBlock = {
  phaseId: (typeof WORKSHEET_FLOW_PHASES)[number]['id'];
  stepNum: number | string;
  title: string;
  icon: typeof Target;
  content: ReactNode;
};

function toSortableStep(stepNum: number | string): number {
  if (typeof stepNum === 'number' && Number.isFinite(stepNum)) return stepNum;
  const parsed = Number(String(stepNum).trim());
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function buildTimelineBlocks(worksheet: NormalizedWorksheet): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  if (worksheet.title && !/^worksheet$/i.test(worksheet.title.trim())) {
    blocks.push({
      phaseId: 'setup',
      stepNum: 1,
      title: 'Worksheet title',
      icon: ClipboardList,
      content: <p className="font-medium text-slate-900">{worksheet.title}</p>,
    });
  }

  if (worksheet.learningObjectives.length > 0) {
    blocks.push({
      phaseId: 'setup',
      stepNum: 2,
      title: 'Learning objectives',
      icon: Target,
      content: (
        <ul className="space-y-2">
          {worksheet.learningObjectives.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (worksheet.instructions) {
    blocks.push({
      phaseId: 'setup',
      stepNum: 3,
      title: 'Instructions to students',
      icon: BookOpen,
      content: <p className="whitespace-pre-wrap">{worksheet.instructions}</p>,
    });
  }

  const sortedSections = [...worksheet.sections]
    .sort((a, b) => a.order - b.order)
    .filter((sec) => sec.questions.length > 0);
  for (const sec of sortedSections) {
    blocks.push({
      phaseId: 'practice',
      stepNum: sec.order,
      title: sec.label,
      icon: FileQuestion,
      content: (
        <div className="space-y-3">
          {sec.questions.map((q, i) => (
            <QuestionCard key={`${sec.id}-q-${i}`} q={q} index={i} />
          ))}
        </div>
      ),
    });
  }

  if (worksheet.answerKey) {
    blocks.push({
      phaseId: 'scoring',
      stepNum: 9,
      title: 'Answer key',
      icon: CheckCircle2,
      content: (
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
          {worksheet.answerKey}
        </pre>
      ),
    });
  }

  const tags = [worksheet.bloomLevel, worksheet.difficultyTag].filter(Boolean).join(' — ');
  if (tags) {
    blocks.push({
      phaseId: 'scoring',
      stepNum: 10,
      title: "Bloom's level & difficulty",
      icon: GraduationCap,
      content: <p className="whitespace-pre-wrap">{tags}</p>,
    });
  }

  return blocks;
}

function countFilledBlocks(worksheet: NormalizedWorksheet): number {
  let n = 0;
  if (worksheet.learningObjectives.length) n += 1;
  if (worksheet.instructions) n += 1;
  n += worksheet.sections.filter((s) => s.questions.length > 0).length;
  if (worksheet.answerKey) n += 1;
  if (worksheet.bloomLevel || worksheet.difficultyTag) n += 1;
  return n;
}

function TeacherWorksheetCard({
  worksheet,
  rawContent,
}: {
  worksheet: NormalizedWorksheet;
  rawContent?: unknown;
}) {
  const totalQuestions = countWorksheetQuestions(worksheet);
  const filledBlocks = countFilledBlocks(worksheet);
  const totalBlocks = 10;
  const progressPct = Math.round((filledBlocks / totalBlocks) * 100);
  const timelineBlocks = buildTimelineBlocks(worksheet);
  let visibleStep = 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border-2 border-dashed border-emerald-300/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/80 mb-1">
              Worksheet · Ready to print
            </p>
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight font-serif">
              {worksheet.title}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="rounded border-emerald-200 bg-emerald-100/80 text-emerald-950 hover:bg-emerald-100/80 font-medium">
                {totalQuestions} question{totalQuestions === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline" className="rounded border-teal-200 text-teal-800 text-[10px]">
                10-section template
              </Badge>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-36">
            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Pack ready</p>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 text-right">
              {filledBlocks} block{filledBlocks === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {WORKSHEET_FLOW_PHASES.map((phase) => {
        const phaseBlocks = timelineBlocks
          .filter((b) => b.phaseId === phase.id)
          .sort((a, b) => toSortableStep(a.stepNum) - toSortableStep(b.stepNum));
        if (!phaseBlocks.length) return null;

        return (
          <section key={phase.id} aria-label={phase.label}>
            <div
              className={cn(
                'mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
                phase.badgeClass,
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', phase.dotClass.split(' ')[0])} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">{phase.label}</p>
                <p className="text-[11px] opacity-80">{phase.hint}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {phaseBlocks.map((block, idx) => {
                visibleStep += 1;
                return (
                  <WorksheetTimelineStep
                    key={`${phase.id}-${block.stepNum}`}
                    stepNum={visibleStep}
                    title={block.title}
                    icon={block.icon}
                    dotClass={phase.dotClass}
                    isLast={idx === phaseBlocks.length - 1}
                  >
                    {block.content}
                  </WorksheetTimelineStep>
                );
              })}
            </div>
          </section>
        );
      })}

      <AiToolV2InsightTail
        rawContent={rawContent}
        startNum={timelineBlocks.length + 1}
        includeOverview
        overviewStats={[
          { label: 'Questions', value: String(totalQuestions) },
          { label: 'Sections', value: String(worksheet.sections.filter((s) => s.questions.length > 0).length) },
          { label: 'Bloom level', value: worksheet.bloomLevel },
          { label: 'Difficulty', value: worksheet.difficultyTag },
        ].filter((s) => s.value)}
        bloomFromObjectives={[
          ...worksheet.learningObjectives,
          ...(worksheet.bloomLevel ? [worksheet.bloomLevel] : []),
        ]}
        bloomRows={parseBloomLevelsFromText([
          ...worksheet.learningObjectives,
          ...(worksheet.bloomLevel ? [worksheet.bloomLevel] : []),
        ])}
        competencyItems={worksheet.learningObjectives}
        bestPracticesText="Print the worksheet for class practice or assign digitally. Walk through objectives first, let students attempt sections A–E independently, then review using the answer key and Bloom/difficulty tags for remediation groups."
      />
    </div>
  );
}

function TeacherMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div
      className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-sm prose-headings:font-serif prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}

function TeacherWorksheetShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200/80 shadow-lg shadow-emerald-900/5">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '100% 28px',
            backgroundPosition: '0 72px',
          }}
          aria-hidden
        />
        <div className="relative border-b border-slate-700/20 bg-gradient-to-br from-slate-800 via-teal-900 to-emerald-900 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/90 text-slate-900 shadow-md rotate-[-2deg]">
                <ClipboardList className="h-6 w-6" aria-hidden />
              </div>
              <div className="text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-200/90">
                  Worksheet &amp; MCQ Generator
                </p>
                <h3 className="text-lg font-bold sm:text-xl font-serif">Your worksheet pack</h3>
                <p className="text-xs text-emerald-100/85 mt-0.5">Sections A–E, answer key &amp; tags</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Teacher view
            </span>
          </div>
        </div>
        <div className="relative bg-[#f8fffb]/95 p-3 sm:p-5 max-h-[min(80vh,900px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function WorksheetMcqViewer({
  content,
  rawContent,
  className,
  variant = 'default',
}: WorksheetMcqViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveWorksheetFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  const useTeacher = variant === 'teacher' || variant === 'default';

  if (!resolved.worksheet || !worksheetHasVisibleContent(resolved.worksheet)) {
    return <StructuredContentRequired className={className} toolLabel="Worksheet & MCQ" />;
  }

  const worksheet = resolved.worksheet;

  if (!useTeacher) {
    return (
      <div className={cn('w-full', className)}>
        <TeacherWorksheetCard worksheet={worksheet} rawContent={rawContent} />
      </div>
    );
  }

  return (
    <div className={className}>
      <TeacherWorksheetShell>
        <AnimatePresence mode="wait">
          <motion.div
            key={worksheet.title}
            className="h-fit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TeacherWorksheetCard worksheet={worksheet} rawContent={rawContent} />
          </motion.div>
        </AnimatePresence>
      </TeacherWorksheetShell>
    </div>
  );
}
