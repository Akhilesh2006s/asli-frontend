import { AiToolStackedSection } from '@/components/ai-tool-stacked-section';
import { AiToolV2Hero } from '@/components/ai-v2/ai-tool-v2-hero';
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

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800 leading-relaxed">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span className="whitespace-pre-wrap">{line}</span>
        </li>
      ))}
    </ul>
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
            <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <p className="font-semibold text-amber-950">{c.name}</p>
              {c.explanation ? <p className="mt-1 text-sm text-slate-700">{c.explanation}</p> : null}
            </div>
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
            <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="font-semibold text-slate-900">{d.term}</span>
              {d.definition ? <span className="text-slate-700"> — {d.definition}</span> : null}
            </div>
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
              <p className="mt-1 font-mono text-sm text-slate-900">{f.formula}</p>
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
        <div className="flex flex-wrap gap-2">
          {kp.keywords.map((k, i) => (
            <span
              key={i}
              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-slate-800"
              title={k.meaning}
            >
              {k.term}
            </span>
          ))}
        </div>
      </SectionCard>,
    );
  }

  if (kp.mustRememberFacts.length) {
    sections.push(
      <SectionCard key="facts" sectionNum={next()} title="Must-remember Facts" icon={ListChecks}>
        <BulletList items={kp.mustRememberFacts} />
      </SectionCard>,
    );
  }

  if (kp.realLifeConnections.length) {
    sections.push(
      <SectionCard key="real" sectionNum={next()} title="Real-life Connections" icon={Lightbulb}>
        <BulletList items={kp.realLifeConnections} />
      </SectionCard>,
    );
  }

  if (kp.examPoints.length) {
    sections.push(
      <SectionCard key="exam" sectionNum={next()} title="Frequently Asked Exam Points" icon={Target}>
        <BulletList items={kp.examPoints} />
      </SectionCard>,
    );
  }

  if (kp.mnemonics.length) {
    sections.push(
      <SectionCard key="mnemonic" sectionNum={next()} title="Mnemonics / Memory Tricks" icon={Zap}>
        <BulletList items={kp.mnemonics} />
      </SectionCard>,
    );
  }

  if (kp.revisionSummary) {
    sections.push(
      <SectionCard key="summary" sectionNum={next()} title="One-minute Revision Summary" icon={Sparkles}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{kp.revisionSummary}</p>
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

  const filled = [
    keyPoints.importantConcepts.length,
    keyPoints.essentialDefinitions.length,
    keyPoints.formulae.length,
    keyPoints.keywords.length,
    keyPoints.mustRememberFacts.length,
    keyPoints.realLifeConnections.length,
    keyPoints.examPoints.length,
    keyPoints.mnemonics.length,
    keyPoints.revisionSummary,
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-4', className)}>
      <AiToolV2Hero
        toolLabel="Key Points Extractor"
        title={keyPoints.title}
        subtitle="Revision-ready facts, formulae, and exam highlights — distilled from your textbook."
        icon={KeyRound}
        gradientClass="from-amber-50 via-white to-orange-50"
        accentClass="from-amber-500 to-orange-500"
        borderClass="border-amber-100/80"
        progressPct={(filled / 9) * 100}
        chips={[
          { label: 'Concepts', value: String(keyPoints.importantConcepts.length) },
          { label: 'Formulae', value: String(keyPoints.formulae.length) },
          { label: 'Facts', value: String(keyPoints.mustRememberFacts.length) },
        ]}
      />
      <div className="space-y-3">{buildSections(keyPoints)}</div>
    </div>
  );
}
