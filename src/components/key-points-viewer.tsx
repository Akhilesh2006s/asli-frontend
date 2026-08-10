import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { useMemo, type ReactNode } from 'react';
import {
  BookMarked,
  Brain,
  KeyRound,
  Lightbulb,
  ListChecks,
  Sigma,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  keyPointsHasVisibleBody,
  keyPointsViewerPayloadFromRecord,
  resolveKeyPointsFromPayload,
  type KeyPointsContent,
} from '@/lib/parse-key-points';
import { GeneratedRecordBody } from '@/components/super-admin/generated-record-body';
import {
  ExpandableText,
  FlipCard,
  SelfCheckList,
  TapToMarkItem,
  TapToRevealCard,
} from '@/components/ai-tool-interactive';

export { keyPointsViewerPayloadFromRecord };

function SectionCard({
  sectionNum,
  title,
  icon: Icon,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <AiToolStackedSection num={sectionNum} title={title} icon={Icon}>
      {children}
    </AiToolStackedSection>
  );
}

function buildSections(kp: KeyPointsContent) {
  const sections: ReactNode[] = [];
  let n = 0;
  const next = () => String(++n);

  if (kp.importantConcepts.length) {
    sections.push(
      <SectionCard key="concepts" sectionNum={next()} title="Most Important Concepts" icon={Brain}>
        <div className="grid gap-2 sm:grid-cols-2">
          {kp.importantConcepts.map((c, i) => (
            <FlipCard
              key={i}
              tone="amber"
              front={
                <div className="flex flex-1 flex-col justify-center">
                  <p className="font-semibold text-amber-950">{c.name}</p>
                  <p className="mt-1 text-mini font-medium text-amber-600">Tap to flip ↻</p>
                </div>
              }
              back={<p className="text-base leading-relaxed">{c.explanation || c.name}</p>}
            />
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.essentialDefinitions.length) {
    sections.push(
      <SectionCard key="defs" sectionNum={next()} title="Essential Definitions" icon={BookMarked}>
        <div className="space-y-2">
          {kp.essentialDefinitions.map((d, i) => (
            <TapToRevealCard key={i} prompt={d.term} detail={d.definition} tone="sky" />
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.formulae.length) {
    sections.push(
      <SectionCard key="formulae" sectionNum={next()} title="Important Formulae / Rules" icon={Sigma}>
        <div className="space-y-2">
          {kp.formulae.map((f, i) => (
            <div key={i} className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{f.name}</p>
              <p className="mt-1 font-mono text-base text-slate-900">{f.formula}</p>
              {f.note ? <p className="mt-1 text-xs text-slate-600">{f.note}</p> : null}
            </div>
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.keywords.length) {
    sections.push(
      <SectionCard key="keywords" sectionNum={next()} title="Keywords & Terminologies" icon={KeyRound}>
        <p className="mb-2 text-xs font-medium text-slate-400">Tap a word to see what it means.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {kp.keywords.map((k, i) => (
            <TapToRevealCard key={i} prompt={k.term} detail={k.meaning} tone="amber" revealLabel="What's this?" />
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.mustRememberFacts.length) {
    sections.push(
      <SectionCard key="facts" sectionNum={next()} title="Must-remember Facts" icon={ListChecks}>
        <SelfCheckList items={kp.mustRememberFacts} tone="rose" prompt="Tap each fact once it's locked in" />
      </SectionCard>,
    );
  }

  if (kp.realLifeConnections.length) {
    sections.push(
      <SectionCard key="real" sectionNum={next()} title="Real-life Connections" icon={Lightbulb}>
        <div className="grid gap-2 sm:grid-cols-2">
          {kp.realLifeConnections.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="lime" iconOff="lightbulb" iconOn="star" markedStyle="highlight" />
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.examPoints.length) {
    sections.push(
      <SectionCard key="exam" sectionNum={next()} title="Frequently Asked Exam Points" icon={Target}>
        <SelfCheckList items={kp.examPoints} tone="indigo" prompt="Tap each point you're ready to answer" />
      </SectionCard>,
    );
  }

  if (kp.mnemonics.length) {
    sections.push(
      <SectionCard key="mnemonic" sectionNum={next()} title="Mnemonics / Memory Tricks" icon={Zap}>
        <div className="space-y-2">
          {kp.mnemonics.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="violet" iconOff="sparkle" iconOn="star" markedStyle="highlight" />
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.revisionSummary) {
    sections.push(
      <SectionCard key="summary" sectionNum={next()} title="One-minute Revision Summary" icon={Sparkles}>
        <ExpandableText text={kp.revisionSummary} />
      </SectionCard>,
    );
  }

  return sections;
}

export function KeyPointsViewer({
  content,
  rawContent,
  className,
}: {
  content: string;
  rawContent?: unknown;
  className?: string;
}) {
  const payload = useMemo(() => {
    if (rawContent != null) return { content: String(content || '').trim(), rawContent };
    return keyPointsViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const { keyPoints, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveKeyPointsFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback && !keyPoints) {
    return <GeneratedRecordBody content={markdownFallback} toolType="key-points-formula-extractor" />;
  }

  if (!keyPoints || !keyPointsHasVisibleBody(keyPoints)) {
    return (
      <p className={cn('text-sm italic text-slate-500', className)}>
        No key points to display. Try generating again for this topic.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title is shown once by the shared AiToolKitLayout header above this. */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1.5 shadow-sm">
          {keyPoints.importantConcepts.length} concepts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1.5 shadow-sm">
          {keyPoints.formulae.length} formulae
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1.5 shadow-sm">
          {keyPoints.mustRememberFacts.length} facts
        </span>
      </div>
      <div className="space-y-3">{buildSections(keyPoints)}</div>
    </div>
  );
}
