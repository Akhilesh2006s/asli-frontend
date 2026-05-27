import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderMarkdown } from '@/lib/render-teacher-markdown';

interface Note {
  concept_name: string;
  summary?: string;
  importance?: string;
  quick_facts?: string[];
}

interface ShortNotesViewerProps {
  content: string;
}

type SummaryBlock = {
  title: string;
  body: string;
};

function summaryBlocksFromMarkdown(markdown: string): SummaryBlock[] {
  const text = String(markdown || '').trim();
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: SummaryBlock[] = [];
  let currentTitle = '';
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (currentTitle || body) {
      blocks.push({
        title: currentTitle || `Section ${blocks.length + 1}`,
        body,
      });
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch =
      line.match(/^#{1,3}\s+(.+)$/) ||
      line.match(/^\*\*(\d{1,2}\.\s*.+?)\*\*$/) ||
      line.match(/^(\d{1,2}\.\s+.+)$/);

    if (headingMatch) {
      if (currentTitle || buffer.length) flush();
      currentTitle = headingMatch[1].trim();
      continue;
    }
    buffer.push(rawLine);
  }
  if (currentTitle || buffer.length) flush();

  return blocks.filter((b) => b.title || b.body);
}

/**
 * One generated note is often a single Markdown blob with several `##` sections.
 * Split into multiple "pages" so Previous / Next match the book UI.
 */
function splitMarkdownIntoPages(mainTitle: string, markdown: string): Note[] {
  const md = markdown.trim();
  if (!md) {
    return [{ concept_name: mainTitle || 'Short notes', summary: md }];
  }

  const parts = md
    .split(/\n(?=## )/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return [{ concept_name: mainTitle || 'Short notes', summary: md }];
  }

  const out: Note[] = [];
  parts.forEach((part, i) => {
    const h2 = part.match(/^##\s+(.+)$/m);
    const title = h2
      ? h2[1].trim()
      : i === 0
        ? part.match(/^#\s+(.+)$/m)?.[1]?.trim() || mainTitle || 'Overview'
        : `Section ${i + 1}`;
    out.push({ concept_name: title, summary: part });
  });
  return out;
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

    // Turn one long note with multiple ## sections into several pages (enables Next / Previous).
    if (parsedNotes.length === 1 && parsedNotes[0].summary && /\n##\s/.test(parsedNotes[0].summary)) {
      parsedNotes = splitMarkdownIntoPages(
        parsedNotes[0].concept_name || 'Short Notes & Summaries',
        parsedNotes[0].summary,
      );
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
  const summaryBlocks = summaryBlocksFromMarkdown(currentNote.summary || '');
  const hasSideContent = Boolean(
    currentNote.importance ||
    (currentNote.quick_facts && currentNote.quick_facts.length > 0),
  );

  return (
    <div className="w-full space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-200/70 bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 px-5 py-5 text-white shadow-[0_24px_60px_-24px_rgba(79,70,229,0.75)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-12 h-48 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_58%)]" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200">
                Revision Studio
              </p>
              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Short Notes & Summaries</h2>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-right backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.18em] text-violet-200">Progress</p>
              <p className="text-sm font-semibold text-violet-50">{currentIndex + 1} / {notes.length}</p>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-violet-100/90 sm:text-[15px]">
            Premium revision cards with focused summaries, key ideas, and exam-ready understanding.
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300 shadow-[0_0_20px_rgba(110,231,183,0.65)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </section>

      {notes.length > 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Concept navigator</p>
          <div className="flex flex-wrap gap-2">
            {notes.map((note, idx) => (
              <button
                key={`${note.concept_name}-${idx}`}
                type="button"
                onClick={() => {
                  if (isTurning || idx === currentIndex) return;
                  setDirection(idx > currentIndex ? 'right' : 'left');
                  setCurrentIndex(idx);
                }}
                className={`group rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  idx === currentIndex
                    ? 'border-violet-300 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-violet-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-700'
                }`}
              >
                <span className="opacity-85 group-hover:opacity-100">{idx + 1}.</span>{' '}
                {note.concept_name || `Concept ${idx + 1}`}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ x: direction === 'right' ? 24 : -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction === 'right' ? -24 : 24, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <section
            className={`overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_48px_-30px_rgba(30,41,59,0.6)] ${
              hasSideContent ? 'lg:col-span-8' : 'lg:col-span-12'
            }`}
          >
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50/50 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Current concept</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  {currentNote.concept_name}
                </h3>
              </div>
              {currentNote.summary ? (
                <div className="space-y-3 p-5">
                  {summaryBlocks.length > 1 ? (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {summaryBlocks.map((block, blockIndex) => (
                        <section
                          key={`${block.title}-${blockIndex}`}
                          className="rounded-2xl border border-slate-100 bg-gradient-to-r from-white via-indigo-50/30 to-white p-4 shadow-sm"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500 mb-1.5">
                            Insight {blockIndex + 1}
                          </p>
                          <h4 className="text-base font-bold text-slate-900 mb-2">{block.title}</h4>
                          <div
                            className="short-notes-markdown prose prose-sm max-w-none text-slate-700 leading-relaxed prose-p:text-slate-700 prose-li:text-slate-700 prose-li:marker:text-indigo-300 prose-strong:text-slate-900"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.body || '') }}
                          />
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="short-notes-markdown prose prose-sm max-w-none text-slate-700 leading-relaxed prose-headings:text-slate-900 prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-slate-700 prose-li:text-slate-700 prose-li:marker:text-indigo-300 prose-strong:text-slate-900"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentNote.summary || '') }}
                    />
                  )}
                </div>
              ) : (
                <div className="p-4 text-sm italic text-slate-400">No summary available.</div>
              )}
            </section>

          {hasSideContent ? (
            <div className="space-y-3 lg:col-span-4">
              {currentNote.importance ? (
                <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/85 via-white to-orange-50/55 p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 mb-1">
                    Why it matters
                  </p>
                  <div
                    className="short-notes-markdown prose prose-sm max-w-none text-slate-700 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(currentNote.importance || '') }}
                  />
                </section>
              ) : null}

              {currentNote.quick_facts && currentNote.quick_facts.length > 0 ? (
                <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    Quick facts
                  </p>
                  <ul className="space-y-2">
                    {currentNote.quick_facts.map((fact, idx) => (
                      <li key={`${fact}-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                          {idx + 1}
                        </span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
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
      const factMatches = Array.from(
        factsContent.matchAll(/<li[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g),
      );
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
      const summaryMatch = noteContent.match(
        /\*\*Summary:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Importance:|$)/,
      );
      const summary = summaryMatch ? summaryMatch[1].trim() : undefined;
      
      // Extract importance
      const importanceMatch = noteContent.match(
        /\*\*Importance:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Quick Facts:|$)/,
      );
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

  // Gemini / flash-lite often returns plain Markdown without __NOTE_CARD__ or "## 🎯 Concept N:" — still show it.
  if (notes.length === 0 && content.trim().length > 0) {
    let text = content.trim();
    try {
      const parsed = JSON.parse(content) as { formatted?: string };
      if (parsed && typeof parsed === 'object' && parsed.formatted) {
        text = String(parsed.formatted).trim();
      }
    } catch {
      /* use text as-is */
    }
    const heading = text.match(/^#{1,3}\s+(.+)$/m);
    const title = heading ? heading[1].trim() : 'Short notes';
    const body = heading
      ? text.slice(text.indexOf(heading[0]) + heading[0].length).trim()
      : text;
    notes.push({
      concept_name: title,
      summary: body || text,
    });
  }

  return notes;
}
