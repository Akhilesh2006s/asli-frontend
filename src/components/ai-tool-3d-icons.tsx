import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  BookText,
  Bookmark,
  Brain,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Clock3,
  Eye,
  FileQuestion,
  FileText,
  FlaskConical,
  GitBranch,
  GraduationCap,
  HelpCircle,
  Key,
  KeyRound,
  Layers,
  Lightbulb,
  ListChecks,
  ListOrdered,
  MessageCircle,
  MessageCircleQuestion,
  NotebookPen,
  Package,
  Sigma,
  Sparkles,
  Star,
  Tag,
  Tags,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Icons8 3D Fluency — glossy interactive icons (verified names only). */
const i3d = (name: string, size = 188) =>
  `https://img.icons8.com/3d-fluency/${size}/${name}.png`;
const i2d = (name: string, size = 96) =>
  `https://img.icons8.com/fluency/${size}/${name}.png`;

export const AI_TOOL_3D_ICONS = {
  student: i3d('student-male'),
  books: i3d('books'),
  book: i3d('book'),
  brain: i3d('brain'),
  rocket: i3d('rocket'),
  notebook: i3d('notepad'),
  target: i3d('goal'),
  graduation: i3d('graduation-cap'),
  lightbulb: i3d('idea'),
  formula: i3d('math'),
  mindMap: i3d('mind-map'),
  globe: i3d('globe'),
  magic: i3d('sparkles'),
  quiz: i3d('test-passed'),
  sparkle: i3d('sparkling'),
  checklist: i3d('checkmark'),
  openBook: i3d('open-book'),
  trophy: i3d('trophy', 94),
  star: i3d('star', 94),
  memo: i3d('note'),
  microscope: i3d('microscope'),
  testTube: i3d('test-tube'),
  molecule: i3d('molecule'),
  physics: i3d('physics'),
  calculator: i3d('calculator'),
  monitor: i3d('monitor'),
  compass: i3d('compass'),
  pencil: i3d('pencil'),
  document: i3d('document'),
  documents: i3d('documents'),
  clipboard: i3d('documents'),
  medal: i3d('medal'),
  puzzle: i3d('puzzle'),
  key: i3d('key'),
  shield: i3d('shield'),
  help: i3d('help'),
  info: i3d('info'),
  flowChart: i3d('flow-chart'),
  process: i3d('process'),
  reading: i3d('reading'),
  school: i3d('school'),
  diploma: i3d('diploma'),
  confetti: i3d('confetti'),
  scroll: i3d('scroll'),
  folder: i3d('opened-folder'),
  archive: i3d('archive'),
  chart: i3d('combo-chart'),
  clock: i3d('goal'),
  users: i3d('student-male'),
  package: i3d('opened-folder'),
  message: i3d('note'),
  zap: i3d('rocket'),
  eye: i3d('idea'),
  tag: i3d('bookmark'),
  branch: i3d('flow-chart'),
  list: i3d('checkmark'),
  question: i3d('help'),
  edit: i3d('pencil'),
  done: i3d('done'),
} as const;

export type AiTool3dIconName = keyof typeof AI_TOOL_3D_ICONS;

const FALLBACKS: Record<AiTool3dIconName, string> = {
  student: i2d('student-male'),
  books: i2d('books'),
  book: i2d('book'),
  brain: i2d('brain'),
  rocket: i2d('rocket'),
  notebook: i2d('spiral-bound-booklet'),
  target: i2d('goal'),
  graduation: i2d('graduation-cap'),
  lightbulb: i2d('idea'),
  formula: i2d('sigma'),
  mindMap: i2d('mind-map'),
  globe: i2d('globe'),
  magic: i2d('magic-wand'),
  quiz: i2d('test-passed'),
  sparkle: i2d('sparkling'),
  checklist: i2d('todo-list'),
  openBook: i2d('open-book'),
  trophy: i2d('trophy'),
  star: i2d('star'),
  memo: i2d('memo'),
  microscope: i2d('microscope'),
  testTube: i2d('test-tube'),
  molecule: i2d('molecule'),
  physics: i2d('physics'),
  calculator: i2d('calculator'),
  monitor: i2d('monitor'),
  compass: i2d('compass'),
  pencil: i2d('pencil'),
  document: i2d('document'),
  documents: i2d('documents'),
  clipboard: i2d('todo-list'),
  medal: i2d('medal'),
  puzzle: i2d('puzzle'),
  key: i2d('key'),
  shield: i2d('shield'),
  help: i2d('help'),
  info: i2d('info'),
  flowChart: i2d('flow-chart'),
  process: i2d('process'),
  reading: i2d('reading'),
  school: i2d('school'),
  diploma: i2d('diploma'),
  confetti: i2d('confetti'),
  scroll: i2d('scroll'),
  folder: i2d('opened-folder'),
  archive: i2d('archive'),
  chart: i2d('combo-chart'),
  clock: i2d('clock'),
  users: i2d('student-male'),
  package: i2d('opened-folder'),
  message: i2d('memo'),
  zap: i2d('rocket'),
  eye: i2d('idea'),
  tag: i2d('bookmark'),
  branch: i2d('flow-chart'),
  list: i2d('todo-list'),
  question: i2d('help'),
  edit: i2d('pencil'),
  done: i2d('done'),
};

/** Hero / header icon per AI tool slug. */
/** Hero icon for each of the 21 Super Admin AI tools (plus legacy aliases). */
export const TOOL_3D_ICON: Record<string, AiTool3dIconName> = {
  // Teacher tools
  'activity-project-generator': 'puzzle',
  'worksheet-mcq-generator': 'quiz',
  'concept-mastery-helper': 'brain',
  'lesson-planner': 'graduation',
  'exam-question-paper-generator': 'document',
  'daily-class-plan-maker': 'school',
  'homework-creator': 'pencil',
  'story-passage-creator': 'reading',
  'short-notes-summaries-maker': 'notebook',
  'flashcard-generator': 'books',
  // Student tools
  'smart-study-guide-generator': 'openBook',
  'smart-qa-practice-generator': 'question',
  'concept-breakdown-explainer': 'mindMap',
  'chapter-summary-creator': 'scroll',
  'key-points-formula-extractor': 'key',
  'quick-assignment-builder': 'clipboard',
  'my-study-decks': 'books',
  'mock-test-builder': 'medal',
  'project-idea-lab': 'puzzle',
  'reading-practice-room': 'reading',
  'study-schedule-maker': 'clock',
};

/** Focus-strip icons per tool (Explore / Understand / Practice / Apply). */
export const TOOL_FOCUS_ICONS: Record<string, AiTool3dIconName[]> = {
  'activity-project-generator': ['puzzle', 'users', 'lightbulb', 'rocket'],
  'worksheet-mcq-generator': ['quiz', 'checklist', 'pencil', 'medal'],
  'concept-mastery-helper': ['brain', 'target', 'lightbulb', 'trophy'],
  'lesson-planner': ['graduation', 'school', 'checklist', 'clock'],
  'exam-question-paper-generator': ['document', 'quiz', 'medal', 'shield'],
  'daily-class-plan-maker': ['school', 'clock', 'checklist', 'pencil'],
  'homework-creator': ['pencil', 'document', 'checklist', 'lightbulb'],
  'story-passage-creator': ['reading', 'books', 'sparkle', 'globe'],
  'short-notes-summaries-maker': ['notebook', 'memo', 'lightbulb', 'checklist'],
  'flashcard-generator': ['books', 'brain', 'sparkle', 'rocket'],
  'smart-study-guide-generator': ['openBook', 'brain', 'rocket', 'trophy'],
  'smart-qa-practice-generator': ['question', 'checklist', 'brain', 'trophy'],
  'concept-breakdown-explainer': ['mindMap', 'brain', 'lightbulb', 'puzzle'],
  'chapter-summary-creator': ['scroll', 'books', 'mindMap', 'checklist'],
  'key-points-formula-extractor': ['key', 'formula', 'star', 'lightbulb'],
  'quick-assignment-builder': ['clipboard', 'pencil', 'checklist', 'rocket'],
  'my-study-decks': ['books', 'notebook', 'brain', 'star'],
  'mock-test-builder': ['medal', 'quiz', 'clock', 'trophy'],
  'project-idea-lab': ['puzzle', 'lightbulb', 'microscope', 'rocket'],
  'reading-practice-room': ['reading', 'books', 'student', 'star'],
  'study-schedule-maker': ['clock', 'target', 'checklist', 'rocket'],
};

const DEFAULT_FOCUS: AiTool3dIconName[] = ['books', 'graduation', 'brain', 'student'];

export function focusIconsForTool(toolType?: string): AiTool3dIconName[] {
  const list = TOOL_FOCUS_ICONS[String(toolType || '')];
  if (!list) return DEFAULT_FOCUS;
  return list.map((n) => (n in AI_TOOL_3D_ICONS ? n : 'sparkle'));
}

export function heroIconForTool(toolType?: string): AiTool3dIconName {
  return TOOL_3D_ICON[String(toolType || '')] || 'books';
}

export function RealisticIcon({
  name,
  alt = '',
  className,
  float = true,
}: {
  name: AiTool3dIconName;
  alt?: string;
  className?: string;
  float?: boolean;
}) {
  const sources = [AI_TOOL_3D_ICONS[name], FALLBACKS[name]];
  const [index, setIndex] = useState(0);
  const src = sources[Math.min(index, sources.length - 1)];
  const failedAll = index >= sources.length;

  if (failedAll) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C63FF]/15 to-[#00C2FF]/15',
          className,
        )}
        aria-hidden
      >
        <Sparkles className="h-1/2 w-1/2 text-[#6C63FF]" />
      </div>
    );
  }

  const img = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full object-contain drop-shadow-lg select-none"
      onError={() => setIndex((i) => i + 1)}
    />
  );

  if (!float) {
    return <span className={cn('inline-flex shrink-0', className)}>{img}</span>;
  }

  return (
    <motion.span
      className={cn('inline-flex shrink-0 cursor-default', className)}
      animate={{ y: [0, -7, 0] }}
      transition={{
        duration: 3.4 + (name.length % 5) * 0.25,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.96 }}
    >
      {img}
    </motion.span>
  );
}

/** Section header chip used across tool viewers. */
export function AiTool3dSectionIcon({
  name,
  className,
  wrapClassName,
}: {
  name: AiTool3dIconName;
  className?: string;
  wrapClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm',
        wrapClassName,
      )}
    >
      <RealisticIcon name={name} alt="" className={cn('h-7 w-7', className)} />
    </div>
  );
}

/** Map existing Lucide section icons → Icons8 3D Fluency (drop-in for viewers). */
const LUCIDE_TO_3D = new Map<LucideIcon, AiTool3dIconName>([
  [AlertTriangle, 'shield'],
  [BookMarked, 'books'],
  [BookOpen, 'openBook'],
  [BookText, 'books'],
  [Bookmark, 'tag'],
  [Brain, 'brain'],
  [CalendarDays, 'school'],
  [CheckCircle2, 'done'],
  [CircleCheck, 'checklist'],
  [ClipboardCheck, 'checklist'],
  [ClipboardList, 'clipboard'],
  [Clock, 'clock'],
  [Clock3, 'clock'],
  [Eye, 'eye'],
  [FileQuestion, 'question'],
  [FileText, 'document'],
  [FlaskConical, 'testTube'],
  [GitBranch, 'branch'],
  [GraduationCap, 'graduation'],
  [HelpCircle, 'help'],
  [Key, 'key'],
  [KeyRound, 'key'],
  [Layers, 'books'],
  [Lightbulb, 'lightbulb'],
  [ListChecks, 'checklist'],
  [ListOrdered, 'list'],
  [MessageCircle, 'message'],
  [MessageCircleQuestion, 'question'],
  [NotebookPen, 'notebook'],
  [Package, 'package'],
  [Sigma, 'formula'],
  [Sparkles, 'sparkle'],
  [Star, 'star'],
  [Tag, 'tag'],
  [Tags, 'tag'],
  [Target, 'target'],
  [Users, 'users'],
  [Zap, 'zap'],
]);

export function lucideTo3dName(icon?: LucideIcon | null): AiTool3dIconName {
  if (!icon) return 'sparkle';
  return LUCIDE_TO_3D.get(icon) || 'sparkle';
}

/**
 * Drop-in replacement for Lucide icons in section headers.
 * Pass the same Lucide component reference viewers already use.
 */
export function ToolSectionIcon({
  icon,
  name,
  className,
  wrapClassName,
  size = 'md',
}: {
  icon?: LucideIcon | null;
  name?: AiTool3dIconName;
  className?: string;
  wrapClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const resolved = name || lucideTo3dName(icon);
  const dim = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-7 w-7';
  const wrap = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm',
        wrap,
        wrapClassName,
      )}
    >
      <RealisticIcon name={resolved} alt="" className={cn(dim, className)} />
    </div>
  );
}
