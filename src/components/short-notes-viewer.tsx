import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { extractDisplayContent } from '@/lib/ai-tool-display-content';
import {
  resolveShortNotesFromPayload,
  type LegacyShortNote,
  type ShortNoteItem,
  type ShortNoteSection,
} from '@/lib/parse-short-notes';

interface ShortNotesViewerProps {
  content: string;
  rawContent?: unknown;
}

const SECTION_ACCENTS = [
  'border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white',
  'border-violet-200 bg-gradient-to-br from-violet-50/70 to-white',
  'border-cyan-200 bg-gradient-to-br from-cyan-50/70 to-white',
  'border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white',
  'border-amber-200 bg-gradient-to-br from-amber-50/70 to-white',
  'border-rose-200 bg-gradient-to-br from-rose-50/70 to-white',
  'border-sky-200 bg-gradient-to-br from-sky-50/70 to-white',
  'border-teal-200 bg-gradient-to-br from-teal-50/70 to-white',
  'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50/70 to-white',
  'border-slate-200 bg-gradient-to-br from-slate-50/80 to-white',
];

function SectionCard({ section, index }: { section: ShortNoteSection; index: number }) {
  const accent = SECTION_ACCENTS[index % SECTION_ACCENTS.length];
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {section.num}. {section.label}
      </p>
      <div
        className="short-notes-markdown mt-2 prose prose-sm max-w-none text-slate-700 leading-relaxed prose-p:text-slate-700 prose-li:text-slate-700 prose-li:marker:text-indigo-400 prose-strong:text-slate-900"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body || '') }}
      />
    </section>
  );
}

function TemplateNoteBody({ item }: { item: ShortNoteItem }) {
  const meta = item.meta;
  const hasMeta = Boolean(
    meta?.bloomLevel || meta?.skillFocus || meta?.subtopic || meta?.classLabel || meta?.subject,
  );

  return (
    <div className="space-y-3">
      {hasMeta ? (
        <div className="flex flex-wrap gap-2">
          {meta?.classLabel ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Class: {meta.classLabel}
            </span>
          ) : null}
          {meta?.subject ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Subject: {meta.subject}
            </span>
          ) : null}
          {meta?.subtopic ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Subtopic: {meta.subtopic}
            </span>
          ) : null}
          {meta?.bloomLevel ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Bloom: {meta.bloomLevel}
            </span>
          ) : null}
          {meta?.skillFocus ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Skill: {meta.skillFocus}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {item.sections.map((section, index) => (
          <SectionCard key={`${section.num}-${section.label}`} section={section} index={index} />
        ))}
      </div>
    </div>
  );
}

function LegacyNoteBody({ note }: { note: LegacyShortNote }) {
  const hasSideContent = Boolean(
    note.importance || (note.quick_facts && note.quick_facts.length > 0),
  );

  return (
    <div className={`grid grid-cols-1 gap-4 ${hasSideContent ? 'lg:grid-cols-12' : ''}`}>
      <section className={`overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm ${hasSideContent ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
        {note.summary ? (
          <div className="p-5">
            <div
              className="short-notes-markdown prose prose-sm max-w-none text-slate-700 leading-relaxed prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(note.summary) }}
            />
          </div>
        ) : (
          <div className="p-4 text-sm italic text-slate-400">No summary available.</div>
        )}
      </section>
      {hasSideContent ? (
        <div className="space-y-3 lg:col-span-4">
          {note.importance ? (
            <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/85 to-white p-5 shadow-sm">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                Why it matters
              </p>
              <div
                className="short-notes-markdown prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(note.importance) }}
              />
            </section>
          ) : null}
          {note.quick_facts && note.quick_facts.length > 0 ? (
            <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Quick facts
              </p>
              <ul className="space-y-2">
                {note.quick_facts.map((fact, idx) => (
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
    </div>
  );
}

type ViewerPage =
  | { mode: 'template'; item: ShortNoteItem }
  | { mode: 'legacy'; note: LegacyShortNote };

function parseLegacyNotes(content: string): LegacyShortNote[] {
  const notes: LegacyShortNote[] = [];

  const noteRegex = /__NOTE_CARD_START__\n([\s\S]*?)\n__NOTE_CARD_END__/g;
  const matches = Array.from(content.matchAll(noteRegex));

  for (const match of matches) {
    const cardContent = match[1];
    const conceptMatch = cardContent.match(/<h2[^>]*>🎯\s*(.*?)<\/h2>/);
    let conceptName = conceptMatch ? conceptMatch[1].trim() : '';
    if (!conceptName) {
      const conceptDivMatch = cardContent.match(/🎯\s*([^<]+)/);
      conceptName = conceptDivMatch ? conceptDivMatch[1].trim() : '';
    }

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

    const quickFacts: string[] = [];
    const factsSection = cardContent.match(/<h3[^>]*>Quick Facts<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
    if (factsSection) {
      const factMatches = Array.from(
        factsSection[1].matchAll(/<li[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g),
      );
      for (const factMatch of factMatches) {
        const fact = factMatch[1]
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        if (fact && !fact.match(/^\d+$/)) quickFacts.push(fact);
      }
    }

    if (conceptName) {
      notes.push({
        concept_name: conceptName,
        summary,
        importance,
        quick_facts: quickFacts.length > 0 ? quickFacts : undefined,
      });
    }
  }

  if (notes.length === 0 && content.includes('"notes"')) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*"notes"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (jsonData.notes && Array.isArray(jsonData.notes)) {
          return jsonData.notes.map((note: LegacyShortNote) => ({
            concept_name: note.concept_name || '',
            summary: note.summary,
            importance: note.importance,
            quick_facts: note.quick_facts,
          }));
        }
      }
    } catch {
      /* continue */
    }
  }

  if (notes.length === 0) {
    const conceptRegex = /## 🎯 Concept \d+:\s*(.*?)\n/g;
    const concepts = Array.from(content.matchAll(conceptRegex));

    concepts.forEach((match, index) => {
      const conceptName = match[1].trim();
      const startIndex = match.index || 0;
      const nextMatch = concepts[index + 1];
      const endIndex = nextMatch ? nextMatch.index : content.length;
      const noteContent = content.substring(startIndex, endIndex);

      const summaryMatch = noteContent.match(
        /\*\*Summary:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Importance:|$)/,
      );
      const importanceMatch = noteContent.match(
        /\*\*Importance:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Quick Facts:|$)/,
      );
      const factsMatch = noteContent.match(/\*\*Quick Facts:\*\*\s*\n((?:- .+\n?)+)/);

      notes.push({
        concept_name: conceptName,
        summary: summaryMatch ? summaryMatch[1].trim() : undefined,
        importance: importanceMatch ? importanceMatch[1].trim() : undefined,
        quick_facts: factsMatch
          ? factsMatch[1]
              .split('\n')
              .filter((line) => line.trim().startsWith('-'))
              .map((line) => line.replace(/^-\s*/, '').trim())
          : undefined,
      });
    });
  }

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
    const body = heading ? text.slice(text.indexOf(heading[0]) + heading[0].length).trim() : text;
    notes.push({ concept_name: title, summary: body || text });
  }

  return notes;
}

function resolvePages(content: string, rawContent?: unknown): ViewerPage[] {
  const resolved = resolveShortNotesFromPayload(content, rawContent);
  if (resolved?.mode === 'template') {
    return resolved.items.map((item) => ({ mode: 'template', item }));
  }

  try {
    const contentData = JSON.parse(content) as { raw?: { notes?: LegacyShortNote[] }; formatted?: string };
    if (contentData.formatted) {
      const fromFormatted = resolveShortNotesFromPayload(contentData.formatted, rawContent);
      if (fromFormatted?.mode === 'template') {
        return fromFormatted.items.map((item) => ({ mode: 'template', item }));
      }
    }
    if (contentData.raw?.notes?.length) {
      return contentData.raw.notes.map((note) => ({ mode: 'legacy', note }));
    }
  } catch {
    /* not JSON */
  }

  return parseLegacyNotes(extractDisplayContent(content) || content).map((note) => ({
    mode: 'legacy',
    note,
  }));
}

function pageTitle(page: ViewerPage): string {
  if (page.mode === 'template') return page.item.title;
  return page.note.concept_name || 'Short notes';
}

export function ShortNotesViewer({ content, rawContent }: ShortNotesViewerProps) {
  const pages = useMemo(() => resolvePages(content, rawContent), [content, rawContent]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    setCurrentIndex(0);
  }, [content, rawContent]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0 && !isTurning) {
        e.preventDefault();
        setIsTurning(true);
        setDirection('left');
        setTimeout(() => {
          setCurrentIndex((prev) => prev - 1);
          setIsTurning(false);
        }, 400);
      } else if (e.key === 'ArrowRight' && currentIndex < pages.length - 1 && !isTurning) {
        e.preventDefault();
        setIsTurning(true);
        setDirection('right');
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setIsTurning(false);
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, pages.length, isTurning]);

  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No notes found in the generated content.</p>
      </div>
    );
  }

  const currentPage = pages[currentIndex];
  const progress = ((currentIndex + 1) / pages.length) * 100;
  const title = pageTitle(currentPage);

  let body: ReactNode;
  if (currentPage.mode === 'template') {
    body = <TemplateNoteBody item={currentPage.item} />;
  } else {
    body = <LegacyNoteBody note={currentPage.note} />;
  }

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
              <p className="text-sm font-semibold text-violet-50">
                {currentIndex + 1} / {pages.length}
              </p>
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

      {pages.length > 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Concept navigator
          </p>
          <div className="flex flex-wrap gap-2">
            {pages.map((page, idx) => (
              <button
                key={`${pageTitle(page)}-${idx}`}
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
                {pageTitle(page) || `Concept ${idx + 1}`}
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
          className="space-y-4"
        >
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_48px_-30px_rgba(30,41,59,0.6)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50/50 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">
                Current concept
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{title}</h3>
            </div>
            <div className="p-5">{body}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
