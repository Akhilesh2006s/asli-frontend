import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { RealisticIcon, type AiTool3dIconName } from '@/components/ai-tool-3d-icons';
import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { cn } from '@/lib/utils';
import { displayQuestionSerial } from '@/lib/renumber-questions';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  examPaperHasVisibleContent,
  resolveExamPaperFromPayload,
  type ExamQuestion,
} from '@/lib/parse-exam-question-paper';
import { AiToolInfoPanelGrid } from '@/lib/ai-tool-section-layout';

type MockTestMeta = {
  mockTestTitle: string;
  testPurposeSubtopicLink: string;
  learningObjectives: string[];
  ncfCompetencyAlignment: string;
  stepByStepSolutionsExplanations: string;
  remedialRevisionSuggestions: string[];
  expectedLearningOutcomes: string[];
  realLifeApplication: string;
  reflectionExitTicket: string;
};

interface ExamQuestionPaperViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
  /** Student Mock Test Builder (12-section) vs teacher Exam Question Paper (11-section). */
  variant?: 'student' | 'teacher';
}

function extractMockTestMeta(rawContent?: unknown): MockTestMeta | null {
  const pick = (obj: Record<string, unknown> | undefined) => obj || {};
  const candidates: Record<string, unknown>[] = [];
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    candidates.push(rawContent as Record<string, unknown>);
    const render = (rawContent as Record<string, unknown>).renderContent;
    if (render && typeof render === 'object') candidates.push(render as Record<string, unknown>);
  }
  for (const c of candidates) {
    const title = String(c.mockTestTitle || c.mock_test_title || c.paperTitle || c.paper_title || '').trim();
    if (!title && !c.testPurposeSubtopicLink && !c.test_purpose_subtopic_link) continue;
    const toList = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => String(x || '').trim()).filter(Boolean) : [];
    return {
      mockTestTitle: title || 'Mock Test',
      testPurposeSubtopicLink: String(
        c.testPurposeSubtopicLink || c.test_purpose_subtopic_link || '',
      ).trim(),
      learningObjectives: toList(c.learningObjectives || c.learning_objectives),
      ncfCompetencyAlignment: String(
        c.ncfCompetencyAlignment || c.ncf_competency_alignment || '',
      ).trim(),
      stepByStepSolutionsExplanations: String(
        c.stepByStepSolutionsExplanations || c.step_by_step_solutions_explanations || '',
      ).trim(),
      remedialRevisionSuggestions: toList(
        c.remedialRevisionSuggestions || c.remedial_revision_suggestions,
      ),
      expectedLearningOutcomes: toList(c.expectedLearningOutcomes || c.expected_learning_outcomes),
      realLifeApplication: String(c.realLifeApplication || c.real_life_application || '').trim(),
      reflectionExitTicket: String(
        c.reflectionExitTicket || c.reflection_exit_ticket || '',
      ).trim(),
    };
  }
  return null;
}

function QuestionCard({ question, index }: { question: ExamQuestion; index: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <RealisticIcon name="quiz" alt="" className="mt-0.5 h-7 w-7 shrink-0" />
          <p className="text-sm font-semibold text-slate-900">
            Q{displayQuestionSerial(index)}. {question.question}
          </p>
        </div>
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

function InfoPanel({
  title,
  value,
  className,
  icon = 'document',
  sectionNum = '1',
}: {
  title: string;
  value: string;
  className?: string;
  icon?: AiTool3dIconName;
  sectionNum?: string;
}) {
  if (!value) return null;
  return (
    <AiToolStackedSection num={sectionNum} title={title} iconName={icon} className={className}>
      <p className="whitespace-pre-wrap text-sm text-slate-700">{value}</p>
    </AiToolStackedSection>
  );
}

export function ExamQuestionPaperViewer({
  content,
  rawContent,
  className,
  variant = 'teacher',
}: ExamQuestionPaperViewerProps) {
  const mockMeta = variant === 'student' ? extractMockTestMeta(rawContent) : null;
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
        <div className="flex items-start gap-3">
          <RealisticIcon
            name={variant === 'student' ? 'medal' : 'document'}
            alt=""
            className="h-12 w-12 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-200">
              {variant === 'student' ? 'Mock Test Builder' : 'Exam Question Paper Generator'}
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {mockMeta?.mockTestTitle ||
                paper.paperTitle ||
                (variant === 'student' ? 'Mock Test' : 'Exam Question Paper')}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-white/15 text-white hover:bg-white/15">
                {totalQuestions} Questions
              </Badge>
              <Badge className="bg-white/15 text-white hover:bg-white/15">
                {totalMarks || '-'} Total Marks
              </Badge>
              <Badge className="bg-white/15 text-white hover:bg-white/15">
                {paper.sections.length} Sections
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {variant === 'student' && mockMeta ? (
        <AiToolInfoPanelGrid>
          <InfoPanel title="Test Purpose and Subtopic Link" value={mockMeta.testPurposeSubtopicLink} className="border-indigo-100 bg-indigo-50/40" />
          <InfoPanel
            title="Learning Objectives – Bloom's"
            value={mockMeta.learningObjectives.join('\n')}
            className="border-violet-100 bg-violet-50/40"
          />
          <InfoPanel title="NCF Competency / Learning Outcome" value={mockMeta.ncfCompetencyAlignment} className="border-cyan-100 bg-cyan-50/40" />
          <InfoPanel title="Instructions for Students" value={paper.instructions} className="border-slate-200 bg-slate-50/80" />
        </AiToolInfoPanelGrid>
      ) : (
        <AiToolInfoPanelGrid>
          <InfoPanel title="General Instructions" value={paper.instructions} className="border-indigo-100 bg-indigo-50/40" />
          <InfoPanel title="Blueprint / Design Grid" value={paper.blueprint} className="border-cyan-100 bg-cyan-50/40" />
        </AiToolInfoPanelGrid>
      )}

      <div className="space-y-4">
        {paper.sections.map((section, sectionIndex) => (
          <AiToolStackedSection
            key={section.id}
            num={String(sectionIndex + 1)}
            title={section.title}
            iconName="clipboard"
          >
            <div className="mb-3">
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
          </AiToolStackedSection>
        ))}
      </div>

      {variant === 'student' && mockMeta ? (
        <AiToolInfoPanelGrid>
          <InfoPanel title="Answer Key" value={paper.answerKey} className="border-emerald-100 bg-emerald-50/40" />
          <InfoPanel
            title="Step-by-step Solutions / Explanations"
            value={mockMeta.stepByStepSolutionsExplanations}
            className="border-sky-100 bg-sky-50/40"
          />
          <InfoPanel
            title="Remedial Revision Suggestions"
            value={mockMeta.remedialRevisionSuggestions.join('\n')}
            className="border-orange-100 bg-orange-50/40"
          />
          <InfoPanel
            title="Expected Learning Outcomes"
            value={mockMeta.expectedLearningOutcomes.join('\n')}
            className="border-teal-100 bg-teal-50/40"
          />
          <InfoPanel title="Real-life Application" value={mockMeta.realLifeApplication} className="border-lime-100 bg-lime-50/40" />
          <InfoPanel title="Reflection / Exit Ticket" value={mockMeta.reflectionExitTicket} className="border-rose-100 bg-rose-50/40" />
        </AiToolInfoPanelGrid>
      ) : (
        <>
          <AiToolInfoPanelGrid columns={3}>
            <InfoPanel title="Internal Choices" value={paper.internalChoices} className="border-violet-100 bg-violet-50/40" />
            <InfoPanel title="Answer Key" value={paper.answerKey} className="border-emerald-100 bg-emerald-50/40" />
            <InfoPanel title="Marking Scheme" value={paper.markingScheme} className="border-amber-100 bg-amber-50/40" />
          </AiToolInfoPanelGrid>
          <InfoPanel
            title="Rubric for Open-ended Questions"
            value={paper.openEndedRubric}
            className="border-rose-100 bg-rose-50/40"
          />
        </>
      )}
    </div>
  );
}

