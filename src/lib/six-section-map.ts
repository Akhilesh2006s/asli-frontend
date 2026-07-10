import { FileText, ClipboardList, Users, KeyRound, GraduationCap, Sparkles } from 'lucide-react';
import type { ContentBlock, SixSection, SixSectionViewerProps } from '@/components/ai-v2/six-section-viewer';

/**
 * Maps the backend V2 semantic JSON (schema: "asli-v2-six-section") into
 * SixSectionViewer props. Generation and presentation stay separate: the model
 * returns meaning, the frontend decides how it looks. Core rendering is chosen by
 * the tool's content family (questions / explain / plan / reading / cards).
 */

type Dict = Record<string, unknown>;
const arr = (v: unknown): Dict[] => (Array.isArray(v) ? (v as Dict[]) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const marks = (m: unknown): string | undefined =>
  m ? `${m} mark${Number(m) === 1 ? '' : 's'}` : undefined;

function toBloomChips(items: unknown): { level: string; desc: string }[] {
  return (Array.isArray(items) ? items : [])
    .map((x) => str(x))
    .filter(Boolean)
    .map((line) => {
      const [level, ...rest] = line.split(':');
      return { level: level.trim(), desc: rest.join(':').trim() };
    });
}

/** slug -> content family (mirrors backend v2ToolFamily). */
const FAMILY_OF: Record<string, 'questions' | 'explain' | 'plan' | 'reading' | 'cards'> = {
  'worksheet-mcq-generator': 'questions', 'homework-creator': 'questions', 'mock-test-builder': 'questions',
  'exam-question-paper-generator': 'questions', 'smart-qa-practice-generator': 'questions', 'quick-assignment-builder': 'questions',
  'concept-mastery-helper': 'explain', 'concept-breakdown-explainer': 'explain', 'smart-study-guide-generator': 'explain',
  'chapter-summary-creator': 'explain', 'key-points-formula-extractor': 'explain', 'short-notes-summaries-maker': 'explain',
  'activity-project-generator': 'plan', 'project-idea-lab': 'plan', 'lesson-planner': 'plan',
  'daily-class-plan-maker': 'plan', 'study-schedule-maker': 'plan',
  'reading-practice-room': 'reading', 'story-passage-creator': 'reading',
  'flashcard-generator': 'cards', 'my-study-decks': 'cards',
};

function questionsCore(core: Dict): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (core.instructions) blocks.push({ kind: 'lead', text: str(core.instructions) });
  let n = 0;
  const mcq = arr(core.sectionA_mcq);
  if (mcq.length) {
    blocks.push({
      kind: 'mcq',
      questions: mcq.map((q) => ({
        n: String(++n),
        stem: str(q.question),
        marks: marks(q.marks),
        options: (Array.isArray(q.options) ? q.options : []).map((o) => {
          const t = str(o);
          const label = t.match(/^([A-D])\)/)?.[1] ?? '';
          const clean = t.replace(/^[A-D]\)\s*/, '');
          const correct = str(q.answer).replace(/^[A-D]\)\s*/, '').trim() === clean.trim();
          return { label, text: clean, correct };
        }),
      })),
    });
  }
  for (const { title, key } of [
    { title: 'Section B — Fill in the Blanks', key: 'sectionB_fib' },
    { title: 'Section C — Short Answer', key: 'sectionC_short' },
    { title: 'Section D — Application', key: 'sectionD_application' },
    { title: 'Section E — Long Answer', key: 'sectionE_long' },
  ]) {
    const qs = arr(core[key]);
    if (!qs.length) continue;
    blocks.push({ kind: 'titleLine', text: title });
    blocks.push({ kind: 'shortAnswer', questions: qs.map((q) => ({ n: String(++n), stem: str(q.question), marks: marks(q.marks) })) });
  }
  return blocks;
}

function explainCore(core: Dict): ContentBlock[] {
  const b: ContentBlock[] = [];
  if (core.definition) b.push({ kind: 'lead', text: str(core.definition) });
  if (arr(core.explanation).length) b.push({ kind: 'bullets', items: (core.explanation as unknown[]).map(str) });
  if (arr(core.keyPoints).length) { b.push({ kind: 'titleLine', text: 'Key Points' }); b.push({ kind: 'bullets', items: (core.keyPoints as unknown[]).map(str) }); }
  if (arr(core.examples).length) { b.push({ kind: 'titleLine', text: 'Examples' }); b.push({ kind: 'bullets', items: (core.examples as unknown[]).map(str) }); }
  if (arr(core.formulae).length) { b.push({ kind: 'titleLine', text: 'Formulae & Rules' }); b.push({ kind: 'bullets', items: (core.formulae as unknown[]).map(str) }); }
  return b;
}

function planCore(core: Dict): ContentBlock[] {
  const b: ContentBlock[] = [];
  if (core.overview) b.push({ kind: 'lead', text: str(core.overview) });
  if (arr(core.materials).length) { b.push({ kind: 'titleLine', text: 'Materials' }); b.push({ kind: 'bullets', items: (core.materials as unknown[]).map(str) }); }
  if (arr(core.steps).length) { b.push({ kind: 'titleLine', text: 'Steps' }); b.push({ kind: 'steps', items: (core.steps as unknown[]).map(str) }); }
  const roles = (core.roles as Dict) || {};
  const rows = [{ label: 'Teacher', value: str(roles.teacher) }, { label: 'Student', value: str(roles.student) }].filter((r) => r.value);
  if (rows.length) b.push({ kind: 'keyValue', rows });
  return b;
}

function readingCore(core: Dict): ContentBlock[] {
  const b: ContentBlock[] = [];
  if (core.passage) b.push({ kind: 'lead', text: str(core.passage) });
  if (arr(core.vocabulary).length) { b.push({ kind: 'titleLine', text: 'Vocabulary' }); b.push({ kind: 'bullets', items: (core.vocabulary as unknown[]).map(str) }); }
  const qs = arr(core.questions);
  if (qs.length) { b.push({ kind: 'titleLine', text: 'Questions' }); b.push({ kind: 'shortAnswer', questions: qs.map((q, i) => ({ n: String(i + 1), stem: str(q.question) })) }); }
  return b;
}

function cardsCore(core: Dict): ContentBlock[] {
  const cards = arr(core.cards);
  if (!cards.length) return [];
  return [{ kind: 'table', head: ['#', 'Front', 'Back'], rows: cards.map((c, i) => [String(i + 1), str(c.front), str(c.back)]) }];
}

const CORE_BUILDERS = { questions: questionsCore, explain: explainCore, plan: planCore, reading: readingCore, cards: cardsCore };

/** Build the full viewer props from V2 structuredContent. */
export function mapV2ToViewer(
  toolSlug: string,
  structuredContent: Dict,
  meta: { name: string; subtitle?: string; icon?: SixSectionViewerProps['tool']['icon']; curriculum?: SixSectionViewerProps['curriculum']; chapter?: SixSectionViewerProps['chapter'] },
): SixSectionViewerProps {
  const sc = structuredContent || {};
  const core = (sc.core as Dict) || {};
  const objectives = (sc.objectives as Dict) || {};
  const differentiation = (sc.differentiation as Dict) || {};
  const assessment = (sc.assessment as Dict) || {};
  const teacher = (sc.teacher as Dict) || {};
  const reallife = (sc.reallife as Dict) || {};

  const family = FAMILY_OF[toolSlug];
  const buildCore = (family && CORE_BUILDERS[family]) || (() => []);

  const sections: SixSection[] = [
    { id: 'core', label: str(core.title) || str(core.worksheetTitle) || 'Core — Classroom Ready', accent: 'blue', icon: FileText, full: true, blocks: buildCore(core) },
    {
      id: 'objectives', label: 'Objectives & Curriculum Alignment', accent: 'blue', icon: ClipboardList,
      blocks: [
        ...(arr(objectives.items).length ? [{ kind: 'bullets', items: (objectives.items as unknown[]).map(str) } as ContentBlock] : []),
        ...(objectives.alignment ? [{ kind: 'lead', text: str(objectives.alignment) } as ContentBlock] : []),
        ...(Array.isArray(objectives.bloom) ? [{ kind: 'bloom', chips: toBloomChips(objectives.bloom) } as ContentBlock] : []),
      ],
    },
    {
      id: 'differentiation', label: 'Differentiation & Support', accent: 'violet', icon: Users,
      blocks: [{ kind: 'keyValue', rows: [
        { label: 'Support', value: str(differentiation.support) },
        { label: 'Core', value: str(differentiation.core) },
        { label: 'Stretch', value: str(differentiation.stretch) },
      ].filter((r) => r.value) }],
    },
    {
      id: 'assessment', label: 'Answer Key & Feedback', accent: 'green', icon: KeyRound, full: true,
      blocks: [
        ...(arr(assessment.answerKey).length ? [{ kind: 'answerKey', items: arr(assessment.answerKey).map((a) => ({ n: str(a.q), answer: str(a.answer), work: str(a.working) })) } as ContentBlock] : []),
        ...(Array.isArray(assessment.commonErrors) && assessment.commonErrors.length ? [{ kind: 'tips', items: (assessment.commonErrors as unknown[]).map(str) } as ContentBlock] : []),
      ],
    },
    {
      id: 'teacher', label: "Teacher's Implementation Guide", accent: 'teal', icon: GraduationCap, full: true,
      blocks: [{ kind: 'tips', items: [str(teacher.timing), ...arr(teacher.tlm).map(str), ...arr(teacher.tips).map(str)].filter(Boolean) }],
    },
    {
      id: 'reallife', label: 'Real-Life Connection & Reflection', accent: 'amber', icon: Sparkles, full: true,
      blocks: [{ kind: 'bullets', items: [str(reallife.connection), str(reallife.family), str(reallife.reflection)].filter(Boolean) }],
    },
  ];

  return {
    tool: { name: meta.name, subtitle: meta.subtitle, icon: meta.icon || FileText },
    curriculum: meta.curriculum,
    chapter: meta.chapter,
    sections,
  };
}
