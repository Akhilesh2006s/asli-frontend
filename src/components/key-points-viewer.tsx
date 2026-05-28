import { useMemo, type ReactNode } from 'react';
import {
  Brain,
  ClipboardList,
  Clock,
  Key,
  Lightbulb,
  ListChecks,
  Sigma,
  Sparkles,
  Star,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  keyPointsViewerPayloadFromRecord,
  resolveKeyPointsFromPayload,
  type KeyPointsContent,
} from '@/lib/parse-key-points';
import { renderKeyPointsMarkdown } from '@/lib/render-key-points-markdown';

export { keyPointsViewerPayloadFromRecord };

interface KeyPointsViewerProps {
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
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  children: ReactNode;
}) {
  return (
    <section className="h-fit w-full overflow-hidden rounded-xl border border-amber-200/90 bg-white shadow-sm">
      <div className={cn('flex items-center gap-2 border-l-[4px] px-2.5 py-1.5', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500">{sectionNum}</p>
          <h4 className="text-xs font-bold leading-tight text-slate-900">{title}</h4>
        </div>
      </div>
      <div className="px-2 pb-1.5 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyHint({ label = 'Not included in this key points sheet.' }: { label?: string }) {
  return (
    <p className="rounded-md border border-dashed border-amber-200 bg-amber-50/40 px-2 py-1 text-xs italic text-slate-400">
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

function BulletList({ items, accent = 'text-amber-600' }: { items: string[]; accent?: string }) {
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

function NumberedList({
  items,
  accent = 'text-amber-700',
}: {
  items: string[];
  accent?: string;
}) {
  if (!items.length) return <EmptyHint />;
  return (
    <ul className="space-y-1.5">
      {items.map((line, i) => (
        <li
          key={i}
          className="flex gap-2 rounded-md border border-amber-100 bg-amber-50/50 px-2 py-1.5 text-sm text-slate-800"
        >
          <span className={cn('mt-0.5 shrink-0 font-bold', accent)}>{i + 1}.</span>
          <span className="whitespace-pre-wrap leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function buildBodySections(kp: KeyPointsContent): ReactNode[] {
  return [
    <SectionCard
      key="2"
      sectionNum="Section 2"
      title="Most Important Concepts"
      icon={Sparkles}
      stripe="border-orange-500"
      iconWrap="bg-orange-100 text-orange-800"
    >
      {kp.importantConcepts.length > 0 ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {kp.importantConcepts.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2"
            >
              <p className="text-sm font-semibold text-orange-900">{c.name}</p>
              {c.explanation ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{c.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint label="Regenerate to add important concepts." />
      )}
    </SectionCard>,
    <SectionCard
      key="3"
      sectionNum="Section 3"
      title="Essential Definitions"
      icon={ListChecks}
      stripe="border-amber-500"
      iconWrap="bg-amber-100 text-amber-900"
    >
      {kp.essentialDefinitions.length > 0 ? (
        <div className="space-y-1.5">
          {kp.essentialDefinitions.map((d, i) => (
            <div key={`def-${i}`} className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2">
              <span className="text-sm font-semibold text-amber-900">{d.term}</span>
              {d.definition ? <span className="text-sm text-slate-700"> — {d.definition}</span> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint />
      )}
    </SectionCard>,
    <SectionCard
      key="4"
      sectionNum="Section 4"
      title="Important Formulae / Rules"
      icon={Sigma}
      stripe="border-yellow-500"
      iconWrap="bg-yellow-100 text-yellow-900"
    >
      {kp.formulae.length > 0 ? (
        <div className="space-y-1.5">
          {kp.formulae.map((f, i) => (
            <div
              key={`fm-${i}`}
              className="rounded-md border border-yellow-100 bg-yellow-50/60 px-3 py-2 text-sm text-slate-800"
            >
              {f.name ? <span className="font-semibold text-yellow-900">{f.name}: </span> : null}
              <span className="font-mono">{f.formula}</span>
              {f.note ? <p className="mt-1 font-sans text-xs text-slate-500">{f.note}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint label="Regenerate to add formulae or must-know rules." />
      )}
    </SectionCard>,
    <SectionCard
      key="5"
      sectionNum="Section 5"
      title="Keywords and Terminologies"
      icon={Tags}
      stripe="border-lime-500"
      iconWrap="bg-lime-100 text-lime-900"
    >
      {kp.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {kp.keywords.map((k, i) => (
            <div
              key={`kw-${i}`}
              className="rounded-lg border border-lime-200 bg-lime-50/70 px-2.5 py-1.5 text-sm"
            >
              <span className="font-semibold text-lime-900">{k.term}</span>
              {k.meaning ? <span className="text-slate-700"> — {k.meaning}</span> : null}
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
      title="Must-remember Facts"
      icon={Star}
      stripe="border-teal-500"
      iconWrap="bg-teal-100 text-teal-800"
    >
      <NumberedList items={kp.mustRememberFacts} accent="text-teal-700" />
    </SectionCard>,
    <SectionCard
      key="7"
      sectionNum="Section 7"
      title="Real-life Connections"
      icon={Lightbulb}
      stripe="border-emerald-500"
      iconWrap="bg-emerald-100 text-emerald-800"
    >
      <BulletList items={kp.realLifeConnections} accent="text-emerald-600" />
    </SectionCard>,
    <SectionCard
      key="8"
      sectionNum="Section 8"
      title="Frequently Asked Exam Points"
      icon={ClipboardList}
      stripe="border-cyan-500"
      iconWrap="bg-cyan-100 text-cyan-800"
    >
      <BulletList items={kp.examPoints} accent="text-cyan-600" />
    </SectionCard>,
    <SectionCard
      key="9"
      sectionNum="Section 9"
      title="Mnemonics / Memory Tricks"
      icon={Brain}
      stripe="border-violet-500"
      iconWrap="bg-violet-100 text-violet-800"
    >
      {kp.mnemonics.length > 0 ? (
        <ul className="space-y-1.5">
          {kp.mnemonics.map((m, i) => (
            <li
              key={i}
              className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm text-slate-800"
            >
              <span className="mr-2 font-semibold text-violet-700">Tip {i + 1}.</span>
              {m}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint />
      )}
    </SectionCard>,
    <SectionCard
      key="10"
      sectionNum="Section 10"
      title="One-minute Revision Summary"
      icon={Clock}
      stripe="border-amber-600"
      iconWrap="bg-amber-200 text-amber-950"
    >
      <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 px-3 py-2.5">
        <RichTextBlock text={kp.oneMinuteSummary} />
      </div>
    </SectionCard>,
  ];
}

export function KeyPointsViewer({ content, rawContent, className }: KeyPointsViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return keyPointsViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { keyPoints, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveKeyPointsFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <div
        className={cn('w-full', className)}
        dangerouslySetInnerHTML={{ __html: renderKeyPointsMarkdown(markdownFallback) }}
      />
    );
  }

  if (!keyPoints) {
    return <p className={cn('text-sm italic text-slate-500', className)}>No key points to display.</p>;
  }

  const bodySections = buildBodySections(keyPoints);
  const filledSections = [
    keyPoints.importantConcepts.length,
    keyPoints.essentialDefinitions.length,
    keyPoints.formulae.length,
    keyPoints.keywords.length,
    keyPoints.mustRememberFacts.length,
    keyPoints.realLifeConnections.length,
    keyPoints.examPoints.length,
    keyPoints.mnemonics.length,
    keyPoints.oneMinuteSummary,
  ].filter(Boolean).length;

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-amber-200/80 shadow-xl shadow-amber-200/25"
        style={{
          backgroundColor: '#fffbeb',
          backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.09) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Key className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-100">
                Key Points Extractor
              </p>
              <h3 className="truncate text-lg font-bold">{keyPoints.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  10 sections
                </Badge>
                <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                  {filledSections} filled
                </Badge>
                {keyPoints.importantConcepts.length > 0 ? (
                  <Badge className="border-0 bg-white/20 text-white hover:bg-white/20 text-[10px]">
                    {keyPoints.importantConcepts.length} concepts
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 p-1.5 sm:p-2">
          <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40" />
            <div className="relative p-2.5 sm:p-3">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-amber-100 text-amber-900 hover:bg-amber-100 text-xs">
                Topic Title
              </Badge>
              <h4 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{keyPoints.title}</h4>
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
