import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Note {
  concept_name: string;
  summary?: string;
  importance?: string;
  quick_facts?: string[];
}

interface ShortNotesViewerProps {
  content: string;
}

export function ShortNotesViewer({ content }: ShortNotesViewerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    // Try to parse from raw JSON data first (more reliable)
    let parsedNotes: Note[] = [];
    
    try {
      const contentData = JSON.parse(content);
      if (contentData.raw && contentData.raw.notes) {
        // Use raw JSON data if available
        parsedNotes = contentData.raw.notes.map((note: any) => ({
          concept_name: note.concept_name || '',
          summary: note.summary,
          importance: note.importance,
          quick_facts: note.quick_facts
        }));
      } else if (contentData.formatted) {
        // Parse from formatted content
        parsedNotes = parseNotes(contentData.formatted);
      }
    } catch (e) {
      // Not JSON, parse from markdown/HTML content
      parsedNotes = parseNotes(content);
    }
    
    setNotes(parsedNotes);
    setCurrentIndex(0);
  }, [content]);

      // Keyboard navigation
      useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft' && currentIndex > 0 && !isTurning) {
            e.preventDefault();
            setIsTurning(true);
            setDirection('left');
            setTimeout(() => {
              setCurrentIndex(prev => prev - 1);
              setIsTurning(false);
            }, 400);
          } else if (e.key === 'ArrowRight' && currentIndex < notes.length - 1 && !isTurning) {
            e.preventDefault();
            setIsTurning(true);
            setDirection('right');
            setTimeout(() => {
              setCurrentIndex(prev => prev + 1);
              setIsTurning(false);
            }, 400);
          }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
      }, [currentIndex, notes.length, isTurning]);

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No notes found in the generated content.</p>
      </div>
    );
  }

  const currentNote = notes[currentIndex];
  const progress = ((currentIndex + 1) / notes.length) * 100;

  const handlePrevious = () => {
    if (currentIndex > 0 && !isTurning) {
      setIsTurning(true);
      setDirection('left');
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTurning(false);
      }, 400);
    }
  };

  const handleNext = () => {
    if (currentIndex < notes.length - 1 && !isTurning) {
      setIsTurning(true);
      setDirection('right');
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTurning(false);
      }, 400);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[700px] space-y-6 relative w-full">
      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center mb-2">
        <p>Use <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd> / <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd> to turn pages</p>
      </div>

      {/* Book Page Container with 3D Perspective */}
      <div className="relative w-full max-w-5xl" style={{ perspective: '2000px', perspectiveOrigin: 'center center' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ 
              rotateY: direction === 'right' ? 90 : -90,
              opacity: 0,
              scale: 0.95
            }}
            animate={{ 
              rotateY: 0,
              opacity: 1,
              scale: 1
            }}
            exit={{ 
              rotateY: direction === 'right' ? -90 : 90,
              opacity: 0,
              scale: 0.95
            }}
            transition={{ 
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'center center'
            }}
            className="w-full"
          >
            {/* Book Page - Rectangle Shape */}
            <div 
              className="relative mx-auto shadow-2xl"
              style={{
                width: '100%',
                maxWidth: '900px',
                minHeight: '650px',
                background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Book binding effect on left */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-2"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.08), rgba(0,0,0,0.02), transparent)',
                  zIndex: 10
                }}
              />
              
              {/* Page content */}
              <div className="p-10 h-full" style={{ minHeight: '650px' }}>
                {/* Concept Header - Rectangle Card */}
                <div 
                  className="mb-6 p-4 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <h2 className="text-white text-2xl font-bold mb-0" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    🎯 {currentNote.concept_name}
                  </h2>
                </div>

                {/* Content Area */}
                <div className="space-y-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {/* Summary Section - Rectangle Card */}
                  {currentNote.summary && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4 mb-4"
                      style={{ 
                        borderColor: '#667eea',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #667eea'
                      }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                        >
                          <span className="text-xl">📋</span>
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#667eea' }}>Summary</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed m-0" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                        {currentNote.summary}
                      </p>
                    </div>
                  )}

                  {/* Importance Section - Rectangle Card */}
                  {currentNote.importance && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4 mb-4"
                      style={{ 
                        borderColor: '#f59e0b',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #f59e0b'
                      }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                        >
                          <span className="text-xl">⭐</span>
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#f59e0b' }}>Importance</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed m-0" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                        {currentNote.importance}
                      </p>
                    </div>
                  )}

                  {/* Quick Facts Section - Rectangle Card */}
                  {currentNote.quick_facts && currentNote.quick_facts.length > 0 && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4"
                      style={{ 
                        borderColor: '#10b981',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #10b981'
                      }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                          <span className="text-xl">⚡</span>
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#10b981' }}>Quick Facts</h3>
                      </div>
                      <ul className="list-none p-0 m-0 space-y-2">
                        {currentNote.quick_facts.map((fact, factIndex) => (
                          <li 
                            key={factIndex}
                            className="flex items-start p-3 rounded"
                            style={{
                              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
                              borderLeft: '3px solid #10b981',
                              borderRadius: '4px'
                            }}
                          >
                            <span 
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3 mt-0.5"
                              style={{ background: '#10b981' }}
                            >
                              {factIndex + 1}
                            </span>
                            <span className="text-gray-700 flex-1" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                              {fact}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Page number indicator */}
              <div 
                className="absolute bottom-4 right-8 text-sm text-gray-500"
                style={{ fontFamily: 'serif' }}
              >
                Page {currentIndex + 1}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center space-x-4 w-full max-w-5xl z-50 relative mt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isTurning}
          className="rounded-lg px-6 py-3 shadow-md hover:shadow-lg transition-shadow"
          type="button"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous Page
        </Button>

        {/* Progress bar */}
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex === notes.length - 1 || isTurning}
          className="rounded-lg px-6 py-3 shadow-md hover:shadow-lg transition-shadow"
          type="button"
        >
          Next Page
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Page counter */}
      <div className="text-sm text-gray-600 font-medium">
        Page {currentIndex + 1} of {notes.length}
      </div>
    </div>
  );
}

function parseNotes(content: string): Note[] {
  const notes: Note[] = [];
  
  // First, try to parse from HTML card markers
  const noteRegex = /__NOTE_CARD_START__\n([\s\S]*?)\n__NOTE_CARD_END__/g;
  const matches = Array.from(content.matchAll(noteRegex));
  
  for (const match of matches) {
    const cardContent = match[1];
    
    // Extract concept name from HTML
    const conceptMatch = cardContent.match(/<h2[^>]*>🎯\s*(.*?)<\/h2>/);
    let conceptName = conceptMatch ? conceptMatch[1].trim() : '';
    
    // If not found, try extracting from div with concept name
    if (!conceptName) {
      const conceptDivMatch = cardContent.match(/🎯\s*([^<]+)/);
      conceptName = conceptDivMatch ? conceptDivMatch[1].trim() : '';
    }
    
    // Extract summary - look for paragraph after Summary heading
    let summary: string | undefined;
    const summarySection = cardContent.match(/<h3[^>]*>Summary<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/);
    if (summarySection) {
      summary = summarySection[1]
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }
    
    // Extract importance
    let importance: string | undefined;
    const importanceSection = cardContent.match(/<h3[^>]*>Importance<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/);
    if (importanceSection) {
      importance = importanceSection[1]
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }
    
    // Extract quick facts
    const quickFacts: string[] = [];
    const factsSection = cardContent.match(/<h3[^>]*>Quick Facts<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
    if (factsSection) {
      const factsContent = factsSection[1];
      // Extract all list items
      const factMatches = factsContent.matchAll(/<li[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g);
      for (const factMatch of factMatches) {
        const fact = factMatch[1]
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        if (fact && !fact.match(/^\d+$/)) { // Skip numbered badges
          quickFacts.push(fact);
        }
      }
    }
    
    if (conceptName) {
      notes.push({
        concept_name: conceptName,
        summary,
        importance,
        quick_facts: quickFacts.length > 0 ? quickFacts : undefined
      });
    }
  }
  
  // Fallback: parse directly from JSON structure if available in content
  if (notes.length === 0 && content.includes('"notes"')) {
    try {
      // Try to extract JSON from content
      const jsonMatch = content.match(/\{[\s\S]*"notes"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (jsonData.notes && Array.isArray(jsonData.notes)) {
          return jsonData.notes.map((note: any) => ({
            concept_name: note.concept_name || '',
            summary: note.summary,
            importance: note.importance,
            quick_facts: note.quick_facts
          }));
        }
      }
    } catch (e) {
      // JSON parsing failed, continue with markdown parsing
    }
  }
  
  // Final fallback: parse from markdown format
  if (notes.length === 0) {
    const conceptRegex = /## 🎯 Concept \d+:\s*(.*?)\n/g;
    const concepts = Array.from(content.matchAll(conceptRegex));
    
    concepts.forEach((match, index) => {
      const conceptName = match[1].trim();
      const startIndex = match.index || 0;
      const nextMatch = concepts[index + 1];
      const endIndex = nextMatch ? nextMatch.index : content.length;
      const noteContent = content.substring(startIndex, endIndex);
      
      // Extract summary
      const summaryMatch = noteContent.match(/\*\*Summary:\*\*\s*\n(.*?)(?=\n\n\*\*Importance:|$)/s);
      const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
      
      // Extract importance
      const importanceMatch = noteContent.match(/\*\*Importance:\*\*\s*\n(.*?)(?=\n\n\*\*Quick Facts:|$)/s);
      const importance = importanceMatch ? importanceMatch[1].trim() : undefined;
      
      // Extract quick facts
      const factsMatch = noteContent.match(/\*\*Quick Facts:\*\*\s*\n((?:- .+\n?)+)/);
      const quickFacts = factsMatch 
        ? factsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim())
        : undefined;
      
      notes.push({
        concept_name: conceptName,
        summary,
        importance,
        quick_facts: quickFacts
      });
    });
  }
  
  return notes;
}
