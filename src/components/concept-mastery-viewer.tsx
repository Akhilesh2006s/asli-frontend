import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Concept {
  concept_name: string;
  difficulty?: string;
  lesson?: string;
  real_example?: string;
  key_points?: string[];
}

interface ConceptMasteryViewerProps {
  content: string;
}

export function ConceptMasteryViewer({ content }: ConceptMasteryViewerProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    // Try to parse from raw JSON data first (more reliable)
    let parsedConcepts: Concept[] = [];
    
    try {
      const contentData = JSON.parse(content);
      if (contentData.raw && contentData.raw.concepts) {
        // Use raw JSON data if available
        parsedConcepts = contentData.raw.concepts.map((concept: any) => ({
          concept_name: concept.concept_name || '',
          difficulty: concept.difficulty,
          lesson: concept.lesson,
          real_example: concept.real_example,
          key_points: concept.key_points
        }));
      } else if (contentData.formatted) {
        // Parse from formatted content
        parsedConcepts = parseConcepts(contentData.formatted);
      }
    } catch (e) {
      // Not JSON, parse from markdown/HTML content
      parsedConcepts = parseConcepts(content);
    }
    
    setConcepts(parsedConcepts);
    setCurrentIndex(0);
  }, [content]);

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
    if (currentIndex < concepts.length - 1 && !isTurning) {
      setIsTurning(true);
      setDirection('right');
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTurning(false);
      }, 400);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0 && !isTurning) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' && currentIndex < concepts.length - 1 && !isTurning) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, concepts.length, isTurning]);

  if (concepts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No concepts found in the generated content.</p>
      </div>
    );
  }

  const currentConcept = concepts[currentIndex];
  const progress = ((currentIndex + 1) / concepts.length) * 100;
  
  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return { bg: '#10b981', text: 'white' };
      case 'medium': return { bg: '#f59e0b', text: 'white' };
      case 'hard': return { bg: '#ef4444', text: 'white' };
      default: return { bg: '#6b7280', text: 'white' };
    }
  };
  
  const difficultyColor = getDifficultyColor(currentConcept.difficulty);

  return (
    <div className="flex flex-col items-center justify-center min-h-[700px] space-y-6 relative w-full">
      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center mb-2">
        <p>Use <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">←</kbd> / <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">→</kbd> to navigate concepts</p>
      </div>

      {/* Concept Card Container with 3D Perspective */}
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
            {/* Concept Card - Rectangle Shape with Modern Design */}
            <div 
              className="relative mx-auto shadow-2xl"
              style={{
                width: '100%',
                maxWidth: '900px',
                minHeight: '650px',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '2px solid #bae6fd',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative top border */}
              <div 
                className="absolute top-0 left-0 right-0 h-2"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
                }}
              />
              
              {/* Page content */}
              <div className="p-10 h-full" style={{ minHeight: '650px' }}>
                {/* Concept Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                      >
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-0">
                          {currentConcept.concept_name}
                        </h2>
                        {currentConcept.difficulty && (
                          <span 
                            className="inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2"
                            style={{ 
                              background: difficultyColor.bg,
                              color: difficultyColor.text
                            }}
                          >
                            {currentConcept.difficulty.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {/* Lesson/Explanation Section */}
                  {currentConcept.lesson && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4"
                      style={{ 
                        borderColor: '#3b82f6',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #3b82f6'
                      }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                        >
                          <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#3b82f6' }}>Lesson Explanation</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed m-0" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                        {currentConcept.lesson}
                      </p>
                    </div>
                  )}

                  {/* Real-world Example Section */}
                  {currentConcept.real_example && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4"
                      style={{ 
                        borderColor: '#8b5cf6',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #8b5cf6'
                      }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
                        >
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#8b5cf6' }}>Real-world Example</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed m-0" style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                        {currentConcept.real_example}
                      </p>
                    </div>
                  )}

                  {/* Key Points Section */}
                  {currentConcept.key_points && currentConcept.key_points.length > 0 && (
                    <div 
                      className="bg-white p-6 shadow-md border-l-4"
                      style={{ 
                        borderColor: '#10b981',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        borderLeft: '4px solid #10b981'
                      }}
                    >
                      <div className="flex items-center mb-4">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold m-0" style={{ color: '#10b981' }}>Key Points</h3>
                      </div>
                      <ul className="list-none p-0 m-0 space-y-3">
                        {currentConcept.key_points.map((point, pointIndex) => (
                          <li 
                            key={pointIndex}
                            className="flex items-start p-3 rounded-lg"
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
                              {pointIndex + 1}
                            </span>
                            <span className="text-gray-700 flex-1" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                              {point}
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
                className="absolute bottom-4 right-8 text-sm text-gray-500 font-medium"
                style={{ fontFamily: 'serif' }}
              >
                Concept {currentIndex + 1}
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
          Previous Concept
        </Button>

        {/* Progress bar */}
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex === concepts.length - 1 || isTurning}
          className="rounded-lg px-6 py-3 shadow-md hover:shadow-lg transition-shadow"
          type="button"
        >
          Next Concept
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Concept counter */}
      <div className="text-sm text-gray-600 font-medium">
        Concept {currentIndex + 1} of {concepts.length}
      </div>
    </div>
  );
}

function parseConcepts(content: string): Concept[] {
  const concepts: Concept[] = [];
  
  // Try to parse from HTML card markers
  const conceptRegex = /__CONCEPT_CARD_START__\n([\s\S]*?)\n__CONCEPT_CARD_END__/g;
  const matches = Array.from(content.matchAll(conceptRegex));
  
  for (const match of matches) {
    const cardContent = match[1];
    
    // Extract concept name
    const conceptMatch = cardContent.match(/<h2[^>]*>📚\s*(.*?)<\/h2>/);
    let conceptName = conceptMatch ? conceptMatch[1].trim() : '';
    
    // Extract difficulty
    const difficultyMatch = cardContent.match(/<span[^>]*>([A-Z]+)<\/span>/);
    const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : undefined;
    
    // Extract lesson
    let lesson: string | undefined;
    const lessonSection = cardContent.match(/<h3[^>]*>Lesson Explanation<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/);
    if (lessonSection) {
      lesson = lessonSection[1]
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }
    
    // Extract real example
    let realExample: string | undefined;
    const exampleSection = cardContent.match(/<h3[^>]*>Real-world Example<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/);
    if (exampleSection) {
      realExample = exampleSection[1]
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }
    
    // Extract key points
    const keyPoints: string[] = [];
    const pointsSection = cardContent.match(/<h3[^>]*>Key Points<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
    if (pointsSection) {
      const pointsContent = pointsSection[1];
      const pointMatches = pointsContent.matchAll(/<span[^>]*>(.*?)<\/span>/g);
      for (const pointMatch of pointMatches) {
        const point = pointMatch[1]
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        if (point && !point.match(/^\d+$/)) {
          keyPoints.push(point);
        }
      }
    }
    
    if (conceptName) {
      concepts.push({
        concept_name: conceptName,
        difficulty,
        lesson,
        real_example: realExample,
        key_points: keyPoints.length > 0 ? keyPoints : undefined
      });
    }
  }
  
  // Fallback: parse from markdown format
  if (concepts.length === 0) {
    const conceptRegex = /### \d+\.\s*(.*?)\n/g;
    const conceptMatches = Array.from(content.matchAll(conceptRegex));
    
    conceptMatches.forEach((match, index) => {
      const conceptName = match[1].trim();
      const startIndex = match.index || 0;
      const nextMatch = conceptMatches[index + 1];
      const endIndex = nextMatch ? nextMatch.index : content.length;
      const conceptContent = content.substring(startIndex, endIndex);
      
      // Extract difficulty
      const difficultyMatch = conceptContent.match(/\*\*Difficulty:\*\*\s*(.*?)\n/);
      const difficulty = difficultyMatch ? difficultyMatch[1].trim().toLowerCase() : undefined;
      
      // Extract explanation/lesson
      const explanationMatch = conceptContent.match(/\*\*Explanation:\*\*\s*\n(.*?)(?=\n\n\*\*Real-world Example:|\n\n\*\*Key Points:|$)/s);
      const lesson = explanationMatch ? explanationMatch[1].trim() : undefined;
      
      // Extract real example
      const exampleMatch = conceptContent.match(/\*\*Real-world Example:\*\*\s*\n(.*?)(?=\n\n\*\*Key Points:|$)/s);
      const realExample = exampleMatch ? exampleMatch[1].trim() : undefined;
      
      // Extract key points
      const pointsMatch = conceptContent.match(/\*\*Key Points:\*\*\s*\n((?:- .+\n?)+)/);
      const keyPoints = pointsMatch 
        ? pointsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim())
        : undefined;
      
      concepts.push({
        concept_name: conceptName,
        difficulty,
        lesson,
        real_example: realExample,
        key_points: keyPoints
      });
    });
  }
  
  return concepts;
}
