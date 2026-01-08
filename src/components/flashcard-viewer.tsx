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

interface Flashcard {
  front: string;
  back: string;
  options?: string[];
}

interface FlashcardViewerProps {
  content: string;
}

export function FlashcardViewer({ content }: FlashcardViewerProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Parse flashcard content from markdown
    const parsedCards = parseFlashcards(content);
    setCards(parsedCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [content]);

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

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No flashcards found in the generated content.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6 relative">
      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center">
        <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Space</kbd> to flip, <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd> / <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd> to navigate</p>
      </div>

      {/* Flashcard */}
      <div className="relative w-full max-w-2xl z-10" style={{ perspective: '1000px' }}>
        <motion.div
          className="relative h-[400px] w-full"
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
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl border-2 border-blue-200 p-8 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center space-y-4 w-full">
                <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
                  Question
                </div>
                <div className="text-xl font-medium text-gray-900 leading-relaxed">
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
                <div className="mt-6" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFlipped(true);
                    }}
                    className="bg-white/80 hover:bg-white z-10 relative"
                    type="button"
                  >
                    See answer
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Back of card */}
            <motion.div
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl shadow-xl border-2 border-indigo-200 p-8 flex flex-col items-center justify-center"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-center space-y-4 w-full flex-1 flex flex-col items-center justify-center">
                <div 
                  className="cursor-pointer w-full"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-4">
                    Answer
                  </div>
                  <div className="text-xl font-medium text-gray-900 leading-relaxed">
                    {currentCard.back}
                  </div>
                </div>
              </div>
              <div className="mt-auto relative z-50" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="bg-white/90 hover:bg-white shadow-md pointer-events-auto"
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
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden pointer-events-none">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
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

function parseFlashcards(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  
  // Split by flashcard markers (## Flashcard X)
  const flashcardRegex = /## Flashcard \d+/g;
  const sections = content.split(flashcardRegex);
  
  // Skip the first section (header/metadata), process the rest
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    if (!section.trim()) continue;
    
    // Extract front (question) - everything between "### Front:" and "### Back:"
    const frontMatch = section.match(/### Front:\s*\n\n([\s\S]*?)(?=\n\n### Back:|$)/);
    let front = frontMatch ? frontMatch[1].trim() : '';
    
    // Extract options if present (between Front and Back)
    const optionsMatch = section.match(/\*\*Options:\*\*\s*\n((?:- [^\n]+\n?)+)/);
    const options = optionsMatch 
      ? optionsMatch[1].split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
      : undefined;
    
    // Remove options from front text if they were included
    if (options && optionsMatch) {
      front = front.replace(/\*\*Options:\*\*\s*\n((?:- [^\n]+\n?)+)/, '').trim();
    }
    
    // Extract back (answer) - everything after "### Back:" and "**Answer:**"
    const backMatch = section.match(/### Back:\s*\n\n\*\*Answer:\*\*\s*(.*?)(?=\n\n---|$)/s);
    const back = backMatch ? backMatch[1].trim() : '';
    
    if (front && back) {
      cards.push({ 
        front: front.replace(/\*\*/g, '').trim(), 
        back: back.replace(/\*\*/g, '').trim(), 
        options 
      });
    }
  }
  
  // Fallback: if no structured flashcards found, try to parse from markdown format
  if (cards.length === 0) {
    const lines = content.split('\n');
    let currentCard: Partial<Flashcard> = {};
    let inFront = false;
    let inBack = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('Flashcard') || line.includes('### Front:')) {
        if (currentCard.front && currentCard.back) {
          cards.push(currentCard as Flashcard);
        }
        currentCard = {};
        inFront = true;
        inBack = false;
        continue;
      }
      
      if (line.includes('### Back:') || line.includes('**Answer:**')) {
        inFront = false;
        inBack = true;
        if (line.includes('**Answer:**')) {
          currentCard.back = line.replace(/\*\*Answer:\*\*\s*/, '').trim();
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
      
      if (inBack && line.trim() && !line.includes('**Answer:**')) {
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
      cards.push(currentCard as Flashcard);
    }
  }
  
  return cards;
}

