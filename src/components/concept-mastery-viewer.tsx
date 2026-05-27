import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';
import {
  conceptHasVisibleContent,
  resolveConceptsFromPayload,
  type NormalizedConcept,
} from '@/lib/parse-concept-mastery';

export interface ConceptMasteryViewerProps {
  content: string;
  rawContent?: unknown;
  className?: string;
  variant?: 'default' | 'student' | 'teacher';
}

type ConceptSectionDef = {
  num: number;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (c: NormalizedConcept) => boolean;
  render: (c: NormalizedConcept) => ReactNode;
};

const CONCEPT_TEMPLATE_SECTIONS: ConceptSectionDef[] = [
  {
    num: 1,
    title: 'Simple definition',
    icon: BookOpen,
    stripe: 'border-fuchsia-500',
    iconWrap: 'bg-fuchsia-100 text-fuchsia-800',
    hasContent: (c) => !!c.simpleDefinition,
    render: (c) => <p className="whitespace-pre-wrap text-slate-800">{c.simpleDefinition}</p>,
  },
  {
    num: 2,
    title: 'Why this concept is important',
    icon: Target,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-800',
    hasContent: (c) => !!c.whyImportant,
    render: (c) => <p className="whitespace-pre-wrap text-slate-800">{c.whyImportant}</p>,
  },
  {
    num: 3,
    title: 'Prior knowledge needed',
    icon: HelpCircle,
    stripe: 'border-purple-500',
    iconWrap: 'bg-purple-100 text-purple-800',
    hasContent: (c) => !!c.priorKnowledge,
    render: (c) => <p className="whitespace-pre-wrap text-slate-800">{c.priorKnowledge}</p>,
  },
  {
    num: 4,
    title: 'Step-by-step explanation',
    icon: Lightbulb,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-800',
    hasContent: (c) => !!c.explanation,
    render: (c) => (
      <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{c.explanation}</p>
    ),
  },
  {
    num: 5,
    title: 'Diagram / visualisation suggestion',
    icon: Eye,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-800',
    hasContent: (c) => !!c.diagramSuggestion,
    render: (c) => (
      <p className="whitespace-pre-wrap rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-3 py-2.5 text-slate-800 italic">
        {c.diagramSuggestion}
      </p>
    ),
  },
  {
    num: 6,
    title: 'Real-life examples',
    icon: Sparkles,
    stripe: 'border-cyan-500',
    iconWrap: 'bg-cyan-100 text-cyan-900',
    hasContent: (c) => !!c.realLifeExamples,
    render: (c) => <p className="whitespace-pre-wrap text-slate-800">{c.realLifeExamples}</p>,
  },
  {
    num: 7,
    title: 'Common misconceptions and corrections',
    icon: AlertTriangle,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-900',
    hasContent: (c) => c.misconceptions.length > 0,
    render: (c) => (
      <ul className="space-y-2">
        {c.misconceptions.map((line, i) => (
          <li
            key={i}
            className="flex gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-slate-800"
          >
            <span className="font-bold text-amber-700 shrink-0">!</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 8,
    title: 'Concept check questions',
    icon: ClipboardList,
    stripe: 'border-rose-500',
    iconWrap: 'bg-rose-100 text-rose-800',
    hasContent: (c) => c.conceptCheckQuestions.length > 0,
    render: (c) => (
      <ol className="space-y-2 list-none pl-0">
        {c.conceptCheckQuestions.map((q, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-600 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="pt-0.5">{q}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    num: 9,
    title: 'Key points to remember',
    icon: ListChecks,
    stripe: 'border-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    hasContent: (c) => c.keyPoints.length > 0,
    render: (c) => (
      <ul className="space-y-2">
        {c.keyPoints.map((point, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-800">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 10,
    title: 'Exam tips',
    icon: GraduationCap,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    hasContent: (c) => !!c.examTips,
    render: (c) => (
      <p className="whitespace-pre-wrap rounded-lg bg-sky-50 border border-sky-100 px-3 py-2.5 text-slate-800">
        {c.examTips}
      </p>
    ),
  },
  {
    num: 11,
    title: 'Higher-order thinking question',
    icon: Brain,
    stripe: 'border-pink-500',
    iconWrap: 'bg-pink-100 text-pink-800',
    hasContent: (c) => !!c.hotsQuestion,
    render: (c) => (
      <p className="whitespace-pre-wrap font-medium text-slate-900 border-l-4 border-pink-400 pl-3">
        {c.hotsQuestion}
      </p>
    ),
  },
  {
    num: 12,
    title: 'Quick self-reflection prompt',
    icon: Sparkles,
    stripe: 'border-fuchsia-600',
    iconWrap: 'bg-fuchsia-50 text-fuchsia-900',
    hasContent: (c) => !!c.reflectionPrompt,
    render: (c) => (
      <p className="whitespace-pre-wrap italic text-slate-700 rounded-lg bg-fuchsia-50/80 px-3 py-2.5">
        {c.reflectionPrompt}
      </p>
    ),
  },
];

function countFilledSections(c: NormalizedConcept): number {
  return CONCEPT_TEMPLATE_SECTIONS.filter((s) => s.hasContent(c)).length;
}

const CONCEPT_PHASES = [
  {
    id: 'understand',
    label: 'Build understanding',
    hint: 'Definition, importance & prerequisites',
    badge: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-200',
    nums: [1, 2, 3],
  },
  {
    id: 'learn',
    label: 'Teach the concept',
    hint: 'Explanation, visuals & examples',
    badge: 'bg-violet-100 text-violet-950 border-violet-200',
    nums: [4, 5, 6],
  },
  {
    id: 'master',
    label: 'Check mastery',
    hint: 'Questions, tips & reflection',
    badge: 'bg-indigo-100 text-indigo-950 border-indigo-200',
    nums: [7, 8, 9, 10, 11, 12],
  },
] as const;

function difficultyStyles(difficulty?: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-emerald-600 text-white';
    case 'medium':
      return 'bg-amber-500 text-white';
    case 'hard':
      return 'bg-rose-600 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

function ConceptSectionBlock({
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
    <section className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 border-l-[5px]', stripe)}>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{sectionNum}</p>
          <h4 className="text-sm font-bold text-slate-900 leading-tight">{title}</h4>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1 text-sm">{children}</div>
    </section>
  );
}

function TeacherConceptCard({ concept }: { concept: NormalizedConcept }) {
  const filled = countFilledSections(concept);
  const total = CONCEPT_TEMPLATE_SECTIONS.length;
  const progressPct = Math.round((filled / total) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50/90 via-white to-violet-50/50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white shadow-md">
              <Brain className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-700/90">
                Concept {concept.sl}
              </p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {concept.conceptName}
              </h4>
              {concept.difficulty ? (
                <span
                  className={cn(
                    'mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    difficultyStyles(concept.difficulty),
                  )}
                >
                  {concept.difficulty}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-32">
            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Coverage</p>
            <div className="h-2 rounded-full bg-fuchsia-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 text-right">
              {filled}/{total} sections
            </p>
          </div>
        </div>
      </div>

      {CONCEPT_PHASES.map((phase) => {
        const sections = CONCEPT_TEMPLATE_SECTIONS.filter(
          (s) => (phase.nums as readonly number[]).includes(s.num) && s.hasContent(concept),
        );
        if (!sections.length) return null;

        return (
          <div key={phase.id}>
            <div className={cn('mb-2.5 rounded-lg border px-3 py-2', phase.badge)}>
              <p className="text-xs font-bold uppercase tracking-wide">{phase.label}</p>
              <p className="text-[11px] opacity-80">{phase.hint}</p>
            </div>
            <div className="space-y-2.5">
              {sections.map((sec) => (
                <ConceptSectionBlock
                  key={sec.num}
                  sectionNum={`Section ${sec.num}`}
                  title={sec.title}
                  icon={sec.icon}
                  stripe={sec.stripe}
                  iconWrap={sec.iconWrap}
                >
                  {sec.render(concept)}
                </ConceptSectionBlock>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeacherConceptShell({ conceptCount, children }: { conceptCount: number; children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border-2 border-fuchsia-200/70 shadow-lg shadow-fuchsia-900/5">
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(192,38,211,0.08) 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(124,58,237,0.08) 0%, transparent 40%)',
          }}
          aria-hidden
        />
        <div className="relative border-b border-fuchsia-900/20 bg-gradient-to-br from-fuchsia-900 via-violet-900 to-indigo-900 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-2 ring-fuchsia-300/30">
                <Brain className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-200">
                  Concept Mastery Helper
                </p>
                <h3 className="text-lg font-bold sm:text-xl">Teaching reference</h3>
                <p className="text-xs text-fuchsia-100/85 mt-0.5">12-part concept breakdown for your class</p>
              </div>
            </div>
            {conceptCount > 1 ? (
              <Badge className="bg-white/15 text-white border-0 hover:bg-white/15">
                {conceptCount} concepts
              </Badge>
            ) : conceptCount === 1 ? (
              <Badge className="bg-fuchsia-400/25 text-fuchsia-50 border-fuchsia-300/30 hover:bg-fuchsia-400/25">
                1 concept
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="relative bg-[#fdfaff]/95 p-3 sm:p-5 max-h-[min(80vh,900px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Student / legacy: flip-card explorer for quick review */
function FlipCardConceptView({ concepts }: { concepts: NormalizedConcept[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const current = concepts[Math.min(currentIndex, concepts.length - 1)];
  const progress = ((currentIndex + 1) / concepts.length) * 100;

  const go = (dir: 'left' | 'right') => {
    if (isTurning) return;
    if (dir === 'left' && currentIndex === 0) return;
    if (dir === 'right' && currentIndex >= concepts.length - 1) return;
    setIsTurning(true);
    setDirection(dir);
    setTimeout(() => {
      setCurrentIndex((i) => (dir === 'right' ? i + 1 : i - 1));
      setIsTurning(false);
    }, 350);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go('left');
      if (e.key === 'ArrowRight') go('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, isTurning, concepts.length]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-4 space-y-4">
      <p className="text-xs text-slate-500 text-center">
        Use <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">←</kbd>{' '}
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">→</kbd> to browse concepts
      </p>

      <div className="w-full" style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ rotateY: direction === 'right' ? 70 : -70, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: direction === 'right' ? -70 : 70, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-6 sm:p-8 shadow-lg min-h-[320px]"
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold text-slate-900">{current.conceptName}</h2>
              {current.difficulty ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    difficultyStyles(current.difficulty),
                  )}
                >
                  {current.difficulty}
                </span>
              ) : null}
            </div>
            <div className="space-y-4 max-h-[420px] overflow-y-auto text-sm text-slate-700">
              {current.explanation ? (
                <div>
                  <h3 className="font-semibold text-indigo-700 mb-1">Explanation</h3>
                  <p className="whitespace-pre-wrap leading-relaxed">{current.explanation}</p>
                </div>
              ) : null}
              {current.realLifeExamples ? (
                <div>
                  <h3 className="font-semibold text-violet-700 mb-1">Real-life example</h3>
                  <p className="whitespace-pre-wrap leading-relaxed">{current.realLifeExamples}</p>
                </div>
              ) : null}
              {current.keyPoints.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-emerald-700 mb-2">Key points</h3>
                  <ul className="space-y-1.5">
                    {current.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-600 font-bold">{i + 1}.</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 w-full max-w-lg">
        <Button type="button" variant="outline" size="sm" onClick={() => go('left')} disabled={currentIndex === 0 || isTurning}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
            animate={{ width: `${progress}%` }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => go('right')}
          disabled={currentIndex >= concepts.length - 1 || isTurning}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Concept {currentIndex + 1} of {concepts.length}
      </p>
    </div>
  );
}

export function ConceptMasteryViewer({
  content,
  rawContent,
  className,
  variant = 'default',
}: ConceptMasteryViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveConceptsFromPayload(parsedContent, rawContent),
    [parsedContent, rawContent],
  );

  const [conceptIdx, setConceptIdx] = useState(0);

  const useTeacher = variant === 'teacher' || variant === 'default';
  const useMarkdown =
    !!resolved.markdownFallback &&
    (!resolved.concepts.length || !resolved.concepts.some(conceptHasVisibleContent));

  if (useMarkdown && resolved.markdownFallback) {
    const body = (
      <div
        className="prose prose-sm max-w-none rounded-xl border border-fuchsia-100 bg-white p-4 sm:p-5 shadow-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(resolved.markdownFallback) }}
      />
    );
    if (useTeacher) {
      return (
        <div className={className}>
          <TeacherConceptShell conceptCount={0}>{body}</TeacherConceptShell>
        </div>
      );
    }
    return <div className={cn('w-full', className)}>{body}</div>;
  }

  if (!resolved.concepts.length) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-fuchsia-200 bg-fuchsia-50/50 px-6 py-14 text-center',
          className,
        )}
      >
        <Brain className="mx-auto h-10 w-10 text-fuchsia-300 mb-3" aria-hidden />
        <p className="text-sm font-medium text-slate-700">No concepts found for this selection</p>
        <p className="text-xs text-slate-500 mt-1">Try generating again or pick another topic.</p>
      </div>
    );
  }

  if (!useTeacher) {
    return (
      <div className={className}>
        <FlipCardConceptView concepts={resolved.concepts} />
      </div>
    );
  }

  const safeIdx = Math.min(conceptIdx, resolved.concepts.length - 1);
  const current = resolved.concepts[safeIdx];

  return (
    <div className={className}>
      <TeacherConceptShell conceptCount={resolved.concepts.length}>
        {resolved.concepts.length > 1 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {resolved.concepts.map((c, i) => (
              <button
                key={`${c.conceptName}-${i}`}
                type="button"
                onClick={() => setConceptIdx(i)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all max-w-[200px] truncate border',
                  i === safeIdx
                    ? 'bg-fuchsia-700 text-white border-fuchsia-800 shadow-md'
                    : 'bg-white text-fuchsia-900 border-fuchsia-200 hover:bg-fuchsia-50',
                )}
                title={c.conceptName}
              >
                {c.conceptName}
              </button>
            ))}
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TeacherConceptCard concept={current} />
          </motion.div>
        </AnimatePresence>
      </TeacherConceptShell>
    </div>
  );
}
