import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  examPaperHasVisibleContent,
  resolveExamPaperFromPayload,
  type ExamQuestion,
} from '@/lib/parse-exam-question-paper';

interface ExamQuestionPaperViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function QuestionCard({ question, index }: { question: ExamQuestion; index: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Q{question.questionNumber || index + 1}. {question.question}
        </p>
        {question.marks != null ? (
          <Badge className="bg-slate-900 text-white hover:bg-slate-900">{question.marks} marks</Badge>
        ) : null}
      </div>

      {question.options.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, optIndex) => (
            <li
              key={`${option}-${optIndex}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {option}
            </li>
          ))}
        </ul>
      ) : null}

      {question.answer ? (
        <p className="mt-3 text-xs text-emerald-700">
          <span className="font-semibold">Answer:</span> {question.answer}
        </p>
      ) : null}

      {question.internalChoiceGroup ? (
        <p className="mt-2 text-xs text-indigo-700">
          <span className="font-semibold">Internal Choice:</span> {question.internalChoiceGroup}
        </p>
      ) : null}
    </article>
  );
}

function InfoPanel({ title, value, className }: { title: string; value: string; className?: string }) {
  if (!value) return null;
  return (
    <section className={cn('rounded-xl border p-4', className)}>
      <h4 className="mb-2 text-sm font-semibold text-slate-900">{title}</h4>
      <p className="whitespace-pre-wrap text-sm text-slate-700">{value}</p>
    </section>
  );
}

export function ExamQuestionPaperViewer({ content, rawContent, className }: ExamQuestionPaperViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveExamPaperFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  const paper = resolved.paper;
  const useMarkdown = !paper || !examPaperHasVisibleContent(paper);

  if (useMarkdown && resolved.markdownFallback) {
    return (
      <div className={className}>
        <div
          className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(resolved.markdownFallback) }}
        />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className={cn('rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center', className)}>
        <p className="text-sm font-medium text-slate-700">No exam paper content found.</p>
      </div>
    );
  }

  const totalQuestions = paper.sections.reduce((sum, sec) => sum + sec.questions.length, 0);
  const totalMarks = paper.sections.reduce(
    (sum, sec) =>
      sum +
      sec.questions.reduce((sectionSum, q) => sectionSum + (q.marks != null ? q.marks : 0), 0),
    0,
  );

  return (
    <div className={cn('space-y-4', className)}>
      <header className="overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 p-5 text-white shadow-lg">
        <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-200">Assessment Studio</p>
        <h2 className="mt-1 text-xl font-bold">{paper.paperTitle || 'Exam Question Paper'}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-white/15 text-white hover:bg-white/15">{totalQuestions} Questions</Badge>
          <Badge className="bg-white/15 text-white hover:bg-white/15">{totalMarks || '-'} Total Marks</Badge>
          <Badge className="bg-white/15 text-white hover:bg-white/15">{paper.sections.length} Sections</Badge>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoPanel title="General Instructions" value={paper.instructions} className="border-indigo-100 bg-indigo-50/40" />
        <InfoPanel title="Blueprint / Design Grid" value={paper.blueprint} className="border-cyan-100 bg-cyan-50/40" />
      </div>

      <div className="space-y-4">
        {paper.sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
              <Badge variant="outline" className="border-slate-300 text-slate-700">
                {section.questions.length} Questions
              </Badge>
            </div>
            {section.questions.length > 0 ? (
              <div className="space-y-3">
                {section.questions.map((question, idx) => (
                  <QuestionCard key={`${section.id}-${idx}`} question={question} index={idx} />
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No questions available in this section.</p>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoPanel title="Internal Choices" value={paper.internalChoices} className="border-violet-100 bg-violet-50/40" />
        <InfoPanel title="Answer Key" value={paper.answerKey} className="border-emerald-100 bg-emerald-50/40" />
        <InfoPanel title="Marking Scheme" value={paper.markingScheme} className="border-amber-100 bg-amber-50/40" />
      </div>
      <InfoPanel
        title="Rubric for Open-ended Questions"
        value={paper.openEndedRubric}
        className="border-rose-100 bg-rose-50/40"
      />
    </div>
  );
}

