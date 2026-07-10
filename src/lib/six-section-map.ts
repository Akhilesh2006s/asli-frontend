import { FileText, ClipboardList, Users, KeyRound, GraduationCap, Sparkles } from 'lucide-react';
import { resolveWorksheetFromPayload } from '@/lib/parse-worksheet-mcq';
import { resolveLessonsFromPayload } from '@/lib/parse-lesson-planner';
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
const list = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
};
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

function blockHasContent(block: ContentBlock): boolean {
  switch (block.kind) {
    case 'lead':
    case 'titleLine':
      return Boolean(block.text?.trim());
    case 'bullets':
    case 'steps':
    case 'tips':
      return block.items.some((x) => String(x || '').trim());
    case 'keyValue':
      return block.rows.some((r) => String(r.value || '').trim());
    case 'mcq':
      return block.questions.some((q) => String(q.stem || '').trim());
    case 'shortAnswer':
      return block.questions.some((q) => String(q.stem || '').trim());
    case 'answerKey':
      return block.items.some((a) => String(a.answer || '').trim());
    case 'table':
      return block.rows.length > 0;
    case 'bloom':
      return block.chips.some((c) => String(c.desc || c.level || '').trim());
    default:
      return false;
  }
}

function sectionHasContent(section: SixSection): boolean {
  return section.blocks.some(blockHasContent);
}

function splitDifferentiation(raw: string): { support: string; core: string; stretch: string } {
  const t = String(raw || '').trim();
  if (!t) return { support: '', core: '', stretch: '' };
  const support = t.match(/support[:\s-]+([^|]+)/i)?.[1]?.trim() || '';
  const stretch = t.match(/stretch[:\s-]+([^|]+)/i)?.[1]?.trim() || '';
  const core = t.match(/core[:\s-]+([^|]+)/i)?.[1]?.trim() || t;
  return { support, core, stretch };
}

function legacyQuestionsToV2(sc: Dict, content: string): Dict {
  const { worksheet } = resolveWorksheetFromPayload(content, sc);
  const sectionA_mcq: Dict[] = [];
  const sectionB_fib: Dict[] = [];
  const sectionC_short: Dict[] = [];
  const sectionD_application: Dict[] = [];
  const sectionE_long: Dict[] = [];
  const answerKey: Dict[] = [];

  const pushQ = (q: Dict, bucket: Dict[]) => {
    const row = {
      question: str(q.question || q.prompt || q.text),
      answer: str(q.answer),
      marks: q.marks,
      options: Array.isArray(q.options) ? q.options.map(str) : undefined,
    };
    if (row.question) bucket.push(row);
  };

  if (worksheet?.sections?.length) {
    let n = 0;
    for (const sec of worksheet.sections) {
      const label = String(
        (sec as { sectionName?: string; label?: string; displayLabel?: string }).sectionName ||
          sec.label ||
          sec.displayLabel ||
          '',
      ).toLowerCase();
      for (const q of sec.questions || []) {
        n += 1;
        const row = {
          question: q.question,
          answer: q.answer,
          marks: q.marks,
          options: q.options,
        };
        if (label.includes('mcq') || label.includes('multiple')) pushQ(row, sectionA_mcq);
        else if (label.includes('fill') || label.includes('blank') || label.includes('fib')) pushQ(row, sectionB_fib);
        else if (label.includes('very short') || label.includes('vsa')) pushQ(row, sectionC_short);
        else if (label.includes('short') && !label.includes('very')) pushQ(row, sectionC_short);
        else if (label.includes('competency') || label.includes('application') || label.includes('case')) {
          pushQ(row, sectionD_application.length ? sectionE_long : sectionD_application);
        } else if (label.includes('long')) pushQ(row, sectionE_long);
        else if (sectionA_mcq.length <= sectionB_fib.length) pushQ(row, sectionA_mcq);
        else pushQ(row, sectionC_short);
        if (q.answer) answerKey.push({ q: String(n), answer: q.answer });
      }
    }
  }

  for (const [key, bucket] of [
    ['section_a_mcqs', sectionA_mcq],
    ['section_a', sectionA_mcq],
    ['section_b_fib', sectionB_fib],
    ['section_b', sectionB_fib],
    ['section_c_vsa', sectionC_short],
    ['section_c', sectionC_short],
    ['section_d_sa', sectionD_application],
    ['section_d', sectionD_application],
    ['section_e_competency', sectionE_long],
    ['section_e', sectionE_long],
  ] as const) {
    for (const q of arr(sc[key])) pushQ(q, bucket);
  }

  const diff = splitDifferentiation(str(sc.differentiation || sc.differentiation_plan));
  return {
    core: {
      title: str(worksheet?.title || sc.title || sc.worksheet_title),
      instructions: str(worksheet?.instructions || sc.instructions),
      sectionA_mcq: sectionA_mcq,
      sectionB_fib: sectionB_fib,
      sectionC_short: sectionC_short,
      sectionD_application: sectionD_application,
      sectionE_long: sectionE_long,
    },
    objectives: {
      items: list(sc.learning_objectives || sc.objectives),
      alignment: str(sc.ncf_competency_alignment || sc.curriculum_context),
      bloom: list(sc.bloom_level).length ? list(sc.bloom_level) : [],
    },
    differentiation: {
      support: str(sc.differentiation_support || diff.support),
      core: diff.core,
      stretch: str(sc.challenge_question || diff.stretch),
    },
    assessment: {
      answerKey: answerKey.length ? answerKey : [{ q: '1', answer: str(sc.answer_key) }],
      commonErrors: list(sc.common_mistakes_to_avoid),
    },
    teacher: {
      timing: str(sc.teacher_instructions?.[0] || sc.closure_exit_ticket),
      tlm: list(sc.teaching_aids_required || sc.materials_required),
      tips: list(sc.teacher_instructions),
    },
    reallife: {
      connection: str(sc.real_life_application),
      reflection: str(sc.reflection_exit_ticket),
    },
  };
}

function legacyPlanToV2(slug: string, sc: Dict, content: string): Dict {
  const toolKind = slug === 'study-schedule-maker' ? 'study-schedule-maker' : 'lesson-planner';
  const { lessons } = resolveLessonsFromPayload(content, sc, toolKind);
  const lesson = lessons[0];
  const steps = lesson
    ? [
        ...lesson.classroomActivities,
        ...lesson.studentTasks,
        lesson.homeworkPractice,
        ...lesson.timeline,
        ...lesson.studyPlanTable,
        lesson.conceptLearningSlot,
        lesson.practiceSlot,
      ].filter(Boolean)
    : list(sc.step_by_step_procedure || sc.steps || sc.classroom_activities);

  const diff = splitDifferentiation(lesson?.differentiationPlan || str(sc.differentiation || sc.differentiation_plan));
  return {
    core: {
      title: str(lesson?.lessonName || sc.title || sc.lesson_name || sc.activity_name),
      overview: str(lesson?.introductionWarmup || sc.introduction_warmup || sc.chapter_subtopic_overview),
      materials: lesson?.teachingAids?.length ? lesson.teachingAids : list(sc.materials_required || sc.teaching_aids_required),
      steps,
      roles: {
        teacher: (lesson?.teacherTalkPoints || list(sc.teacher_instructions || sc.teacher_talk_points)).join('; '),
        student: (lesson?.studentTasks || list(sc.student_instructions || sc.student_tasks)).join('; '),
      },
    },
    objectives: {
      items: lesson?.learningObjectives?.length ? lesson.learningObjectives : list(sc.learning_objectives),
      alignment: (lesson?.ncfAlignment || list(sc.ncf_competency_alignment)).join(' '),
    },
    differentiation: {
      support: str(lesson?.supportExtensionPlan || diff.support),
      core: diff.core,
      stretch: diff.stretch,
    },
    assessment: {
      answerKey: (lesson?.formativeQuestions || list(sc.formative_assessment_questions)).map((q, i) => ({
        q: String(i + 1),
        answer: str(q),
      })),
      commonErrors: list(sc.common_mistakes_to_avoid),
    },
    teacher: {
      timing: str(sc.closure_exit_ticket || lesson?.closureExitTicket),
      tlm: list(sc.teaching_aids_required || sc.materials_required),
      tips: list(sc.teacher_instructions || sc.teacher_talk_points),
    },
    reallife: {
      connection: str(sc.real_life_application),
      reflection: str(sc.reflection_exit_ticket || lesson?.reflectionExitTicket),
    },
  };
}

function legacyExplainToV2(sc: Dict): Dict {
  return {
    core: {
      title: str(
        sc.title ||
          sc.chapter_summary_title ||
          sc.study_guide_title ||
          sc.concept_title ||
          sc.note_title,
      ),
      definition: str(sc.simple_definition || sc.chapter_subtopic_overview || sc.short_note),
      explanation: list(sc.step_by_step_explanation || sc.important_concepts || sc.key_concepts_explained),
      keyPoints: list(sc.key_points || sc.key_points_to_remember || sc.quick_revision_notes),
      examples: list(sc.real_life_examples || sc.real_life_applications || sc.examples),
      formulae: list(sc.formulae || sc.important_formulae || sc.important_formulae_rules),
    },
    objectives: { items: list(sc.learning_objectives) },
    differentiation: splitDifferentiation(str(sc.differentiation || sc.differentiation_plan)),
    assessment: { commonErrors: list(sc.common_mistakes_to_avoid) },
    teacher: { tips: list(sc.exam_tips || sc.tips_for_further_improvement) },
    reallife: {
      connection: str(sc.real_life_application || sc.real_life_applications),
      reflection: str(sc.reflection_exit_ticket),
    },
  };
}

function legacyReadingToV2(sc: Dict): Dict {
  return {
    core: {
      title: str(sc.title || sc.story_passage_title || sc.reading_practice_title),
      passage: str(sc.passage || sc.story_passage_content || sc.content),
      vocabulary: list(sc.vocabulary_warm_up || sc.vocabulary),
      questions: [
        ...arr(sc.read_and_recall_questions),
        ...arr(sc.think_and_infer_questions),
        ...arr(sc.apply_and_connect_questions),
      ].map((q) => ({
        question: str(typeof q === 'string' ? q : q.question || q.text),
        answer: str(typeof q === 'object' ? q.answer : ''),
      })),
    },
    objectives: { items: list(sc.learning_objectives) },
    differentiation: splitDifferentiation(str(sc.differentiation || sc.differentiation_support)),
    assessment: { answerKey: list(sc.answer_key).map((a, i) => ({ q: String(i + 1), answer: str(a) })) },
    teacher: { tips: list(sc.teacher_instructions) },
    reallife: { connection: str(sc.real_life_application), reflection: str(sc.reflection_exit_ticket) },
  };
}

function legacyCardsToV2(sc: Dict): Dict {
  const cards = arr(sc.cards || sc.flashcard_set || sc.application_hots_cards).map((c) => ({
    front: str(c.front || c.task || c.term || c.question),
    back: str(c.back || c.solution || c.definition || c.answer),
  }));
  return {
    core: { title: str(sc.flashcard_deck_title || sc.deck_title || sc.title), cards },
    objectives: { items: list(sc.learning_objectives) },
    differentiation: { support: str(sc.differentiation_support), core: str(sc.differentiation) },
    assessment: { commonErrors: list(sc.common_mistakes_to_avoid) },
    teacher: { tips: [str(sc.deck_memory_hook), str(sc.self_check_rapid_recall_round)].filter(Boolean) },
    reallife: { connection: str(sc.real_life_connection || sc.real_life_application), reflection: str(sc.reflection_exit_ticket) },
  };
}

/** Map legacy canonical structuredContent into V2 six-section shape. */
export function mapLegacyStructuredToV2(toolSlug: string, structuredContent: Dict, content = ''): Dict | null {
  const family = FAMILY_OF[toolSlug];
  if (!family || !structuredContent || typeof structuredContent !== 'object') return null;
  if (family === 'questions') return legacyQuestionsToV2(structuredContent, content);
  if (family === 'plan') return legacyPlanToV2(toolSlug, structuredContent, content);
  if (family === 'explain') return legacyExplainToV2(structuredContent);
  if (family === 'reading') return legacyReadingToV2(structuredContent);
  if (family === 'cards') return legacyCardsToV2(structuredContent);
  return null;
}

export function mapRecordToSixSectionViewer(
  toolSlug: string,
  record: Record<string, unknown>,
  meta: { name: string; subtitle?: string; icon?: SixSectionViewerProps['tool']['icon']; curriculum?: SixSectionViewerProps['curriculum']; chapter?: SixSectionViewerProps['chapter'] },
): SixSectionViewerProps | null {
  const raw = (record.structuredContent ??
    (record.metadata as { structuredContent?: unknown } | undefined)?.structuredContent ??
    record) as Dict;
  if (!raw || typeof raw !== 'object') return null;

  const v2Like =
    raw.schema === 'asli-v2-six-section' ? raw : mapLegacyStructuredToV2(toolSlug, raw, String(record.generatedContent || record.content || ''));
  if (!v2Like) return null;

  const props = mapV2ToViewer(toolSlug, v2Like, meta);
  const sections = props.sections.filter(sectionHasContent);
  if (!sections.length) return null;
  return { ...props, sections };
}

export function recordUsesSixSectionViewer(record: Record<string, unknown> | null, slug: string): boolean {
  if (!record) return false;
  const val = (k: string) => String((record as Record<string, unknown>)[k] || '');
  return (
    mapRecordToSixSectionViewer(slug, record, {
      name: String(record.toolDisplayName || record.toolName || slug),
      curriculum: {
        board: val('board'),
        class: val('classLabel') || val('className'),
        subject: val('subject'),
        chapter: val('topic'),
        subtopic: val('subtopic'),
      },
      chapter: { title: val('topic'), subtopic: val('subtopic') },
    }) != null
  );
}

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
