import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { ToolSectionIcon } from '@/components/ai-tool-3d-icons';
import { useMemo, type ReactNode } from 'react';
import {
  BookOpen,
  FileQuestion,
  GitBranch,
  Lightbulb,
  ListChecks,
  Sigma,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  chapterSummaryViewerPayloadFromRecord,
  resolveChapterSummaryFromPayload,
  type ChapterSummaryContent,
} from '@/lib/parse-chapter-summary';
import { renderChapterSummaryMarkdown } from '@/lib/render-chapter-summary-markdown';

export { chapterSummaryViewerPayloadFromRecord };

interface ChapterSummaryViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function SectionCard({
  sectionNum,
  title,
  icon: Icon,
  children,
  className,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe?: string;
  iconWrap?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AiToolStackedSection num={sectionNum} title={title} icon={Icon} className={className}>
      {children}
    </AiToolStackedSection>
  );
}

function RichTextBlock({ text }: { text: string }) {
  if (!text.trim()) return null;
  const hasMarkdown =
    text.includes('|') ||
    /^\s*#{1,6}\s/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /^\s*[-*•]\s/m.test(text);
  if (hasMarkdown) {
    return (
      <div
        className="prose prose-base max-w-none text-slate-800 prose-li:text-base"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">{text}</p>;
}

function BulletList({ items, accent = 'text-blue-500' }: { items: string[]; accent?: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-base text-slate-800">
          <span className={cn('mt-0.5 shrink-0', accent)}>•</span>
          <span className="whitespace-pre-wrap leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function buildBodySections(summary: ChapterSummaryContent): ReactNode[] {
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
      key: 'overview',
      title: 'Overview of the Chapter',
      icon: BookOpen,
      stripe: 'border-sky-500',
      iconWrap: 'bg-sky-100 text-sky-800',
      hasContent: !!summary.chapterOverview.trim(),
      body: <RichTextBlock text={summary.chapterOverview} />,
    },
    {
      key: 'objectives',
      title: 'Learning Objectives',
      icon: Target,
      stripe: 'border-indigo-500',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      hasContent: summary.learningObjectives.length > 0,
      body: <BulletList items={summary.learningObjectives} accent="text-indigo-500" />,
    },
    {
      key: 'concepts',
      title: 'Important Concepts and Explanations',
      icon: Sparkles,
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      hasContent: summary.importantConcepts.length > 0,
      body: (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {summary.importantConcepts.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="rounded-lg border border-violet-100 bg-violet-50/30 px-3 py-2"
            >
              <p className="text-base font-semibold text-violet-900">{c.name}</p>
              {c.explanation ? (
                <p className="mt-1 text-base leading-relaxed text-slate-700">{c.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'definitions',
      title: 'Key Definitions and Terms',
      icon: ListChecks,
      stripe: 'border-purple-500',
      iconWrap: 'bg-purple-100 text-purple-800',
      hasContent: summary.definitions.length > 0,
      body: (
        <div className="space-y-2">
          {summary.definitions.map((d, i) => (
            <div key={`def-${i}`} className="rounded-md border border-purple-100 bg-purple-50/50 px-3 py-2">
              <span className="text-base font-semibold text-purple-900">{d.term}</span>
              {d.definition ? <span className="text-base text-slate-700"> — {d.definition}</span> : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'formulae',
      title: 'Formulae / Rules / Important Facts',
      icon: Sigma,
      stripe: 'border-fuchsia-500',
      iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
      hasContent: summary.formulae.length > 0,
      body: (
        <div className="space-y-2">
          {summary.formulae.map((f, i) => (
            <div
              key={`fm-${i}`}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-base text-slate-800"
            >
              {f.name ? <span className="font-sans font-semibold text-slate-900">{f.name}: </span> : null}
              {f.formula}
              {f.note ? <p className="mt-1 font-sans text-xs text-slate-500">{f.note}</p> : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'connections',
      title: 'Concept Connections',
      icon: GitBranch,
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      hasContent: !!summary.conceptConnections.trim(),
      body: <RichTextBlock text={summary.conceptConnections} />,
    },
    {
      key: 'realLife',
      title: 'Real-life Applications',
      icon: Lightbulb,
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      hasContent: summary.realLifeApplications.length > 0,
      body: <BulletList items={summary.realLifeApplications} accent="text-emerald-500" />,
    },
    {
      key: 'revision',
      title: 'Quick Revision Notes',
      icon: BookText,
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-900',
      hasContent: summary.quickRevisionNotes.length > 0,
      body: (
        <ul className="space-y-1.5">
          {summary.quickRevisionNotes.map((note, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-2 py-1.5 text-base text-slate-800"
            >
              <span className="mt-0.5 shrink-0 font-bold text-amber-600">{i + 1}.</span>
              <span className="whitespace-pre-wrap">{note}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'practice',
      title: 'Practice Recall Questions',
      icon: FileQuestion,
      stripe: 'border-blue-600',
      iconWrap: 'bg-blue-100 text-blue-900',
      hasContent: summary.practiceRecallQuestions.length > 0,
      body: (
        <ol className="space-y-2">
          {summary.practiceRecallQuestions.map((q, i) => (
            <li
              key={i}
              className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-base text-slate-800"
            >
              <span className="mr-2 font-semibold text-blue-700">Q{i + 1}.</span>
              {q}
            </li>
          ))}
        </ol>
      ),
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

export function ChapterSummaryViewer({ content, rawContent, className }: ChapterSummaryViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return chapterSummaryViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { summary, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveChapterSummaryFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderChapterSummaryMarkdown(markdownFallback) }}
      />
    );
  }

  if (!summary) {
    return <p className={cn('text-sm italic text-slate-500', className)}>No chapter summary to display.</p>;
  }

  const bodySections = buildBodySections(summary);
  const filledSections = [
    summary.chapterOverview,
    summary.learningObjectives.length,
    summary.importantConcepts.length,
    summary.definitions.length,
    summary.formulae.length,
    summary.conceptConnections,
    summary.realLifeApplications.length,
    summary.quickRevisionNotes.length,
    summary.practiceRecallQuestions.length,
  ].filter(Boolean).length;
  const conceptChips = summary.importantConcepts
    .map((c) => c.name?.trim())
    .filter(Boolean)
    .slice(0, 6);

  // Outer document chrome lives in AiToolDocumentShell (resolveInteractiveAiToolViewer).
  return (
    <div className={cn('w-full space-y-5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-0 bg-blue-100 text-blue-900 hover:bg-blue-100 text-xs font-semibold">
          {filledSections} section{filledSections === 1 ? '' : 's'}
        </Badge>
        {summary.importantConcepts.length > 0 ? (
          <Badge className="border-0 bg-sky-100 text-sky-900 hover:bg-sky-100 text-xs font-semibold">
            {summary.importantConcepts.length} concepts
          </Badge>
        ) : null}
        {conceptChips.map((name) => (
          <Badge
            key={name}
            className="border border-blue-200 bg-white text-blue-800 hover:bg-white text-xs font-medium"
          >
            {name}
          </Badge>
        ))}
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
