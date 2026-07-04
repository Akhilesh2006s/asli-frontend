import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lightbulb,
  Target,
  Sparkles,
  Users,
  MessageCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Add CSS for 3D flip effect
const flashcardStyles = `
  .perspective-1000 {
    perspective: 1000px;
  }
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = flashcardStyles;
  if (!document.head.querySelector('style[data-flashcard-styles]')) {
    styleSheet.setAttribute('data-flashcard-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

type CardType = 'question' | 'note' | 'fact';

export interface Flashcard {
  front: string;
  back: string;
  options?: string[];
  type?: CardType;
  cardCategory?: string;
  difficultyTag?: string;
  memoryHookQuickTip?: string;
  memoryCue?: string;
  skillFocus?: string;
  exampleUse?: string;
  peerPrompt?: string;
  selfCheckRound?: string;
  reflection?: string;
}

type TeacherDeckMeta = {
  title: string;
  topic: string;
  subtopic: string;
  topicAndSubtopicLink: string;
  classLevel: string;
  difficultyLevel: string;
  bloomLevel: string;
  priorKnowledgeRequired: string;
  learningObjectives: string[];
  ncfCompetencyAlignment: string;
  deckMemoryHook: string;
  selfCheckRapidRecallRound: string;
  commonMistakesToAvoid: string[];
  differentiationSupport: string;
  realLifeConnection: string;
  reflectionExitTicket: string;
};

interface FlashcardViewerProps {
  content: string;
  rawContent?: unknown;
  /** Premium immersive layout for student tools; teacher = 5-block deck */
  variant?: 'default' | 'student' | 'teacher';
  /** When true with variant student, renders only the flip session (inside MyStudyDecksViewer). */
  embedded?: boolean;
}

function ProgressRing({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? current / total : 0;
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - pct * circumference;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={r} className="stroke-white/15" strokeWidth="5" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="stroke-violet-400 transition-all duration-500"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-lg font-bold leading-none">{current}</span>
        <span className="text-[10px] text-white/60">of {total}</span>
      </div>
    </div>
  );
}

const STUDY_FIELD_META = [
  {
    key: 'difficultyTag' as const,
    label: 'Difficulty',
    icon: Target,
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'memoryHookQuickTip' as const,
    label: 'Memory hook',
    icon: Lightbulb,
    chip: 'bg-yellow-50 text-yellow-900 border-yellow-200',
    iconBg: 'bg-yellow-100 text-yellow-800',
  },
  {
    key: 'selfCheckRound' as const,
    label: 'Self-check',
    icon: MessageCircle,
    chip: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-700',
  },
  {
    key: 'memoryCue' as const,
    label: 'Memory Cue',
    icon: Lightbulb,
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'skillFocus' as const,
    label: 'Skill Focus',
    icon: Target,
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    iconBg: 'bg-violet-100 text-violet-700',
  },
  {
    key: 'exampleUse' as const,
    label: 'Example Use',
    icon: Sparkles,
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-700',
  },
  {
    key: 'peerPrompt' as const,
    label: 'Peer Prompt',
    icon: Users,
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'reflection' as const,
    label: 'Reflection',
    icon: MessageCircle,
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700',
  },
];

function StudyFieldTile({
  label,
  value,
  icon: Icon,
  chip,
  iconBg,
}: {
  label: string;
  value: string;
  icon: typeof Lightbulb;
  chip: string;
  iconBg: string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md ${chip}`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

type TeacherCardCategory = 'all' | 'concept' | 'formula' | 'application' | 'visual';

export function FlashcardViewer({
  content,
  rawContent,
  variant = 'default',
  embedded = false,
}: FlashcardViewerProps) {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [teacherMeta, setTeacherMeta] = useState<TeacherDeckMeta | null>(null);
  const [activeType, setActiveType] = useState<CardType | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<TeacherCardCategory>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const cards =
    variant === 'teacher' && activeCategory !== 'all'
      ? allCards.filter((card) => card.cardCategory === activeCategory)
      : activeType === 'all'
        ? allCards
        : allCards.filter((card) => card.type === activeType);
  
  // Count cards by type
  const questionCount = allCards.filter(c => c.type === 'question').length;
  const noteCount = allCards.filter(c => c.type === 'note').length;
  const factCount = allCards.filter(c => c.type === 'fact').length;

  const conceptCount = allCards.filter((c) => c.cardCategory === 'concept').length;
  const formulaCount = allCards.filter((c) => c.cardCategory === 'formula').length;
  const applicationCount = allCards.filter((c) => c.cardCategory === 'application').length;
  const visualCount = allCards.filter((c) => c.cardCategory === 'visual').length;

  useEffect(() => {
    let parsedCards = parseFlashcards(content);
    // Prefer structured rawData from Super Admin / AI Tool Data when markdown parse is empty.
    if (
      !parsedCards.length &&
      rawContent &&
      typeof rawContent === 'object' &&
      !Array.isArray(rawContent)
    ) {
      parsedCards = parseFlashcards(JSON.stringify({ raw: rawContent }));
    }
    setDeckTitle(
      tryParseDeckTitle(content) ||
        String(
          (rawContent as Record<string, unknown> | null | undefined)?.flashcard_deck_title ||
            (rawContent as Record<string, unknown> | null | undefined)?.deck_title ||
            (rawContent as Record<string, unknown> | null | undefined)?.title ||
            '',
        ).trim(),
    );
    setTeacherMeta(
      variant === 'teacher' ? tryParseTeacherDeckMeta(content, rawContent) : null,
    );
    setAllCards(parsedCards);
    setActiveCategory('all');
    setCurrentIndex(0);
    setIsFlipped(false);
    
    // Auto-select first available type if current type has no cards
    if (activeType !== 'all' && parsedCards.length > 0) {
      const hasType = parsedCards.some(c => c.type === activeType);
      if (!hasType) {
        // Switch to first available type
        if (parsedCards.some(c => c.type === 'question')) {
          setActiveType('question');
        } else if (parsedCards.some(c => c.type === 'note')) {
          setActiveType('note');
        } else if (parsedCards.some(c => c.type === 'fact')) {
          setActiveType('fact');
        } else {
          setActiveType('all');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, variant, rawContent]);
  
  useEffect(() => {
    // Reset to first card when type changes
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [activeType, activeCategory]);

  useEffect(() => {
    // Reset flip when card changes
    setIsFlipped(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, currentIndex, cards.length]);

  if (allCards.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
        <Layers className="mx-auto h-10 w-10 text-slate-300 mb-3" aria-hidden />
        <p className="text-sm font-medium text-slate-700">No flashcards in this content</p>
        <p className="text-xs text-slate-500 mt-1">Generate or upload a deck with front and back on each card.</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
        <p className="text-sm font-medium text-slate-700">No {activeType} cards in this filter</p>
        <p className="text-xs text-slate-500 mt-1">Try another category above.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  
  // Get card styling based on type
  const getCardStyles = (type?: CardType) => {
    switch (type) {
      case 'question':
        return {
          front: 'from-violet-50 via-indigo-50 to-blue-50 border-violet-200/90',
          back: 'from-indigo-50 via-purple-50 to-violet-100 border-purple-200/90',
          label: 'text-violet-600',
          labelText: 'Front'
        };
      case 'note':
        return {
          front: 'from-green-50 to-emerald-100 border-green-200',
          back: 'from-emerald-50 to-teal-100 border-emerald-200',
          label: 'text-green-600',
          labelText: 'Important Note'
        };
      case 'fact':
        return {
          front: 'from-orange-50 to-amber-100 border-orange-200',
          back: 'from-amber-50 to-yellow-100 border-amber-200',
          label: 'text-orange-600',
          labelText: 'Quick Fact'
        };
      default:
        return {
          front: 'from-violet-50 via-indigo-50 to-blue-50 border-violet-200/90',
          back: 'from-indigo-50 via-purple-50 to-violet-100 border-purple-200/90',
          label: 'text-violet-600',
          labelText: 'Front'
        };
    }
  };
  
  const cardStyles = getCardStyles(currentCard.type);
  const showLegacyTypeTabs = noteCount > 0 || factCount > 0;
  const studyFieldEntries = STUDY_FIELD_META.map((meta) => ({
    ...meta,
    value: String(currentCard[meta.key] || '').trim(),
  })).filter((f) => f.value.length > 0);
  const showStudyPanel = studyFieldEntries.length > 0 || !showLegacyTypeTabs;

  if (variant === 'student' && !embedded) {
    return null;
  }

  if (variant === 'student' && embedded) {
    const embeddedExtras = [
      currentCard.difficultyTag
        ? { label: 'Difficulty', value: currentCard.difficultyTag, className: 'bg-amber-100 text-amber-900' }
        : null,
      currentCard.memoryHookQuickTip || currentCard.memoryCue
        ? {
            label: 'Memory hook',
            value: currentCard.memoryHookQuickTip || currentCard.memoryCue || '',
            className: 'bg-yellow-100 text-yellow-900',
          }
        : null,
      currentCard.selfCheckRound
        ? { label: 'Self-check', value: currentCard.selfCheckRound, className: 'bg-teal-100 text-teal-900' }
        : null,
    ].filter(Boolean) as { label: string; value: string; className: string }[];

    return (
      <div className="w-full space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <Badge variant="secondary" className="bg-violet-100 text-violet-900 hover:bg-violet-100 text-xs">
            Card {currentIndex + 1} of {cards.length}
          </Badge>
          <span className="text-[11px] text-slate-500">Tap or Space to flip</span>
        </div>

        <div className="relative w-full" style={{ perspective: '900px' }}>
          <motion.div
            className="relative h-[200px] sm:h-[220px] w-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="relative h-full w-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.45, type: 'spring', stiffness: 200, damping: 24 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-violet-200 bg-white shadow-md cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                <div className="border-b border-violet-100 bg-violet-50 px-3 py-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    Question
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center px-3 py-2 text-center min-h-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug overflow-y-auto max-h-full line-clamp-6">
                    {currentCard.front}
                  </p>
                </div>
                <div className="border-t border-violet-100 py-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                    className="h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs px-4"
                  >
                    <BookOpen className="mr-1 h-3 w-3" />
                    Show answer
                  </Button>
                </div>
              </motion.div>

              <motion.div
                className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white shadow-md"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Answer
                  </span>
                </div>
                <div
                  className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-2 text-center min-h-0 cursor-pointer overflow-y-auto"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-5">
                    {currentCard.back}
                  </p>
                  {embeddedExtras.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-1.5 w-full">
                      {embeddedExtras.map((chip) => (
                        <span
                          key={chip.label}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.className}`}
                          title={chip.value}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-indigo-100 py-2 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                    className="h-8 rounded-full border-indigo-200 text-indigo-800 text-xs px-3"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Back
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50/60 p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={currentIndex === 0}
            onClick={() => {
              setCurrentIndex((p) => p - 1);
              setIsFlipped(false);
            }}
            className="h-8 w-8 shrink-0 rounded-full text-violet-800 hover:bg-violet-100 disabled:opacity-30"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 justify-center gap-1 flex-wrap px-1">
            {cards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Card ${idx + 1}`}
                aria-current={idx === currentIndex}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsFlipped(false);
                }}
                className={`rounded-full transition-all ${
                  idx === currentIndex
                    ? 'h-2 w-6 bg-violet-600'
                    : 'h-2 w-2 bg-violet-300 hover:bg-violet-400'
                }`}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={currentIndex >= cards.length - 1}
            onClick={() => {
              setCurrentIndex((p) => p + 1);
              setIsFlipped(false);
            }}
            className="h-8 w-8 shrink-0 rounded-full text-violet-800 hover:bg-violet-100 disabled:opacity-30"
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'teacher') {
    const meta = teacherMeta;
    const displayTitle = meta?.title || deckTitle || 'Flashcard deck';
    const topicLabel =
      meta?.topic ||
      (meta?.topicAndSubtopicLink ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/)[0]?.trim() : '');
    const subtopicLabel =
      meta?.subtopic ||
      (meta?.topicAndSubtopicLink
        ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/).slice(1).join(' — ').trim()
        : '');

    const contextChips = [
      topicLabel ? { label: 'Topic', value: topicLabel } : null,
      subtopicLabel ? { label: 'Subtopic', value: subtopicLabel } : null,
      meta?.classLevel ? { label: 'Class', value: meta.classLevel } : null,
      meta?.difficultyLevel ? { label: 'Difficulty', value: meta.difficultyLevel } : null,
      meta?.bloomLevel ? { label: "Bloom's", value: meta.bloomLevel } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const cardExtras = [
      currentCard.difficultyTag
        ? { label: 'Difficulty', value: currentCard.difficultyTag }
        : null,
      currentCard.memoryHookQuickTip || currentCard.memoryCue
        ? {
            label: 'Memory Hook',
            value: currentCard.memoryHookQuickTip || currentCard.memoryCue || '',
          }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const blockClass =
      'rounded-2xl border border-indigo-100/90 bg-white shadow-sm overflow-hidden';
    const blockHead =
      'px-4 py-2.5 sm:px-5 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/80 to-violet-50/50';
    const blockTitle = 'text-xs font-bold uppercase tracking-wide text-indigo-700';

    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wide">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Context
          <span className="h-px flex-1 bg-indigo-100" />
          Foundations
          <span className="h-px flex-1 bg-indigo-100" />
          HOTS
          <span className="h-px flex-1 bg-indigo-100" />
          Study Aids
          <span className="h-px flex-1 bg-indigo-100" />
          Wrap-Up
        </div>

        <section className={blockClass}>
          <div className={blockHead}>
            <p className={blockTitle}>1 · Context &amp; Alignment</p>
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">{displayTitle}</h3>
            {contextChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contextChips.map((chip) => (
                  <Badge
                    key={chip.label}
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-900 border border-indigo-100 font-normal px-3 py-1"
                  >
                    <span className="font-semibold mr-1">{chip.label}:</span>
                    {chip.value}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className={blockClass}>
          <div className={blockHead}>
            <p className={blockTitle}>2 · Foundations</p>
          </div>
          <div className="p-4 sm:p-5 space-y-3 text-sm text-slate-800">
            {meta?.priorKnowledgeRequired ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Prior Knowledge</p>
                <p className="mt-1 leading-relaxed">{meta.priorKnowledgeRequired}</p>
              </div>
            ) : null}
            {meta?.learningObjectives?.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Learning Objectives</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {meta.learningObjectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {meta?.ncfCompetencyAlignment ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">NCF Competency</p>
                <p className="mt-1 leading-relaxed">{meta.ncfCompetencyAlignment}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white via-violet-50/20 to-indigo-50/30 shadow-lg">
          <div className="border-b border-violet-100 bg-white/80 px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={blockTitle}>3 · The Card Set: Application &amp; HOTS</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {allCards.length} task{allCards.length === 1 ? '' : 's'}
              </p>
            </div>
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">
              Card {currentIndex + 1} of {cards.length}
            </Badge>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 min-h-[140px] flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-2">
                  Task
                </p>
                <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed flex-1">
                  {currentCard.front}
                </p>
              </div>
              <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 min-h-[140px] flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-2">
                  Solution
                </p>
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed flex-1">
                  {currentCard.back}
                </p>
              </div>
            </div>
            {cardExtras.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cardExtras.map((chip) => (
                  <span
                    key={chip.label}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs text-amber-950"
                  >
                    <span className="font-semibold">{chip.label}: </span>
                    {chip.value}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex flex-wrap justify-center gap-1.5 flex-1 px-2">
                {cards.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Card ${idx + 1}`}
                    aria-current={idx === currentIndex}
                    onClick={() => setCurrentIndex(idx)}
                    className={`rounded-full transition-all ${
                      idx === currentIndex
                        ? 'h-2 w-6 bg-violet-600'
                        : 'h-2 w-2 bg-violet-300 hover:bg-violet-400'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex >= cards.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className={blockClass}>
          <div className={blockHead}>
            <p className={blockTitle}>4 · Study Aids</p>
          </div>
          <div className="p-4 sm:p-5 space-y-3 text-sm text-slate-800">
            {meta?.deckMemoryHook ? (
              <div className="flex gap-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                <Lightbulb className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" aria-hidden />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-amber-800">Memory Hook</p>
                  <p className="mt-1">{meta.deckMemoryHook}</p>
                </div>
              </div>
            ) : null}
            {meta?.commonMistakesToAvoid?.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Common Mistakes</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  {meta.commonMistakesToAvoid.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {meta?.selfCheckRapidRecallRound ? (
              <div className="flex gap-3 rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                <Zap className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" aria-hidden />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-teal-800">Rapid Recall</p>
                  <p className="mt-1">{meta.selfCheckRapidRecallRound}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className={blockClass}>
          <div className={blockHead}>
            <p className={blockTitle}>5 · Wrap-Up</p>
          </div>
          <div className="p-4 sm:p-5 grid gap-3 sm:grid-cols-3 text-sm text-slate-800">
            {meta?.realLifeConnection ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Real-life</p>
                <p className="mt-1 leading-relaxed">{meta.realLifeConnection}</p>
              </div>
            ) : null}
            {meta?.differentiationSupport ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Differentiation</p>
                <p className="mt-1 leading-relaxed">{meta.differentiationSupport}</p>
              </div>
            ) : null}
            {meta?.reflectionExitTicket ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Exit Ticket</p>
                <p className="mt-1 leading-relaxed">{meta.reflectionExitTicket}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white via-violet-50/30 to-indigo-50/40 shadow-lg shadow-violet-200/20">
        {/* Header */}
        <div className="border-b border-violet-100/80 bg-white/70 px-4 py-3 sm:px-5 sm:py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
                <Layers className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">
                  Flashcard deck
                </p>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                  {deckTitle || 'Study cards'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {allCards.length} card{allCards.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-violet-200 bg-violet-50 text-violet-800 font-medium"
            >
              Card {currentIndex + 1} of {cards.length}
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
      {/* Legacy MCQ / notes / facts decks only */}
      {showLegacyTypeTabs ? (
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={activeType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('all')}
          className="relative"
        >
          All
          <span className="ml-2 text-xs opacity-75">({allCards.length})</span>
        </Button>
        <Button
          variant={activeType === 'question' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('question')}
          className="relative"
          disabled={questionCount === 0}
        >
          Questions
          <span className="ml-2 text-xs opacity-75">({questionCount})</span>
        </Button>
        <Button
          variant={activeType === 'note' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('note')}
          className="relative"
          disabled={noteCount === 0}
        >
          Important Notes
          <span className="ml-2 text-xs opacity-75">({noteCount})</span>
        </Button>
        <Button
          variant={activeType === 'fact' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveType('fact')}
          className="relative"
          disabled={factCount === 0}
        >
          Facts
          <span className="ml-2 text-xs opacity-75">({factCount})</span>
        </Button>
      </div>
      ) : null}

      <p className="text-center text-[11px] sm:text-xs text-slate-500">
        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
          Space
        </kbd>{' '}
        flip ·{' '}
        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
          ←
        </kbd>{' '}
        <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
          →
        </kbd>{' '}
        navigate
      </p>

      {/* Flashcard */}
      <div className="relative w-full z-10" style={{ perspective: '1000px' }}>
        <motion.div
          className="relative min-h-[420px] h-[min(480px,70vh)] w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="relative w-full h-full"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of card */}
            <motion.div
              className={`absolute inset-0 w-full h-full bg-gradient-to-br ${cardStyles.front} rounded-2xl shadow-xl border border-violet-200/80 ring-1 ring-white/60 p-4 sm:p-6 lg:p-8 flex flex-col cursor-pointer overflow-hidden`}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-300/20 blur-2xl" />
              <div className="text-center space-y-4 w-full flex flex-col flex-1 min-h-0 justify-between relative">
                <div className="flex items-center justify-center shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${cardStyles.label} shadow-sm`}
                  >
                  {cardStyles.labelText}
                  </span>
                </div>
                <div className="text-base sm:text-lg lg:text-xl font-medium text-slate-900 leading-relaxed w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 [scrollbar-width:thin]">
                  {currentCard.front}
                </div>
                {currentCard.options && currentCard.options.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {currentCard.options.map((option, idx) => (
                      <div key={idx} className="text-left text-gray-700 bg-white/50 rounded-lg p-3">
                        {option}
                      </div>
                    ))}
                  </div>
                )}
                <div className="shrink-0 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                    className="rounded-full bg-white/95 hover:bg-white border-violet-300 text-violet-800 shadow-md px-6"
                    type="button"
                  >
                    Reveal answer
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Back of card */}
            <motion.div
              className={`absolute inset-0 w-full h-full bg-gradient-to-br ${cardStyles.back} rounded-2xl shadow-xl border border-indigo-200/80 ring-1 ring-white/60 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden`}
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl" />
              <div className="text-center space-y-4 w-full flex-1 flex flex-col items-center min-h-0 relative">
                <div 
                  className="cursor-pointer w-full flex flex-col flex-1 min-h-0"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="flex items-center justify-center shrink-0 mb-3">
                    <span
                      className={`inline-flex items-center rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${cardStyles.label} shadow-sm`}
                    >
                      Back
                    </span>
                  </div>
                  <div className="text-base sm:text-lg lg:text-xl font-medium text-slate-900 leading-relaxed flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 [scrollbar-width:thin]">
                    {currentCard.back}
                  </div>
                </div>
              </div>
              <div className="shrink-0 pt-3 relative z-50 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="rounded-full bg-white/95 hover:bg-white border-indigo-300 text-indigo-800 shadow-md pointer-events-auto px-6"
                  type="button"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Show front
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
        <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
                setIsFlipped(false);
            }
          }}
          disabled={currentIndex === 0}
            className="h-9 w-9 shrink-0 rounded-full border-slate-200"
          type="button"
            aria-label="Previous card"
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${
                  currentCard.type === 'note'
                    ? 'from-emerald-500 to-teal-500'
                    : currentCard.type === 'fact'
                      ? 'from-amber-500 to-orange-500'
                      : 'from-violet-500 via-indigo-500 to-purple-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
            </div>
            <div className="flex justify-center gap-1.5 flex-wrap">
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Go to card ${idx + 1}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-6 bg-violet-600'
                      : 'w-2 bg-slate-300 hover:bg-violet-300'
                  }`}
                />
              ))}
            </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentIndex < cards.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setIsFlipped(false);
            }
          }}
          disabled={currentIndex === cards.length - 1}
            className="h-9 w-9 shrink-0 rounded-full border-slate-200"
          type="button"
            aria-label="Next card"
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
        </div>
      </div>

      {showStudyPanel && studyFieldEntries.length > 0 ? (
        <motion.div
          key={`study-${currentIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/90 shrink-0">
              Study boosters
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {studyFieldEntries.map((field) => (
              <StudyFieldTile
                key={field.key}
                label={field.label}
                value={field.value}
                icon={field.icon}
                chip={field.chip}
                iconBg={field.iconBg}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
        </div>
      </div>
    </div>
  );
}

function stripMdBold(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

const TEMPLATE_FIELD_LABELS = [
  'Difficulty Tag for Each Card',
  'Memory Hook / Quick Tip',
  'Self-Check Round',
  'Memory Cue',
  'Skill Focus',
  'Example Use',
  'Peer Prompt',
  'Reflection',
] as const;

function pickLabeledField(block: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stopLabels = ['Front', 'Back', ...TEMPLATE_FIELD_LABELS]
    .filter((l) => l.toLowerCase() !== label.toLowerCase())
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const re = new RegExp(
    `\\*\\*${escaped}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*(?:${stopLabels}):|\\n+---|\\n+##|$)`,
    'i',
  );
  const m = block.match(re);
  return m ? stripMdBold(m[1].trim()) : '';
}

function pickFirstLabeledField(block: string, labels: string[]): string {
  for (const label of labels) {
    const v = pickLabeledField(block, label);
    if (v) return v;
  }
  return '';
}

/** Front/Back or Task/Solution template blocks */
function parseSevenFieldTemplateBlock(block: string): Flashcard | null {
  const hasFace =
    /\*\*(?:Front|Task):\*\*/i.test(block) ||
    /###\s*(?:Front|Task):/i.test(block) ||
    /\bTask:/i.test(block);
  if (!hasFace) return null;

  let front = '';
  let back = '';

  const taskBold = block.match(/\*\*Task:\*\*\s*([\s\S]*?)(?=\n\s*\*\*Solution:\*\*)/i);
  const solutionBold = block.match(
    /\*\*Solution:\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:Difficulty|Memory Hook|Memory Cue|Self-Check|Front|Back|Task)[^*]*:\*|\n+---|\n+##\s*(?:Card|Flashcard)|$)/i,
  );
  if (taskBold && solutionBold) {
    front = stripMdBold(taskBold[1].trim());
    back = stripMdBold(solutionBold[1].trim());
  }

  const frontBold = block.match(/\*\*Front:\*\*\s*([\s\S]*?)(?=\n\s*\*\*Back:\*\*)/i);
  const backBold = block.match(
    /\*\*Back:\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:Difficulty Tag|Memory Hook|Memory Cue|Self-Check Round|Skill Focus|Example Use|Peer Prompt|Reflection|Task|Solution)[^*]*:\*|\n+---|\n+##\s*(?:Card|Flashcard)|$)/i,
  );
  if (!front && frontBold && backBold) {
    front = stripMdBold(frontBold[1].trim());
    back = stripMdBold(backBold[1].trim());
  } else if (!front) {
    const frontH = block.match(/###\s*Front:\s*\n+([\s\S]*?)(?=\n+\s*###\s*Back:)/i);
    const backH = block.match(
      /###\s*Back:\s*\n+([\s\S]*?)(?=\n+\*\*(?:Memory Cue|Skill Focus)|\n+---|\n+##|$)/i,
    );
    if (frontH && backH) {
      front = stripMdBold(frontH[1].trim());
      back = stripMdBold(backH[1].trim());
    }
  }

  if (!front || !back) return null;

  const difficultyTag = pickFirstLabeledField(block, [
    'Difficulty Tag for Each Card',
    'Difficulty Tag',
    'Skill Focus',
  ]);
  const memoryHookQuickTip = pickFirstLabeledField(block, [
    'Memory Hook / Quick Tip',
    'Memory Hook',
    'Memory Cue',
  ]);
  const selfCheckRound = pickFirstLabeledField(block, [
    'Self-Check Round',
    'Peer Prompt',
    'Reflection',
  ]);

  return {
    front,
    back,
    difficultyTag,
    memoryHookQuickTip,
    memoryCue: memoryHookQuickTip || pickLabeledField(block, 'Memory Cue'),
    skillFocus: pickLabeledField(block, 'Skill Focus'),
    selfCheckRound,
    exampleUse: pickLabeledField(block, 'Example Use'),
    peerPrompt: pickLabeledField(block, 'Peer Prompt'),
    reflection: pickLabeledField(block, 'Reflection'),
    type: 'question',
  };
}

function parseSevenFieldDeckMarkdown(text: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const bySeparator = text
    .split(/\n---\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of bySeparator) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  const byCardHeading = text.split(/(?=\n?##\s*Card\s+\d+)/i).map((c) => c.trim()).filter(Boolean);
  for (const chunk of byCardHeading) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  const byFront = text.split(/(?=\*\*Front:\*\*)/i).map((c) => c.trim()).filter(Boolean);
  for (const chunk of byFront) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  return cards;
}

function tryParseDeckTitle(content: string): string {
  const trimmed = String(content || '').trim();
  if (!trimmed.startsWith('{')) return '';
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const raw = parsed.raw as Record<string, unknown> | undefined;
    const title = String(
      raw?.flashcard_deck_title ||
        raw?.deck_title ||
        raw?.title ||
        parsed.flashcard_deck_title ||
        parsed.deck_title ||
        parsed.title ||
        '',
    ).trim();
    return title;
  } catch {
    return '';
  }
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  const s = String(value || '').trim();
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function rawRecordFromContent(
  content: string,
  rawContent?: unknown,
): Record<string, unknown> | null {
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    return rawContent as Record<string, unknown>;
  }
  const trimmed = String(content || '').trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return (parsed.raw as Record<string, unknown> | undefined) || parsed;
  } catch {
    return null;
  }
}

function tryParseTeacherDeckMeta(content: string, rawContent?: unknown): TeacherDeckMeta | null {
  const raw = rawRecordFromContent(content, rawContent);
  if (!raw) return null;
  const title = String(raw.flashcard_deck_title || raw.deck_title || raw.title || '').trim();
  const topic = String(raw.topic || '').trim();
  const subtopic = String(raw.subtopic || raw.sub_topic || '').trim();
  const topicLink = String(raw.topic_and_subtopic_link || raw.subtopic_link || '').trim();
  if (!title && !topic && !subtopic && !topicLink) return null;
  return {
    title: title || 'Flashcard deck',
    topic,
    subtopic,
    topicAndSubtopicLink: topicLink,
    classLevel: String(raw.class_level || raw.classLabel || raw.class || '').trim(),
    difficultyLevel: String(raw.difficulty_level || raw.difficulty || 'Medium').trim(),
    bloomLevel: String(raw.bloom_level || raw.bloom || 'Apply / Analyze').trim(),
    priorKnowledgeRequired: String(raw.prior_knowledge_required || '').trim(),
    learningObjectives: toStringList(raw.learning_objectives || raw.objectives),
    ncfCompetencyAlignment: String(
      raw.ncf_competency_alignment || raw.learning_outcome_alignment || '',
    ).trim(),
    deckMemoryHook: String(
      raw.deck_memory_hook || raw.memory_hook_quick_tip || raw.memory_cue || '',
    ).trim(),
    selfCheckRapidRecallRound: String(
      raw.self_check_rapid_recall_round || raw.self_check_round || '',
    ).trim(),
    commonMistakesToAvoid: toStringList(raw.common_mistakes_to_avoid),
    differentiationSupport: String(raw.differentiation_support || '').trim(),
    realLifeConnection: String(raw.real_life_connection || raw.real_life_application || '').trim(),
    reflectionExitTicket: String(raw.reflection_exit_ticket || raw.reflection || '').trim(),
  };
}

function collectCardsFromRaw(raw: Record<string, unknown>): Record<string, unknown>[] {
  const lists = [
    raw.application_hots_cards,
    raw.application_cards,
    raw.cards,
    raw.flashcard_set,
    raw.flashcards,
    raw.concept_and_definition_cards,
    raw.formula_rule_cards,
    raw.formula_cards,
    raw.visual_diagram_suggestion_cards,
    raw.visual_cards,
  ];
  const out: Record<string, unknown>[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list as Record<string, unknown>[]) {
      if (item && typeof item === 'object') out.push(item);
    }
  }
  return out;
}

/** Normalize objects from JSON / API into { front, back, type? } */
function cardFromLooseObject(item: Record<string, unknown>): Flashcard | null {
  const front =
    (item.front as string) ||
    (item.task as string) ||
    (item.question as string) ||
    (item.term as string) ||
    (item.title as string);
  const back =
    (item.back as string) ||
    (item.solution as string) ||
    (item.correct_answer as string) ||
    (item.answer as string) ||
    (item.content as string) ||
    (item.explanation as string);
  if (!front || !back) return null;
  const typeRaw = (item.type as string) || 'question';
  const type =
    typeRaw === 'note' || typeRaw === 'fact' || typeRaw === 'question'
      ? (typeRaw as CardType)
      : 'question';
  const backStr = stripMdBold(String(back));
  const frontStr = stripMdBold(String(front));
  const cardCategory = String(item.card_category || item.cardCategory || '').trim().toLowerCase();
  let card: Flashcard = {
    front: frontStr,
    back: backStr,
    type,
    cardCategory: cardCategory || undefined,
    difficultyTag: stripMdBold(
      String(
        item.difficulty_tag_for_each_card ||
          item.difficulty_tag ||
          item.difficultyTag ||
          item.skill_focus ||
          '',
      ),
    ),
    memoryHookQuickTip: stripMdBold(
      String(item.memory_hook_quick_tip || item.memory_hook || item.memory_cue || item.hint || ''),
    ),
    memoryCue: stripMdBold(
      String(item.memory_cue || item.memoryCue || item.hint || ''),
    ),
    skillFocus: stripMdBold(
      String(item.skill_focus || item.skillFocus || item.bloom_level || ''),
    ),
    exampleUse: stripMdBold(
      String(item.example_use || item.exampleUse || item.real_life_link || ''),
    ),
    peerPrompt: stripMdBold(String(item.peer_prompt || item.peerPrompt || '')),
    selfCheckRound: stripMdBold(
      String(item.self_check_round || item.selfCheckRound || item.peer_prompt || ''),
    ),
    reflection: stripMdBold(
      String(item.reflection || item.reflection_prompt || item.self_check || ''),
    ),
  };
  if (
    !card.memoryCue &&
    /\*\*(?:Memory Cue|Skill Focus):/i.test(backStr)
  ) {
    const parsed = parseSevenFieldTemplateBlock(
      `**Front:** ${frontStr}\n\n**Back:** ${backStr}`,
    );
    if (parsed) card = { ...parsed, type: card.type || parsed.type };
  }
  return card;
}

/** Legacy saves: multiple `{ formatted, raw }` objects concatenated with blank lines. */
function tryParseConcatenatedFlashcardEnvelopes(content: string): Flashcard[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  const chunks = trimmed
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('{'));
  if (chunks.length <= 1) return null;
  const merged: Flashcard[] = [];
  for (const chunk of chunks) {
    const parsed = tryParseSingleJsonFlashcardEnvelope(chunk);
    if (parsed?.length) merged.push(...parsed);
  }
  return merged.length ? merged : null;
}

/** JSON shapes: { raw: { flashcards } }, { cards }, { flashcards: [] }, etc. */
function tryParseSingleJsonFlashcardEnvelope(content: string): Flashcard[] | null {
  let text = content.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.formatted && typeof parsed.formatted === 'string') {
      const fromFormatted = parseSevenFieldDeckMarkdown(parsed.formatted as string);
      if (fromFormatted.length) return fromFormatted;
      const nested = tryParseJsonFlashcards(parsed.formatted as string);
      if (nested?.length) return nested;
      text = parsed.formatted as string;
    }
    const raw = parsed.raw as Record<string, unknown> | undefined;
    if (raw) {
      const merged = collectCardsFromRaw(raw);
      if (merged.length) {
        const out: Flashcard[] = [];
        for (const item of merged) {
          const c = cardFromLooseObject(item);
          if (c) out.push(c);
        }
        if (out.length) return out;
      }
    }
    const rawList = raw?.cards ?? raw?.flashcards;
    if (Array.isArray(rawList)) {
      const out: Flashcard[] = [];
      for (const item of rawList as Record<string, unknown>[]) {
        const c = cardFromLooseObject(item);
        if (c) out.push(c);
      }
      return out.length ? out : null;
    }
    if (Array.isArray(parsed.cards)) {
      const out: Flashcard[] = [];
      for (const item of parsed.cards as Record<string, unknown>[]) {
        const c = cardFromLooseObject(item);
        if (c) out.push(c);
      }
      return out.length ? out : null;
    }
    const fc = parsed.flashcards;
    if (Array.isArray(fc)) {
      const out: Flashcard[] = [];
      for (const item of fc as Record<string, unknown>[]) {
        const c = cardFromLooseObject(item);
        if (c) out.push(c);
      }
      return out.length ? out : null;
    }
    if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
      const grouped = fc as {
        questions?: Record<string, unknown>[];
        important_notes?: { title?: string; content?: string }[];
        facts?: { fact?: string }[];
      };
      const out: Flashcard[] = [];
      for (const q of grouped.questions || []) {
        const c = cardFromLooseObject(q);
        if (c) out.push(c);
      }
      for (const n of grouped.important_notes || []) {
        if (n.title && n.content) {
          out.push({
            front: stripMdBold(n.title),
            back: stripMdBold(n.content),
            type: 'note',
          });
        }
      }
      for (const f of grouped.facts || []) {
        if (f.fact) {
          out.push({
            front: 'Quick fact',
            back: stripMdBold(f.fact),
            type: 'fact',
          });
        }
      }
      return out.length ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}

function tryParseJsonFlashcards(content: string): Flashcard[] | null {
  const multi = tryParseConcatenatedFlashcardEnvelopes(content);
  if (multi?.length) return multi;
  return tryParseSingleJsonFlashcardEnvelope(content);
}

function parseOneStructuredSection(section: string): Flashcard | null {
  if (!section.trim()) return null;

  const typeMatch = section.match(/\*\*Type:\*\*\s*(question|note|fact)/i);
  const cardType = typeMatch ? (typeMatch[1].toLowerCase() as CardType) : 'question';

  const frontMatch = section.match(/###\s*Front:\s*\n+([\s\S]*?)(?=\n+\s*###\s*Back:)/i);
  let front = frontMatch ? frontMatch[1].trim() : '';

  const optionsMatch = section.match(/\*\*Options:\*\*\s*\n((?:- [^\n]+\n?)+)/);
  const options = optionsMatch
    ? optionsMatch[1]
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.replace(/^-\s*/, '').trim())
    : undefined;

  if (options && optionsMatch) {
    front = front.replace(/\*\*Options:\*\*\s*\n((?:- [^\n]+\n?)+)/, '').trim();
  }

  const backMatch = section.match(
    /###\s*Back:\s*\n+(?:\*\*Answer:\*\*\s*\n*)?([\s\S]*?)(?=\n+---|\n+##\s*(?:Flashcard|Card)\s*\d|\n*$)/i,
  );
  const back = backMatch ? backMatch[1].trim() : '';

  if (front && back) {
    return {
      front: stripMdBold(front),
      back: stripMdBold(back),
      options,
      type: cardType,
    };
  }
  return null;
}

/** **Front:** ... **Back:** pairs (7-field template) */
function parseFrontBackPairs(content: string): Flashcard[] {
  return parseSevenFieldDeckMarkdown(content);
}

function parseTaskSolutionPairs(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const chunks = content.split(/(?=\*\*Card\s*\d+\*\*)/i).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  const re =
    /\*\*Task:\*\*\s*([\s\S]*?)\n+\*\*Solution:\*\*\s*([\s\S]*?)(?=\n+\*\*Task:|\n+---|\n###\s*[45]\.|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const front = stripMdBold(m[1].trim());
    const back = stripMdBold(m[2].trim());
    if (front && back) cards.push({ front, back, type: 'question' });
  }
  return cards;
}

function parseQuestionAnswerPairs(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const re =
    /\*\*Question:\*\*\s*\n*([\s\S]*?)\n+\*\*Answer:\*\*\s*\n*([\s\S]*?)(?=\n\n\*\*Question:|\n\n##|\n##\s*(?:Flashcard|Card)|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const front = stripMdBold(m[1]);
    const back = stripMdBold(m[2]);
    if (front && back) cards.push({ front, back, type: 'question' });
  }
  return cards;
}

/**
 * Common Gemini / template output: "Card 1 Front: ... Back: ..." (repeated per card).
 * Splits on each "Card N" block and extracts Front/Back fields.
 */
function parseCardNumberFrontBackTemplate(text: string): Flashcard[] {
  const t = text.trim();
  if (!/\bCard\s*\d+\b/i.test(t) || !/Front:/i.test(t) || !/Back:/i.test(t)) {
    return [];
  }

  const cards: Flashcard[] = [];
  const chunks = t.split(/(?=\bCard\s*\d+\b)/i).map((c) => c.trim()).filter(Boolean);

  for (const chunk of chunks) {
    if (!/^Card\s*\d+/i.test(chunk)) continue;
    const afterCard = chunk.replace(/^Card\s*\d+\s*/i, '').trim();
    const fb = afterCard.match(/Front:\s*([\s\S]*?)\s*Back:\s*([\s\S]*)$/i);
    if (fb) {
      const front = stripMdBold(fb[1].trim());
      const back = stripMdBold(fb[2].trim());
      if (front && back) {
        cards.push({ front, back, type: 'question' });
      }
    }
  }

  return cards;
}

function parseFlashcards(content: string): Flashcard[] {
  const jsonCards = tryParseJsonFlashcards(content);
  if (jsonCards?.length) return jsonCards;

  let text = content;
  try {
    const p = JSON.parse(content) as { formatted?: string };
    if (p?.formatted && typeof p.formatted === 'string') {
      text = p.formatted;
    }
  } catch {
    /* use content */
  }

  const cards: Flashcard[] = [];

  let sections = text.split(/##\s*Flashcard\s*\d+/gi);
  if (sections.length <= 1) {
    sections = text.split(/##\s*Card\s*\d+/gi);
  }

  for (let i = 1; i < sections.length; i++) {
    const card =
      parseSevenFieldTemplateBlock(sections[i]) || parseOneStructuredSection(sections[i]);
    if (card) cards.push(card);
  }

  if (cards.length === 0) {
    const sevenField = parseSevenFieldDeckMarkdown(text);
    if (sevenField.length) return sevenField;
  }

  if (cards.length === 0) {
    const taskSolution = parseTaskSolutionPairs(text);
    if (taskSolution.length) return taskSolution;
  }

  if (cards.length === 0) {
    const templateCards = parseCardNumberFrontBackTemplate(text);
    if (templateCards.length) return templateCards;
  }

  if (cards.length === 0) {
    const pairs = parseFrontBackPairs(text);
    if (pairs.length) return pairs;
  }

  if (cards.length === 0) {
    const qa = parseQuestionAnswerPairs(text);
    if (qa.length) return qa;
  }

  if (cards.length === 0) {
    const lines = text.split('\n');
    let currentCard: Partial<Flashcard> = {};
    let inFront = false;
    let inBack = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/Flashcard\s*\d|###\s*Front:/i.test(line)) {
        if (currentCard.front && currentCard.back) {
          cards.push({
            ...currentCard,
            front: stripMdBold(String(currentCard.front)),
            back: stripMdBold(String(currentCard.back)),
          } as Flashcard);
        }
        currentCard = {};
        inFront = true;
        inBack = false;
        continue;
      }

      if (/###\s*Back:/i.test(line) || /\*\*Answer:\*\*/i.test(line)) {
        inFront = false;
        inBack = true;
        if (/\*\*Answer:\*\*/i.test(line)) {
          currentCard.back = line.replace(/\*\*Answer:\*\*\s*/i, '').trim();
        }
        continue;
      }

      if (inFront && line.trim() && !line.startsWith('**Options:**')) {
        if (!currentCard.front) {
          currentCard.front = line.trim();
        } else {
          currentCard.front += ' ' + line.trim();
        }
      }

      if (inBack && line.trim() && !/\*\*Answer:\*\*/i.test(line)) {
        if (!currentCard.back) {
          currentCard.back = line.trim();
        } else {
          currentCard.back += ' ' + line.trim();
        }
      }

      if (line.includes('**Options:**')) {
        const optionLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('-')) {
          optionLines.push(lines[j].trim().replace(/^-\s*/, ''));
          j++;
        }
        if (optionLines.length > 0) {
          currentCard.options = optionLines;
        }
        i = j - 1;
      }
    }

    if (currentCard.front && currentCard.back) {
      cards.push({
        ...currentCard,
        front: stripMdBold(String(currentCard.front)),
        back: stripMdBold(String(currentCard.back)),
      } as Flashcard);
    }
  }

  return cards;
}

export function getFlashcardsFromContent(content: string): Flashcard[] {
  return parseFlashcards(content);
}
