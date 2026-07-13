/**
 * Map V2 six-section structuredContent → legacy shapes expected by
 * interactive specialized viewers (FlashcardViewer, WorksheetMcqViewer, etc.).
 */

type Dict = Record<string, unknown>;

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function arr(v: unknown): Dict[] {
  return Array.isArray(v) ? (v as Dict[]) : [];
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

export function isV2SixSectionStructured(value: unknown): value is Dict {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as Dict).schema === 'asli-v2-six-section',
  );
}

function mapCards(core: Dict) {
  return arr(core.cards)
    .map((c) => ({
      front: str(c.front || c.task || c.term || c.question),
      back: str(c.back || c.solution || c.definition || c.answer),
    }))
    .filter((c) => c.front && c.back);
}

function mapQuestionSections(core: Dict) {
  const sections: { sectionName: string; questions: Dict[]; count: number }[] = [];
  const push = (sectionName: string, type: string, rows: unknown) => {
    const questions = arr(rows as Dict[])
      .map((q, i) => ({
        question_number: i + 1,
        type,
        section: sectionName,
        question: str(q.question || q.prompt || q.text),
        options: Array.isArray(q.options) ? (q.options as unknown[]).map(str) : [],
        answer: str(q.answer),
        marks: q.marks,
      }))
      .filter((q) => q.question);
    if (questions.length) sections.push({ sectionName, questions, count: questions.length });
  };
  push('Section A: MCQs', 'MCQ', core.sectionA_mcq);
  push('Section B: Fill in the Blanks', 'FIB', core.sectionB_fib);
  push('Section C: Very Short Answer Questions', 'VSA', core.sectionC_short);
  push('Section D: Short Answer Questions', 'SA', core.sectionD_application);
  push('Section E: Competency / Real-life Application Questions', 'COMPETENCY', core.sectionE_long);
  return sections;
}

/** Flatten V2 payload for interactive viewers. Returns null if not V2 or empty. */
export function mapV2StructuredToLegacy(toolSlug: string, v2: unknown): Dict | null {
  if (!isV2SixSectionStructured(v2)) return null;
  const slug = String(toolSlug || v2.tool || '').trim();
  const core = (v2.core && typeof v2.core === 'object' ? v2.core : {}) as Dict;
  const objectives = (v2.objectives && typeof v2.objectives === 'object' ? v2.objectives : {}) as Dict;
  const differentiation = (
    v2.differentiation && typeof v2.differentiation === 'object' ? v2.differentiation : {}
  ) as Dict;
  const assessment = (v2.assessment && typeof v2.assessment === 'object' ? v2.assessment : {}) as Dict;
  const teacher = (v2.teacher && typeof v2.teacher === 'object' ? v2.teacher : {}) as Dict;
  const reallife = (v2.reallife && typeof v2.reallife === 'object' ? v2.reallife : {}) as Dict;
  const title = str(core.title || core.worksheetTitle || 'Generated content');

  const pedagogy = {
    learning_objectives: list(objectives.items),
    ncf_competency_alignment: str(objectives.alignment),
    bloom_level: list(objectives.bloom).join(' | '),
    differentiation_support: str(differentiation.support),
    common_mistakes_to_avoid: list(assessment.commonErrors),
    real_life_connection: str(reallife.connection),
    real_life_application: str(reallife.connection),
    reflection_exit_ticket: str(reallife.reflection),
    teacher_instructions: [str(teacher.timing), ...list(teacher.tlm), ...list(teacher.tips)].filter(
      Boolean,
    ),
  };

  if (slug === 'flashcard-generator' || slug === 'my-study-decks') {
    const cards = mapCards(core);
    if (!cards.length) return null;
    return {
      ...pedagogy,
      title,
      deck_title: title,
      flashcard_deck_title: title,
      cards,
      flashcard_set: cards,
      application_hots_cards: cards,
      prior_knowledge_required: str(core.overview) || pedagogy.ncf_competency_alignment,
      deck_memory_hook: list(teacher.tips)[0] || '',
      self_check_rapid_recall_round: str(assessment.rubric),
    };
  }

  if (
    [
      'worksheet-mcq-generator',
      'homework-creator',
      'mock-test-builder',
      'exam-question-paper-generator',
      'smart-qa-practice-generator',
      'quick-assignment-builder',
    ].includes(slug)
  ) {
    const sections = mapQuestionSections(core);
    if (!sections.length) return null;
    return {
      ...pedagogy,
      title,
      worksheet_title: title,
      paper_title: title,
      mock_test_title: title,
      practice_set_title: title,
      homework_title: title,
      assignment_title: title,
      instructions: str(core.instructions),
      sections,
      questions: sections.flatMap((s) => s.questions),
      answer_key: arr(assessment.answerKey)
        .map((a) => {
          const n = str(a.q || a.n);
          const ans = str(a.answer);
          return ans ? `${n ? `Q${n}. ` : ''}${ans}` : '';
        })
        .filter(Boolean)
        .join('\n'),
    };
  }

  // Explain / plan / reading — surface common legacy keys.
  return {
    ...pedagogy,
    title,
    concept_name: title,
    lesson_name: title,
    study_guide_title: title,
    chapter_summary_title: title,
    simple_definition: str(core.definition || core.overview || core.passage),
    step_by_step_explanation: list(core.explanation || core.steps),
    key_points: list(core.keyPoints),
    key_points_to_remember: list(core.keyPoints),
    examples: list(core.examples),
    formulae: list(core.formulae),
    materials_required: list(core.materials),
    step_by_step_procedure: list(core.steps),
    passage: str(core.passage),
    vocabulary: list(core.vocabulary),
    cards: mapCards(core),
  };
}
