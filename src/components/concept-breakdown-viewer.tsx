import { useMemo, type ReactNode } from 'react';
import {
  Brain,
  HelpCircle,
  Lightbulb,
  ListOrdered,
  MessageCircleQuestion,
  Sparkles,
  Tag,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  conceptBreakdownViewerPayloadFromRecord,
  resolveConceptBreakdownFromPayload,
  type ConceptBreakdownContent,
} from '@/lib/parse-concept-breakdown';
import { renderConceptBreakdownMarkdown } from '@/lib/render-concept-breakdown-markdown';

export { conceptBreakdownViewerPayloadFromRecord };

interface ConceptBreakdownViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

function SectionCard({
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
        'h-fit w-full overflow-hidden rounded-xl border border-violet-200/90 bg-white shadow-sm',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 border-l-[4px] px-2.5 py-1.5', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400">{sectionNum}</p>
          <h4 className="text-xs font-bold leading-tight text-slate-900">{title}</h4>
        </div>
      </div>
      <div className="px-2 pb-1.5 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyHint() {
  return (
    <p className="rounded-md border border-dashed border-violet-200 bg-violet-50/50 px-2 py-1 text-xs italic text-slate-400">
      Not included for this concept.
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
        className="prose prose-sm max-w-none text-slate-800"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>;
}

function BulletList({ items, accent = 'text-violet-500' }: { items: string[]; accent?: string }) {
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

function CompactSectionColumns({ children }: { children: ReactNode[] }) {
  const left = children.filter((_, i) => i % 2 === 0);
  const right = children.filter((_, i) => i % 2 === 1);
  return (
    <div className="grid grid-cols-1 items-start gap-0.5 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-0.5">{left}</div>
      <div className="flex min-w-0 flex-col gap-0.5">{right}</div>
    </div>
  );
}

function buildSections(concept: ConceptBreakdownContent): {
  leading: ReactNode[];
  compact: ReactNode[];
  trailing: ReactNode[];
} {
  const compact = [
    <SectionCard
      key="4"
      sectionNum="Section 4"
      title="Real-life and Indian Context Examples"
      icon={Lightbulb}
      stripe="border-emerald-500"
      iconWrap="bg-emerald-100 text-emerald-800"
    >
      <BulletList items={concept.realLifeExamples} accent="text-emerald-600" />
    </SectionCard>,
    <SectionCard
      key="5"
      sectionNum="Section 5"
      title="Important Terms and Keywords"
      icon={Tag}
      stripe="border-amber-500"
      iconWrap="bg-amber-100 text-amber-900"
    >
      {concept.importantTerms.length > 0 ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {concept.importantTerms.map((t, i) => (
            <div
              key={`${t.term}-${i}`}
              className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5"
            >
              <p className="text-sm font-semibold text-amber-900">{t.term}</p>
              {t.definition ? (
                <p className="mt-0.5 text-sm text-slate-700">{t.definition}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint />
      )}
    </SectionCard>,
    <SectionCard
      key="6"
      sectionNum="Section 6"
      title="Concept Check Questions"
      icon={HelpCircle}
      stripe="border-cyan-500"
      iconWrap="bg-cyan-100 text-cyan-800"
    >
      {concept.conceptCheckQuestions.length > 0 ? (
        <ul className="space-y-1">
          {concept.conceptCheckQuestions.map((q, i) => (
            <li
              key={i}
              className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-2.5 py-1.5 text-sm text-slate-800"
            >
              <span className="mr-2 font-semibold text-cyan-700">Q{i + 1}.</span>
              {q}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint />
      )}
    </SectionCard>,
  ];

  const leading = [
    <SectionCard
      key="2"
      sectionNum="Section 2"
      title="Simple Definition"
      icon={Brain}
      stripe="border-blue-500"
      iconWrap="bg-blue-100 text-blue-800"
    >
      <RichTextBlock text={concept.simpleDefinition} />
    </SectionCard>,
    <SectionCard
      key="3"
      sectionNum="Section 3"
      title="Step-by-step Concept Breakdown"
      icon={ListOrdered}
      stripe="border-indigo-500"
      iconWrap="bg-indigo-100 text-indigo-800"
    >
      {concept.breakdownSteps.length > 0 ? (
        <ol className="space-y-1">
          {concept.breakdownSteps.map((step, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg border border-indigo-100 bg-indigo-50/40 px-2.5 py-1.5 text-sm text-slate-800"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 pt-0.5 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyHint />
      )}
    </SectionCard>,
  ];

  const trailing = [
    <SectionCard
      key="7"
      sectionNum="Section 7"
      title="Application-based Thinking Question"
      icon={MessageCircleQuestion}
      stripe="border-orange-500"
      iconWrap="bg-orange-100 text-orange-800"
    >
      <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/80 px-2.5 py-2">
        <RichTextBlock text={concept.applicationThinkingQuestion} />
      </div>
    </SectionCard>,
    <SectionCard
      key="8"
      sectionNum="Section 8"
      title="Higher-order Thinking Prompt"
      icon={Zap}
      stripe="border-fuchsia-500"
      iconWrap="bg-fuchsia-100 text-fuchsia-800"
    >
      <div className="rounded-lg border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-violet-50/80 px-2.5 py-2">
        <RichTextBlock text={concept.higherOrderThinkingPrompt} />
      </div>
    </SectionCard>,
    <SectionCard
      key="9"
      sectionNum="Section 9"
      title="Quick Revision Summary"
      icon={Sparkles}
      stripe="border-violet-600"
      iconWrap="bg-violet-100 text-violet-900"
    >
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-2.5 py-2">
        <RichTextBlock text={concept.quickRevisionSummary} />
      </div>
    </SectionCard>,
  ];

  return { leading, compact, trailing };
}

function ConceptBreakdownPanel({
  concept,
  index,
  total,
}: {
  concept: ConceptBreakdownContent;
  index: number;
  total: number;
}) {
  const { leading, compact, trailing } = buildSections(concept);

  return (
    <div className={cn(total > 1 && index > 0 && 'mt-3 border-t border-violet-200/80 pt-3')}>
      {total > 1 ? (
        <Badge className="mb-2 border-0 bg-violet-100 text-violet-800 hover:bg-violet-100">
          Concept {index + 1} of {total}
        </Badge>
      ) : null}
      <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/90 via-white to-purple-50/40" />
        <div className="relative p-2.5 sm:p-3">
          <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
            Section 1
          </p>
          <Badge className="mb-1 border-0 bg-violet-100 text-violet-900 hover:bg-violet-100 text-xs">
            Concept Title
          </Badge>
          <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
            {concept.conceptTitle}
          </h4>
        </div>
      </div>
      <div className="mt-0.5 flex flex-col gap-0.5">
        {[...leading, ...trailing].length === 0 && compact.length === 0 ? null : (
          <>
            {leading.map((section) => (
              <div key={(section as { key?: string }).key} className="w-full min-w-0">
                {section}
              </div>
            ))}
            {compact.length > 0 ? <CompactSectionColumns>{compact}</CompactSectionColumns> : null}
            {trailing.map((section) => (
              <div key={(section as { key?: string }).key} className="w-full min-w-0">
                {section}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function ConceptBreakdownViewer({ content, rawContent, className }: ConceptBreakdownViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return conceptBreakdownViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { concepts, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveConceptBreakdownFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderConceptBreakdownMarkdown(markdownFallback) }}
      />
    );
  }

  const primary = concepts[0];
  const stepCount = primary?.breakdownSteps.length ?? 0;
  const termCount = primary?.importantTerms.length ?? 0;

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-violet-200/80 shadow-xl shadow-violet-200/25"
        style={{
          backgroundColor: '#f5f3ff',
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-violet-100 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Brain className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-100">
                Concept Breakdown Explainer
              </p>
              <h3 className="truncate text-lg font-bold">{primary?.conceptTitle || 'Concept'}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {concepts.length} concept{concepts.length !== 1 ? 's' : ''}
                </Badge>
                {stepCount > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {stepCount} steps
                  </Badge>
                ) : null}
                {termCount > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {termCount} terms
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 p-1.5 sm:p-2">
          {concepts.map((concept, i) => (
            <ConceptBreakdownPanel
              key={`${concept.conceptTitle}-${i}`}
              concept={concept}
              index={i}
              total={concepts.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
