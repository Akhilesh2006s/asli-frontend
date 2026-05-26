import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Target,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import {
  resolveStoryContent,
  type ParsedStory,
  type ParsedPassagesBundle,
  type ResolvedStoryContent,
} from '@/lib/parse-story-content';
import { stripStructuredAiToolMetadata } from '@/lib/strip-ai-tool-metadata';

export type { ParsedStory, ParsedPassagesBundle };

type StoryPassageViewerProps = {
  content: string;
  rawData?: unknown;
  className?: string;
  variant?: 'default' | 'student';
};

function DefaultPassagesBundle({ bundle }: { bundle: ParsedPassagesBundle }) {
  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-4 p-1">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <h2 className="text-lg font-bold text-gray-900">{bundle.title}</h2>
        {(bundle.meta?.subject || bundle.meta?.chapter) && (
          <p className="text-sm text-gray-600 mt-1">
            {[bundle.meta?.subject, bundle.meta?.book, bundle.meta?.chapter].filter(Boolean).join(' · ')}
          </p>
        )}
        {bundle.instructions ? (
          <p className="mt-3 text-sm text-gray-700 bg-white rounded-lg p-3 border border-amber-100">
            {bundle.instructions}
          </p>
        ) : null}
      </div>
      {bundle.passages.map((p) => (
        <div key={p.passageNumber} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">
                {p.passageNumber}
              </span>
              Passage {p.passageNumber}
            </p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm leading-relaxed text-gray-800">{p.paragraph}</p>
            {p.questions.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800 border-t pt-3">
                {p.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultStoryCard({ story }: { story: ParsedStory }) {
  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-4 p-1">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <h2 className="text-lg font-bold text-gray-900">{story.title}</h2>
        {story.alignment ? <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{story.alignment}</p> : null}
      </div>
      {story.passage ? (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{story.passage}</p>
        </div>
      ) : null}
      {story.questions.length > 0 ? (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Questions</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {story.questions.map((q, i) => (
              <li key={i}>{q.question}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function EmptySectionHint() {
  return (
    <p className="text-sm text-stone-400 italic rounded-lg border border-dashed border-stone-200 bg-stone-50 px-2.5 py-1.5">
      Not included in this story set.
    </p>
  );
}

type StorySectionDef = {
  num: number;
  title: string;
  icon: LucideIcon;
  stripe: string;
  iconWrap: string;
  hasContent: (s: ParsedStory) => boolean;
  render: (s: ParsedStory) => ReactNode;
};

const STORY_TEMPLATE_SECTIONS: StorySectionDef[] = [
  {
    num: 1,
    title: 'Alignment block (NEP/NCF, skill focus, UDL)',
    icon: GraduationCap,
    stripe: 'border-blue-500',
    iconWrap: 'bg-blue-100 text-blue-700',
    hasContent: (s) => !!s.alignment,
    render: (s) => <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.alignment}</p>,
  },
  {
    num: 2,
    title: 'Learning objectives',
    icon: Target,
    stripe: 'border-violet-500',
    iconWrap: 'bg-violet-100 text-violet-700',
    hasContent: (s) => s.learningObjectives.length > 0,
    render: (s) => (
      <ul className="space-y-2">
        {s.learningObjectives.map((o, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-violet-50/80 px-3 py-2 text-sm">
            <Target className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" aria-hidden />
            {o}
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 3,
    title: 'Passage',
    icon: BookOpen,
    stripe: 'border-amber-500',
    iconWrap: 'bg-amber-100 text-amber-800',
    hasContent: (s) => !!s.passage,
    render: (s) => (
      <p className="font-serif text-base sm:text-lg leading-[1.85] text-slate-800 whitespace-pre-wrap">
        {s.passage}
      </p>
    ),
  },
  {
    num: 4,
    title: 'Vocabulary support',
    icon: BookMarked,
    stripe: 'border-teal-500',
    iconWrap: 'bg-teal-100 text-teal-800',
    hasContent: (s) => s.vocabulary.length > 0,
    render: (s) => (
      <div className="flex flex-wrap gap-2">
        {s.vocabulary.map((word, i) => (
          <span
            key={i}
            className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900"
          >
            {word}
          </span>
        ))}
      </div>
    ),
  },
  {
    num: 5,
    title: 'Comprehension and thinking questions',
    icon: HelpCircle,
    stripe: 'border-indigo-500',
    iconWrap: 'bg-indigo-100 text-indigo-700',
    hasContent: (s) => s.questions.length > 0,
    render: (s) => (
      <div className="space-y-2">
        {s.questions.map((q, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm text-slate-800 pt-0.5">{q.question}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: 6,
    title: 'Answer hints',
    icon: Lightbulb,
    stripe: 'border-yellow-500',
    iconWrap: 'bg-yellow-100 text-yellow-800',
    hasContent: (s) => s.answerHints.length > 0,
    render: (s) => (
      <ul className="space-y-2">
        {s.answerHints.map((h, i) => (
          <li key={i} className="flex gap-2 text-sm text-amber-950">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
            {h}
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 7,
    title: 'Differentiation',
    icon: Users,
    stripe: 'border-pink-500',
    iconWrap: 'bg-pink-100 text-pink-700',
    hasContent: (s) => !!(s.differentiationSupport || s.differentiationExtension),
    render: (s) => (
      <div className="space-y-2 text-sm">
        {s.differentiationSupport ? (
          <p>
            <span className="font-semibold text-pink-800">Support: </span>
            {s.differentiationSupport}
          </p>
        ) : null}
        {s.differentiationExtension ? (
          <p>
            <span className="font-semibold text-pink-800">Extension: </span>
            {s.differentiationExtension}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    num: 8,
    title: 'Real-life application',
    icon: Sparkles,
    stripe: 'border-sky-500',
    iconWrap: 'bg-sky-100 text-sky-800',
    hasContent: (s) => !!s.realLifeApplication,
    render: (s) => <p className="whitespace-pre-wrap text-sm">{s.realLifeApplication}</p>,
  },
  {
    num: 9,
    title: 'Reflection / exit ticket',
    icon: MessageCircle,
    stripe: 'border-indigo-400',
    iconWrap: 'bg-indigo-100 text-indigo-800',
    hasContent: (s) => !!s.reflection,
    render: (s) => (
      <p className="whitespace-pre-wrap text-sm italic text-slate-700">{s.reflection}</p>
    ),
  },
];

function StorySectionCard({
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
    <section className="h-fit w-full rounded-2xl bg-white border border-stone-200/90 shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5 border-l-[5px]', stripe)}>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{sectionNum}</p>
          <h4 className="text-xs font-bold text-stone-900 leading-snug">{title}</h4>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </section>
  );
}

function StudentStoryReading({ story }: { story: ParsedStory }) {
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-white border border-indigo-100 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40" />
        <div className="relative p-3 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Title of passage / story
          </p>
          <Badge className="mb-1.5 border-0 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
            Your read
          </Badge>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug font-serif">{story.title}</h4>
        </div>
      </div>

      {/* Masonry: only a small gap between boxes; height follows content */}
      <div className="columns-1 sm:columns-2 gap-2">
        {STORY_TEMPLATE_SECTIONS.map((sec) => (
          <div key={sec.num} className="mb-2 break-inside-avoid">
            <StorySectionCard
              sectionNum={`Section ${sec.num}`}
              title={sec.title}
              icon={sec.icon}
              stripe={sec.stripe}
              iconWrap={sec.iconWrap}
            >
              {sec.hasContent(story) ? sec.render(story) : <EmptySectionHint />}
            </StorySectionCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentPassagesBundle({ bundle }: { bundle: ParsedPassagesBundle }) {
  const [idx, setIdx] = useState(0);
  const safe = Math.min(idx, bundle.passages.length - 1);
  const current = bundle.passages[safe];

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-indigo-100 bg-white p-3 sm:p-4 shadow-sm">
        <h4 className="text-lg font-bold text-slate-900">{bundle.title}</h4>
        {bundle.instructions ? (
          <p className="mt-2 text-sm text-slate-600">{bundle.instructions}</p>
        ) : null}
      </div>

      {bundle.passages.length > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={safe === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-white disabled:opacity-40"
            aria-label="Previous passage"
          >
            <ChevronLeft className="h-5 w-5 text-indigo-700" />
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {bundle.passages.map((p, i) => (
              <button
                key={p.passageNumber}
                type="button"
                onClick={() => setIdx(i)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  i === safe
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100',
                )}
              >
                Passage {p.passageNumber}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={safe >= bundle.passages.length - 1}
            onClick={() => setIdx((i) => Math.min(bundle.passages.length - 1, i + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-white disabled:opacity-40"
            aria-label="Next passage"
          >
            <ChevronRight className="h-5 w-5 text-indigo-700" />
          </button>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={current.passageNumber}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <article className="rounded-2xl border border-amber-200/80 bg-[#fffdf8] px-5 py-6 sm:px-8 sm:py-8 shadow-inner">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/70 mb-3">
              Passage {current.passageNumber}
            </p>
            <p className="font-serif text-base sm:text-lg leading-[1.85] text-slate-800">{current.paragraph}</p>
          </article>
          {current.questions.length > 0 ? (
            <div className="mt-2 space-y-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                <HelpCircle className="h-4 w-4" aria-hidden />
                Comprehension questions
              </p>
              {current.questions.map((q, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-800 pt-0.5">{q}</p>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StudentStoryShell({
  resolved,
  children,
}: {
  resolved: ResolvedStoryContent;
  children: ReactNode;
}) {
  const count =
    resolved.mode === 'stories'
      ? resolved.stories.length
      : resolved.mode === 'passages'
        ? resolved.bundle.passages.length
        : 0;

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-3xl border border-indigo-200/80 shadow-xl shadow-indigo-200/30"
        style={{
          backgroundColor: '#f5f3ff',
          backgroundImage:
            'radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <BookMarked className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-100">
                  Reading studio
                </p>
                <h3 className="text-lg font-bold">Story &amp; Passage</h3>
              </div>
            </div>
            {count > 0 ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                {count} {resolved.mode === 'passages' ? 'passages' : 'stories'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

export function StoryPassageViewer({
  content,
  rawData,
  className,
  variant = 'default',
}: StoryPassageViewerProps) {
  const parsedContent = useMemo(
    () => stripStructuredAiToolMetadata(String(content || '')),
    [content],
  );

  const resolved = useMemo(
    () => resolveStoryContent(parsedContent, rawData),
    [parsedContent, rawData],
  );
  const [storyIdx, setStoryIdx] = useState(0);

  if (resolved.mode === 'empty') {
    if (variant === 'student') {
      return (
        <div
          className={cn(
            'rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-14 text-center',
            className,
          )}
        >
          <BookOpen className="mx-auto h-10 w-10 text-indigo-300 mb-3" aria-hidden />
          <p className="text-sm font-medium text-slate-700">No story content yet</p>
          <p className="text-xs text-slate-500 mt-1">Generate again to load your reading passage.</p>
        </div>
      );
    }
    return (
      <div
        className={cn('prose prose-sm max-w-none max-h-[80vh] overflow-y-auto p-4', className)}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    );
  }

  if (variant === 'student') {
    if (resolved.mode === 'passages') {
      return (
        <div className={className}>
          <StudentStoryShell resolved={resolved}>
            <StudentPassagesBundle bundle={resolved.bundle} />
          </StudentStoryShell>
        </div>
      );
    }

    const stories = resolved.stories;
    const safeIdx = Math.min(storyIdx, stories.length - 1);
    const current = stories[safeIdx];

    return (
      <div className={className}>
        <StudentStoryShell resolved={resolved}>
          {stories.length > 1 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {stories.map((s, i) => (
                <button
                  key={`${s.title}-${i}`}
                  type="button"
                  onClick={() => setStoryIdx(i)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold transition-all',
                    i === safeIdx
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-indigo-700 border border-indigo-100',
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIdx}
              className="h-fit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <StudentStoryReading story={current} />
            </motion.div>
          </AnimatePresence>
        </StudentStoryShell>
      </div>
    );
  }

  if (resolved.mode === 'passages') {
    return (
      <div className={className}>
        <DefaultPassagesBundle bundle={resolved.bundle} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {resolved.stories.map((story, i) => (
        <DefaultStoryCard key={`${story.title}-${i}`} story={story} />
      ))}
    </div>
  );
}
