import { useMemo, type ReactNode, type ReactElement } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Layers,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FlashcardViewer,
  getFlashcardsFromContent,
  type Flashcard,
} from '@/components/flashcard-viewer';

const BLOOM_FALLBACK_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

/** Merge per-card fields from raw JSON and gentle fallbacks when the model omits tags. */
export function enrichStudyDeckCards(cards: Flashcard[], rawContent?: unknown): Flashcard[] {
  const raw =
    rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : null;
  const rawList = raw
    ? (Array.isArray(raw.cards)
        ? raw.cards
        : Array.isArray(raw.flashcards)
          ? raw.flashcards
          : []) as Record<string, unknown>[]
    : [];

  return cards.map((card, i) => {
    const r = rawList[i];
    const difficultyFromRaw = r
      ? String(
          r.difficulty_tag_for_each_card ||
            r.difficulty_tag ||
            r.difficultyTagForEachCard ||
            r.skill_focus ||
            '',
        ).trim()
      : '';
    const memoryFromRaw = r
      ? String(r.memory_hook_quick_tip || r.memory_cue || r.memoryCue || '').trim()
      : '';
    const selfCheckFromRaw = r
      ? String(r.self_check_round || r.selfCheckRound || r.peer_prompt || '').trim()
      : '';

    const difficultyTag =
      card.difficultyTag ||
      card.skillFocus ||
      difficultyFromRaw ||
      BLOOM_FALLBACK_LEVELS[i % BLOOM_FALLBACK_LEVELS.length];

    const memoryHookQuickTip =
      card.memoryHookQuickTip ||
      card.memoryCue ||
      memoryFromRaw ||
      (card.back ? `Remember: ${card.back.split(/[.!?]/)[0]?.trim().slice(0, 120)}` : '');

    const selfCheckRound =
      card.selfCheckRound ||
      card.peerPrompt ||
      selfCheckFromRaw ||
      (card.front ? `Without looking, explain: ${card.front}` : '');

    return {
      ...card,
      difficultyTag,
      memoryHookQuickTip,
      memoryCue: memoryHookQuickTip,
      selfCheckRound,
    };
  });
}

export type StudentDeckMeta = {
  title: string;
  subtopicLinkPriorKnowledge: string;
  learningObjectives: string[];
  ncfAlignment: string;
  selfCheckRound: string;
  commonMistakesToAvoid: string[];
  expectedLearningOutcomes: string[];
  realLifeApplication: string;
  reflectionExitTicket: string;
};

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  const s = String(value ?? '').trim();
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function pickText(sources: Record<string, unknown>[], ...keys: string[]): string {
  for (const src of sources) {
    for (const k of keys) {
      const v = src[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
}

function pickList(sources: Record<string, unknown>[], ...keys: string[]): string[] {
  for (const src of sources) {
    for (const k of keys) {
      const rows = toStringList(src[k]);
      if (rows.length) return rows;
    }
  }
  return [];
}

/** Unwrap Super Admin / student API record into viewer props. */
export function deckViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    metadata?: { structuredContent?: unknown };
    structuredContent?: unknown;
  } | null,
): { content: string; rawContent: unknown } {
  const generated = String(record?.generatedContent ?? record?.content ?? '').trim();
  const structured =
    record?.metadata?.structuredContent ?? record?.structuredContent ?? null;

  if (generated.startsWith('{') || generated.startsWith('[')) {
    try {
      const parsed = JSON.parse(generated) as Record<string, unknown>;
      if (Array.isArray(parsed)) {
        return { content: generated, rawContent: structured ?? { cards: parsed } };
      }
      const formatted = String(parsed.formatted ?? parsed.markdown ?? '').trim();
      const raw = parsed.raw ?? structured;
      if (formatted) {
        return { content: formatted, rawContent: raw ?? structured ?? undefined };
      }
      if (raw && typeof raw === 'object') {
        return { content: generated, rawContent: raw };
      }
    } catch {
      /* plain text or invalid JSON */
    }
  }

  return {
    content: generated,
    rawContent: structured ?? undefined,
  };
}

function parseDeckMetaFromFormatted(text: string): Partial<StudentDeckMeta> {
  const body = String(text || '').trim();
  if (!body) return {};

  const pickBlock = (labelPattern: string): string => {
    const re = new RegExp(
      `\\*\\*${labelPattern}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n\\*\\*Flashcard Set|\\n##\\s*Card|$)`,
      'i',
    );
    const m = body.match(re);
    return m ? m[1].trim() : '';
  };

  const objectivesBlock = pickBlock('Learning Objectives[^*]*');
  const mistakesBlock = pickBlock('Common Mistakes to Avoid');
  const outcomesBlock = pickBlock('Expected Learning Outcomes');

  const listFromBlock = (block: string) =>
    block
      .split(/\n+/)
      .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean);

  return {
    title: pickBlock('Deck Title').replace(/^#+\s*/, '') || undefined,
    subtopicLinkPriorKnowledge: pickBlock('Subtopic Link and Prior Knowledge Required') || undefined,
    learningObjectives: objectivesBlock ? listFromBlock(objectivesBlock) : undefined,
    ncfAlignment: pickBlock('NCF Competency[^*]*') || undefined,
    commonMistakesToAvoid: mistakesBlock ? listFromBlock(mistakesBlock) : undefined,
    expectedLearningOutcomes: outcomesBlock ? listFromBlock(outcomesBlock) : undefined,
    realLifeApplication: pickBlock('Real-life Application') || undefined,
    reflectionExitTicket: pickBlock('Reflection[^*]*') || undefined,
  };
}

export function resolveStudentDeckMeta(content: string, rawContent?: unknown): StudentDeckMeta {
  const sources: Record<string, unknown>[] = [];
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    sources.push(rawContent as Record<string, unknown>);
  }
  const trimmed = String(content || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.raw && typeof parsed.raw === 'object') {
        sources.push(parsed.raw as Record<string, unknown>);
      }
      sources.push(parsed);
    } catch {
      /* plain text */
    }
  }

  const fromFormatted = parseDeckMetaFromFormatted(content);

  const title =
    pickText(sources, 'deck_title', 'deckTitle', 'title', 'studyScheduleTitle') ||
    fromFormatted.title ||
    'My Study Deck';

  const learningObjectives =
    pickList(sources, 'learningObjectives', 'learning_objectives', 'objectives').length > 0
      ? pickList(sources, 'learningObjectives', 'learning_objectives', 'objectives')
      : fromFormatted.learningObjectives || [];

  const commonMistakesToAvoid =
    pickList(sources, 'commonMistakesToAvoid', 'common_mistakes_to_avoid', 'common_mistakes').length > 0
      ? pickList(sources, 'commonMistakesToAvoid', 'common_mistakes_to_avoid', 'common_mistakes')
      : fromFormatted.commonMistakesToAvoid || [];

  const expectedLearningOutcomes =
    pickList(sources, 'expectedLearningOutcomes', 'expected_learning_outcomes').length > 0
      ? pickList(sources, 'expectedLearningOutcomes', 'expected_learning_outcomes')
      : fromFormatted.expectedLearningOutcomes || [];

  return {
    title,
    subtopicLinkPriorKnowledge:
      pickText(
        sources,
        'subtopicLinkPriorKnowledgeRequired',
        'subtopic_link_prior_knowledge_required',
        'prior_knowledge_required',
        'subtopic_link',
      ) || fromFormatted.subtopicLinkPriorKnowledge || '',
    learningObjectives,
    ncfAlignment:
      pickText(
        sources,
        'ncfCompetencyAlignment',
        'ncf_competency_alignment',
        'learning_outcome_alignment',
      ) || fromFormatted.ncfAlignment || '',
    selfCheckRound: pickText(
      sources,
      'selfCheckRound',
      'self_check_round',
      'self_check_rapid_recall_round',
      'peer_prompt',
    ),
    commonMistakesToAvoid,
    expectedLearningOutcomes,
    realLifeApplication:
      pickText(
        sources,
        'realLifeApplication',
        'real_life_application',
        'example_use',
        'real_life_link',
      ) || fromFormatted.realLifeApplication || '',
    reflectionExitTicket:
      pickText(
        sources,
        'reflectionExitTicket',
        'reflection_exit_ticket',
        'reflection',
        'reflection_prompt',
      ) || fromFormatted.reflectionExitTicket || '',
  };
}

function DeckSectionCard({
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
    <section className="h-fit w-full rounded-xl bg-white border border-violet-200/90 shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2 px-2.5 py-1.5 border-l-[4px]', stripe)}>
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconWrap)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-xs font-bold text-stone-900 leading-tight">{title}</h4>
        </div>
      </div>
      <div className="px-2.5 pb-2 pt-0.5">{children}</div>
    </section>
  );
}

function EmptyDeckHint() {
  return (
    <p className="text-xs text-stone-400 italic rounded-md border border-dashed border-stone-200 bg-stone-50 px-2 py-1">
      Not included in this study deck.
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-800">
          <span className="text-violet-500 shrink-0">•</span>
          <span className="whitespace-pre-wrap">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function PerCardList({
  cards,
  pick,
  label,
}: {
  cards: Flashcard[];
  pick: (c: Flashcard, i: number) => string;
  label: (i: number) => string;
}) {
  const rows = cards
    .map((c, i) => ({ i, text: pick(c, i).trim() }))
    .filter((r) => r.text.length > 0);
  if (!rows.length) return <EmptyDeckHint />;
  return (
    <ul className="space-y-1">
      {rows.map(({ i, text }) => (
        <li key={i} className="rounded-md border border-violet-100 bg-violet-50/40 px-2 py-1 text-sm text-slate-800 leading-snug">
          <span className="text-[9px] font-bold uppercase tracking-wide text-violet-700">
            {label(i)}
          </span>
          <p className="mt-0 whitespace-pre-wrap">{text}</p>
        </li>
      ))}
    </ul>
  );
}

interface MyStudyDecksViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
}

type DeckSectionDef = {
  num: number;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  body: ReactElement;
};

function renderDeckSection(sec: DeckSectionDef) {
  return (
    <DeckSectionCard
      key={sec.num}
      sectionNum={`Section ${sec.num}`}
      title={sec.title}
      icon={sec.icon}
      stripe={sec.stripe}
      iconWrap={sec.iconWrap}
    >
      {sec.body}
    </DeckSectionCard>
  );
}

/** Even sections in the left stack, odd in the right — avoids grid-row height gaps beside shorter cards. */
function DeckSectionColumns({ sections }: { sections: DeckSectionDef[] }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="flex flex-col gap-1">
        {sections.map(renderDeckSection)}
      </div>
    );
  }

  const section5 = sections.find((s) => s.num === 5);
  const before5 = sections.filter((s) => s.num < 5);
  const after5 = sections.filter((s) => s.num > 5);
  const leftOf = (list: DeckSectionDef[]) => list.filter((s) => s.num % 2 === 0);
  const rightOf = (list: DeckSectionDef[]) => list.filter((s) => s.num % 2 === 1);

  const columnPair = (list: DeckSectionDef[]) => (
    <div className="grid grid-cols-2 gap-1 items-start">
      <div className="flex min-w-0 flex-col gap-1">{leftOf(list).map(renderDeckSection)}</div>
      <div className="flex min-w-0 flex-col gap-1">{rightOf(list).map(renderDeckSection)}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {before5.length > 0 && columnPair(before5)}
      {section5 && renderDeckSection(section5)}
      {after5.length > 0 && columnPair(after5)}
    </div>
  );
}

export function MyStudyDecksViewer({ content, rawContent, className }: MyStudyDecksViewerProps) {
  const payload = useMemo(() => {
    if (rawContent != null) {
      const text = String(content || '').trim();
      if (text.startsWith('{')) {
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          const formatted = String(parsed.formatted ?? parsed.markdown ?? '').trim();
          if (formatted) {
            return { content: formatted, rawContent };
          }
        } catch {
          /* use as-is */
        }
      }
      return { content, rawContent };
    }
    return deckViewerPayloadFromRecord({ generatedContent: content });
  }, [content, rawContent]);

  const meta = useMemo(
    () => resolveStudentDeckMeta(payload.content, payload.rawContent),
    [payload.content, payload.rawContent],
  );
  const cards = useMemo(() => {
    let parsed: Flashcard[] = [];
    const fromFormatted = getFlashcardsFromContent(payload.content);
    if (fromFormatted.length) parsed = fromFormatted;
    else {
      const fromEnvelope = getFlashcardsFromContent(content);
      if (fromEnvelope.length) parsed = fromEnvelope;
      else if (payload.rawContent && typeof payload.rawContent === 'object') {
        parsed = getFlashcardsFromContent(
          JSON.stringify({ formatted: payload.content, raw: payload.rawContent }),
        );
      }
    }
    return enrichStudyDeckCards(parsed, payload.rawContent);
  }, [payload.content, payload.rawContent, content]);

  const flashcardSessionContent = useMemo(() => {
    if (cards.length > 0) return payload.content || content;
    const trimmed = String(content || '').trim();
    if (trimmed.startsWith('{')) return trimmed;
    if (payload.rawContent) {
      return JSON.stringify({ formatted: payload.content, raw: payload.rawContent });
    }
    return payload.content || content;
  }, [cards.length, payload.content, payload.rawContent, content]);

  const hasDifficulty = cards.some((c) => (c.difficultyTag || c.skillFocus || '').trim());
  const hasMemory = cards.some((c) => (c.memoryHookQuickTip || c.memoryCue || '').trim());
  const hasSelfCheck = cards.some((c) => (c.selfCheckRound || c.peerPrompt || c.reflection || '').trim());

  const orderedSections: DeckSectionDef[] = [
    {
      num: 2,
      title: 'Subtopic Link and Prior Knowledge Required',
      icon: Target,
      stripe: 'border-cyan-500',
      iconWrap: 'bg-cyan-100 text-cyan-800',
      body: meta.subtopicLinkPriorKnowledge ? (
        <p className="text-sm whitespace-pre-wrap text-slate-800">{meta.subtopicLinkPriorKnowledge}</p>
      ) : (
        <EmptyDeckHint />
      ),
    },
    {
      num: 3,
      title: "Learning Objectives - Bloom's Taxonomy Aligned",
      icon: Target,
      stripe: 'border-indigo-500',
      iconWrap: 'bg-indigo-100 text-indigo-800',
      body:
        meta.learningObjectives.length > 0 ? (
          <BulletList items={meta.learningObjectives} />
        ) : (
          <EmptyDeckHint />
        ),
    },
    {
      num: 4,
      title: 'NCF Competency / Learning Outcome Alignment',
      icon: GraduationCap,
      stripe: 'border-blue-500',
      iconWrap: 'bg-blue-100 text-blue-800',
      body: meta.ncfAlignment ? (
        <p className="text-sm whitespace-pre-wrap text-slate-800">{meta.ncfAlignment}</p>
      ) : (
        <EmptyDeckHint />
      ),
    },
    {
      num: 5,
      title: 'Flashcard Set',
      icon: Zap,
      stripe: 'border-violet-500',
      iconWrap: 'bg-violet-100 text-violet-800',
      body: (
        <div className="mx-auto w-full max-w-md">
          <FlashcardViewer
            content={flashcardSessionContent}
            rawContent={payload.rawContent}
            variant="student"
            embedded
          />
        </div>
      ),
    },
    {
      num: 6,
      title: 'Difficulty Tag for Each Card',
      icon: Target,
      stripe: 'border-amber-500',
      iconWrap: 'bg-amber-100 text-amber-900',
      body: hasDifficulty ? (
        <PerCardList
          cards={cards}
          pick={(c) => c.difficultyTag || c.skillFocus || ''}
          label={(i) => `Card ${i + 1}`}
        />
      ) : (
        <EmptyDeckHint />
      ),
    },
    {
      num: 7,
      title: 'Memory Hook / Quick Tip',
      icon: Lightbulb,
      stripe: 'border-yellow-500',
      iconWrap: 'bg-yellow-100 text-yellow-900',
      body: hasMemory ? (
        <PerCardList
          cards={cards}
          pick={(c) => c.memoryHookQuickTip || c.memoryCue || ''}
          label={(i) => `Card ${i + 1}`}
        />
      ) : (
        <EmptyDeckHint />
      ),
    },
    {
      num: 8,
      title: 'Self-Check Round',
      icon: CheckCircle2,
      stripe: 'border-teal-500',
      iconWrap: 'bg-teal-100 text-teal-800',
      body: (
        <>
          {meta.selfCheckRound ? (
            <p className="text-sm whitespace-pre-wrap text-slate-800 mb-1">{meta.selfCheckRound}</p>
          ) : null}
          {hasSelfCheck ? (
            <PerCardList
              cards={cards}
              pick={(c) => c.selfCheckRound || c.peerPrompt || c.reflection || ''}
              label={(i) => `Card ${i + 1}`}
            />
          ) : !meta.selfCheckRound ? (
            <EmptyDeckHint />
          ) : null}
        </>
      ),
    },
    {
      num: 9,
      title: 'Common Mistakes to Avoid',
      icon: AlertTriangle,
      stripe: 'border-orange-500',
      iconWrap: 'bg-orange-100 text-orange-800',
      body:
        meta.commonMistakesToAvoid.length > 0 ? (
          <BulletList items={meta.commonMistakesToAvoid} />
        ) : (
          <EmptyDeckHint />
        ),
    },
    {
      num: 10,
      title: 'Expected Learning Outcomes',
      icon: GraduationCap,
      stripe: 'border-purple-500',
      iconWrap: 'bg-purple-100 text-purple-800',
      body:
        meta.expectedLearningOutcomes.length > 0 ? (
          <BulletList items={meta.expectedLearningOutcomes} />
        ) : (
          <EmptyDeckHint />
        ),
    },
    {
      num: 11,
      title: 'Real-life Application',
      icon: Sparkles,
      stripe: 'border-emerald-500',
      iconWrap: 'bg-emerald-100 text-emerald-800',
      body: meta.realLifeApplication ? (
        <p className="text-sm whitespace-pre-wrap text-slate-800">{meta.realLifeApplication}</p>
      ) : (
        <EmptyDeckHint />
      ),
    },
    {
      num: 12,
      title: 'Reflection / Exit Ticket',
      icon: MessageCircle,
      stripe: 'border-slate-500',
      iconWrap: 'bg-slate-100 text-slate-800',
      body: meta.reflectionExitTicket ? (
        <p className="text-sm whitespace-pre-wrap text-slate-800">{meta.reflectionExitTicket}</p>
      ) : (
        <EmptyDeckHint />
      ),
    },
  ];

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        className="relative overflow-hidden rounded-3xl border border-violet-200/80 shadow-xl shadow-violet-200/25"
        style={{
          backgroundColor: '#f5f3ff',
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.12) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-violet-100 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Layers className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-100">
                My Study Decks
              </p>
              <h3 className="text-lg font-bold truncate">{meta.title}</h3>
              {cards.length > 0 ? (
                <p className="text-xs text-violet-100/90 mt-0.5">{cards.length} flashcards in deck</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-3 space-y-1">
          <div className="relative overflow-hidden rounded-xl bg-white border border-violet-200 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50" />
            <div className="relative p-2.5 sm:p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700 mb-0.5">
                Section 1
              </p>
              <Badge className="mb-1 border-0 bg-violet-100 text-violet-900 hover:bg-violet-100 text-xs">
                Deck
              </Badge>
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{meta.title}</h4>
            </div>
          </div>

          <DeckSectionColumns sections={orderedSections} />
        </div>
      </div>
    </div>
  );
}
