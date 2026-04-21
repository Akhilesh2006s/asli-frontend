import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface Flashcard {
  front: string;
  back: string;
  options?: string[];
  type?: CardType;
}

interface FlashcardViewerProps {
  content: string;
}

export function FlashcardViewer({ content }: FlashcardViewerProps) {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [activeType, setActiveType] = useState<CardType | 'all'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Filter cards based on active type
  const cards = activeType === 'all' 
    ? allCards 
    : allCards.filter(card => card.type === activeType);
  
  // Count cards by type
  const questionCount = allCards.filter(c => c.type === 'question').length;
  const noteCount = allCards.filter(c => c.type === 'note').length;
  const factCount = allCards.filter(c => c.type === 'fact').length;

  useEffect(() => {
    // Parse flashcard content from markdown
    const parsedCards = parseFlashcards(content);
    setAllCards(parsedCards);
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
  }, [content]);
  
  useEffect(() => {
    // Reset to first card when type changes
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [activeType]);

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
      <div className="text-center py-12 text-gray-500">
        <p>No flashcards found in the generated content.</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No {activeType} cards found. Try selecting a different category.</p>
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
          labelText: 'Question'
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
          labelText: 'Card'
        };
    }
  };
  
  const cardStyles = getCardStyles(currentCard.type);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 relative">
      {/* Type Filter Buttons */}
      <div className="flex gap-2 mb-4">
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

      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center">
        <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Space</kbd> to flip, <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd> / <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd> to navigate</p>
      </div>

      {/* Flashcard — fixed height, scroll inside faces (matches tool template) */}
      <div className="relative w-full max-w-2xl z-10" style={{ perspective: '1000px' }}>
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
              className={`absolute inset-0 w-full h-full bg-gradient-to-br ${cardStyles.front} rounded-2xl shadow-xl border-2 p-6 sm:p-8 flex flex-col items-center justify-between cursor-pointer overflow-hidden`}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="text-center space-y-3 w-full flex flex-col flex-1 min-h-0 justify-between">
                <div className={`text-xs font-semibold ${cardStyles.label} uppercase tracking-wider shrink-0`}>
                  {cardStyles.labelText}
                </div>
                <div className="text-lg sm:text-xl font-medium text-gray-900 leading-relaxed w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 [scrollbar-width:thin]">
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
                    className="bg-white/90 hover:bg-white border-violet-200 text-violet-800 shadow-sm"
                    type="button"
                  >
                    See answer
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Back of card */}
            <motion.div
              className={`absolute inset-0 w-full h-full bg-gradient-to-br ${cardStyles.back} rounded-2xl shadow-xl border-2 p-6 sm:p-8 flex flex-col items-center justify-between overflow-hidden`}
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-center space-y-3 w-full flex-1 flex flex-col items-center min-h-0">
                <div 
                  className="cursor-pointer w-full flex flex-col flex-1 min-h-0"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className={`text-xs font-semibold ${cardStyles.label} uppercase tracking-wider shrink-0 mb-2`}>
                    Answer
                  </div>
                  <div className="text-lg sm:text-xl font-medium text-gray-900 leading-relaxed flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 [scrollbar-width:thin]">
                    {currentCard.back}
                  </div>
                </div>
              </div>
              <div className="shrink-0 pt-3 relative z-50" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="bg-white/90 hover:bg-white border-violet-200 text-violet-800 shadow-md pointer-events-auto"
                  type="button"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Flip back
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center space-x-4 w-full max-w-2xl z-50 relative mt-4">
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentIndex > 0) {
              setCurrentIndex(prev => prev - 1);
              setIsFlipped(false); // Reset flip when navigating
            }
          }}
          disabled={currentIndex === 0}
          className="rounded-full pointer-events-auto"
          type="button"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Progress bar */}
        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden pointer-events-none">
          <motion.div
            className={`h-full bg-gradient-to-r ${
              currentCard.type === 'question' ? 'from-violet-500 via-indigo-500 to-purple-600' :
              currentCard.type === 'note' ? 'from-green-500 to-emerald-600' :
              currentCard.type === 'fact' ? 'from-orange-500 to-amber-600' :
              'from-violet-500 via-indigo-500 to-purple-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentIndex < cards.length - 1) {
              setCurrentIndex(prev => prev + 1);
              setIsFlipped(false); // Reset flip when navigating
            }
          }}
          disabled={currentIndex === cards.length - 1}
          className="rounded-full pointer-events-auto"
          type="button"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Card counter */}
      <div className="text-sm text-gray-600">
        {currentIndex + 1} / {cards.length} cards
      </div>
    </div>
  );
}

function stripMdBold(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

/** Normalize objects from JSON / API into { front, back, type? } */
function cardFromLooseObject(item: Record<string, unknown>): Flashcard | null {
  const front =
    (item.front as string) ||
    (item.question as string) ||
    (item.term as string) ||
    (item.title as string);
  const back =
    (item.back as string) ||
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
  return { front: stripMdBold(String(front)), back: stripMdBold(String(back)), type };
}

/** JSON shapes: { raw: { flashcards } }, { cards }, { flashcards: [] }, etc. */
function tryParseJsonFlashcards(content: string): Flashcard[] | null {
  let text = content.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.formatted && typeof parsed.formatted === 'string') {
      const nested = tryParseJsonFlashcards(parsed.formatted as string);
      if (nested?.length) return nested;
      text = parsed.formatted as string;
    }
    const raw = parsed.raw as Record<string, unknown> | undefined;
    if (raw?.flashcards && Array.isArray(raw.flashcards)) {
      const out: Flashcard[] = [];
      for (const item of raw.flashcards as Record<string, unknown>[]) {
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

/** **Front:** ... **Back:** pairs (common Gemini free-form) */
function parseFrontBackPairs(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const re =
    /\*\*Front:\*\*\s*\n*([\s\S]*?)\n+\*\*Back:\*\*\s*\n*([\s\S]*?)(?=\n\n\*\*Front:|\n\n##|\n##\s*(?:Flashcard|Card)|$)/gi;
  let m: RegExpExecArray | null;
  const copy = content;
  while ((m = re.exec(copy)) !== null) {
    const front = stripMdBold(m[1]);
    const back = stripMdBold(m[2]);
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
    const card = parseOneStructuredSection(sections[i]);
    if (card) cards.push(card);
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

