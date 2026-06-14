import { useMemo, type ReactNode } from 'react';
import { AiToolMockTestSectionLayout } from '@/lib/ai-tool-section-layout';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { renderMockTestMarkdown } from '@/lib/render-mock-test-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  extractInlineMcqFromQuestionText,
  formatLabeledMcqOptions,
  type ExamQuestion,
  type ExamSection,
} from '@/lib/parse-exam-question-paper';
import {
  mockTestViewerPayloadFromRecord,
  parseNumberedMarkdownSections,
  resolveMockTestFromPayload,
  synthesizeAnswerKeyFromSections,
  synthesizeSolutionsFromSections,
} from '@/lib/parse-mock-test';

export { mockTestViewerPayloadFromRecord };

interface MockTestViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function MockSectionCard({
  sectionNum,
  title,
  icon: Icon,
  stripe,
  iconWrap,
  children,
  className,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'h-fit w-full overflow-hidden rounded-xl border border-rose-200/90 bg-white shadow-sm',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 border-l-[4px] px-2.5 py-1.5', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-xs font-bold leading-tight text-stone-900">{title}</h4>
        </div>
      </div>
      <div className="px-2.5 pb-2 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyHint() {
  return (
    <p className="rounded-md border border-dashed border-rose-200 bg-rose-50/50 px-2 py-1 text-xs italic text-stone-400">
      Not included in this mock test.
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <EmptyHint />;
  return (
    <ul className="space-y-1">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <span className="shrink-0 text-rose-500">•</span>
          <span className="whitespace-pre-wrap">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function RichTextBlock({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return <EmptyHint />;
  const hasMarkdown =
    text.includes('|') ||
    /^\s*#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /^\s*[-*•]\s/m.test(text) ||
    /^\s*\d+\.\s/m.test(text);
  if (hasMarkdown) {
    return (
      <div
        className={cn(
          'prose prose-sm max-w-none text-slate-800',
          'prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-amber-200 prose-th:bg-amber-50/90 prose-th:px-2 prose-th:py-1.5 prose-th:text-left prose-th:text-xs prose-th:font-semibold',
          'prose-td:border prose-td:border-amber-100 prose-td:px-2 prose-td:py-1.5 prose-td:text-xs prose-td:align-top',
          'prose-ol:my-1 prose-ul:my-1 prose-li:text-sm',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>;
}

function QuestionCard({
  question,
  index,
  showAnswer,
}: {
  question: ExamQuestion;
  index: number;
  showAnswer: boolean;
}) {
  const qNo = String(displayQuestionSerial(index));
  const inline =
    question.options.length < 2 ? extractInlineMcqFromQuestionText(question.question) : null;
  const questionText =
    inline && inline.options.length >= 2 ? inline.question : question.question;
  const displayOptions =
    question.options.length >= 2
      ? formatLabeledMcqOptions(question.options)
      : inline && inline.options.length >= 2
        ? inline.options
        : question.options;
  return (
    <article className="rounded-lg border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          <span className="mr-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-rose-600 px-1 text-[10px] font-bold text-white">
            {qNo}
          </span>
          {questionText}
        </p>
        {question.marks != null ? (
          <Badge className="shrink-0 border-0 bg-rose-100 text-rose-800 hover:bg-rose-100">
            {question.marks} m
          </Badge>
        ) : null}
      </div>
      {displayOptions.length > 0 ? (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {displayOptions.map((opt, i) => {
            const label = opt.match(/^([A-D])\)/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + i);
            const text = opt.replace(/^[A-D]\)\s*/i, '').trim();
            return (
              <li
                key={`${opt}-${i}`}
                className="flex gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-800">
                  {label}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">{text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {showAnswer && question.answer ? (
        <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
          <span className="font-semibold">Answer:</span> {question.answer}
        </p>
      ) : null}
      {question.internalChoiceGroup ? (
        <p className="mt-1.5 text-[11px] text-indigo-700">
          <span className="font-semibold">OR / Choice:</span> {question.internalChoiceGroup}
        </p>
      ) : null}
    </article>
  );
}

function ExamSectionBlock({ section, showAnswers }: { section: ExamSection; showAnswers: boolean }) {
  return (
    <div className="rounded-xl border border-rose-200/80 bg-white/90 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-rose-100 pb-2">
        <h5 className="text-sm font-bold text-rose-900">{section.title}</h5>
        <Badge variant="outline" className="border-rose-200 text-rose-700">
          {section.questions.length} Q
        </Badge>
      </div>
      {section.questions.length > 0 ? (
        <div className="space-y-2">
          {section.questions.map((q, idx) => (
            <QuestionCard key={`${section.id}-${idx}`} question={q} index={idx} showAnswer={showAnswers} />
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-stone-400">No questions in this section.</p>
      )}
    </div>
  );
}

export function MockTestViewer({ content, rawContent, className }: MockTestViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) {
      return { content: String(content || '').trim(), rawContent };
    }
    return mockTestViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const parsed = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveMockTestFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  const { meta: rawMeta, paper, markdownFallback } = parsed;

  const meta = useMemo(() => {
    const activeSections = paper?.sections.filter((s) => s.questions.length > 0) ?? [];
    let answerKey = rawMeta.answerKey;
    let solutions = rawMeta.solutions;
    if (!answerKey.trim() && activeSections.length) {
      answerKey = synthesizeAnswerKeyFromSections(activeSections);
    }
    if (!solutions.trim() && activeSections.length) {
      solutions = synthesizeSolutionsFromSections(activeSections);
    }
    return { ...rawMeta, answerKey, solutions };
  }, [rawMeta, paper?.sections]);

  const questionPaperMarkdown = useMemo(() => {
    const numbered = parseNumberedMarkdownSections(payload.content);
    return numbered.get(6) || '';
  }, [payload.content]);

  if (markdownFallback && !paper) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderMockTestMarkdown(markdownFallback) }}
      />
    );
  }

  const totalQuestions = paper?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  const totalMarks =
    paper?.sections.reduce(
      (n, s) => n + s.questions.reduce((m, q) => m + (q.marks != null ? q.marks : 0), 0),
      0,
    ) ?? 0;
  const activeSections = paper?.sections.filter((s) => s.questions.length > 0) ?? [];

  const bodySections = [
    <MockSectionCard
      key="2"
      sectionNum="Section 2"
      title="Test Purpose and Subtopic Link"
      icon={Target}
      stripe="border-amber-500"
      iconWrap="bg-amber-100 text-amber-800"
    >
      <RichTextBlock text={meta.testPurpose} />
    </MockSectionCard>,
    <MockSectionCard
      key="3"
      sectionNum="Section 3"
      title="Learning Objectives – Bloom's Taxonomy"
      icon={Brain}
      stripe="border-violet-500"
      iconWrap="bg-violet-100 text-violet-800"
    >
      <BulletList items={meta.learningObjectives} />
    </MockSectionCard>,
    <MockSectionCard
      key="4"
      sectionNum="Section 4"
      title="NCF Competency / Learning Outcome Alignment"
      icon={GraduationCap}
      stripe="border-cyan-500"
      iconWrap="bg-cyan-100 text-cyan-800"
    >
      <RichTextBlock text={meta.ncfAlignment} />
    </MockSectionCard>,
    <MockSectionCard
      key="5"
      sectionNum="Section 5"
      title="Instructions for Students"
      icon={ClipboardList}
      stripe="border-slate-500"
      iconWrap="bg-slate-100 text-slate-800"
    >
      <RichTextBlock text={meta.instructions} />
    </MockSectionCard>,
    <MockSectionCard
      key="6"
      sectionNum="Section 6"
      title="Question Paper"
      icon={FileQuestion}
      stripe="border-rose-600"
      iconWrap="bg-rose-100 text-rose-800"
      className="sm:col-span-2"
    >
      {activeSections.length > 0 ? (
        <div className="space-y-3">
          {activeSections.map((sec) => (
            <ExamSectionBlock key={sec.id} section={sec} showAnswers={false} />
          ))}
        </div>
      ) : questionPaperMarkdown ? (
        <div
          className="rounded-lg border border-rose-100 bg-rose-50/30 p-1"
          dangerouslySetInnerHTML={{
            __html: renderMockTestMarkdown(`## 6. Question Paper\n\n${questionPaperMarkdown}`),
          }}
        />
      ) : (
        <EmptyHint />
      )}
    </MockSectionCard>,
    <MockSectionCard
      key="7"
      sectionNum="Section 7"
      title="Answer Key"
      icon={CheckCircle2}
      stripe="border-emerald-500"
      iconWrap="bg-emerald-100 text-emerald-800"
    >
      <RichTextBlock text={meta.answerKey} />
    </MockSectionCard>,
    <MockSectionCard
      key="8"
      sectionNum="Section 8"
      title="Step-by-step Solutions / Explanations"
      icon={BookOpen}
      stripe="border-sky-500"
      iconWrap="bg-sky-100 text-sky-800"
    >
      <RichTextBlock text={meta.solutions} />
    </MockSectionCard>,
    <MockSectionCard
      key="9"
      sectionNum="Section 9"
      title="Remedial Revision Suggestions"
      icon={ListChecks}
      stripe="border-orange-500"
      iconWrap="bg-orange-100 text-orange-800"
    >
      <BulletList items={meta.remedial} />
    </MockSectionCard>,
    <MockSectionCard
      key="10"
      sectionNum="Section 10"
      title="Expected Learning Outcomes"
      icon={Sparkles}
      stripe="border-teal-500"
      iconWrap="bg-teal-100 text-teal-800"
    >
      <BulletList items={meta.outcomes} />
    </MockSectionCard>,
    <MockSectionCard
      key="11"
      sectionNum="Section 11"
      title="Real-life Application"
      icon={Lightbulb}
      stripe="border-lime-600"
      iconWrap="bg-lime-100 text-lime-900"
    >
      <RichTextBlock text={meta.realLife} />
    </MockSectionCard>,
    <MockSectionCard
      key="12"
      sectionNum="Section 12"
      title="Reflection / Exit Ticket"
      icon={MessageCircle}
      stripe="border-slate-600"
      iconWrap="bg-slate-100 text-slate-800"
    >
      <RichTextBlock text={meta.reflection} />
    </MockSectionCard>,
  ];

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-rose-200/80 shadow-xl shadow-rose-200/20"
        style={{
          backgroundColor: '#fff1f2',
          backgroundImage: 'radial-gradient(circle, rgba(244,63,94,0.1) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-rose-100 bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <FileQuestion className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-100">
                Mock Test Builder
              </p>
              <h3 className="truncate text-lg font-bold">{meta.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {totalQuestions} questions
                </Badge>
                {totalMarks > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {totalMarks} marks
                  </Badge>
                ) : null}
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {activeSections.length} sections
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 p-2 sm:p-3">
          <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/90 via-white to-red-50/40" />
            <div className="relative p-2.5 sm:p-3">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-rose-100 text-rose-900 hover:bg-rose-100 text-xs">
                Mock Test
              </Badge>
              <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{meta.title}</h4>
            </div>
          </div>

          <AiToolMockTestSectionLayout>{bodySections}</AiToolMockTestSectionLayout>
        </div>
      </div>
    </div>
  );
}
