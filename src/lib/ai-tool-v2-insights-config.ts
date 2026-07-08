/** Tools that already render their own V2 insight tail — host should not duplicate. */
export const TOOLS_WITH_BUILTIN_INSIGHTS = new Set([
  'exam-question-paper-generator',
  'mock-test-builder',
  'lesson-planner',
  'worksheet-mcq-generator',
  'smart-qa-practice-generator',
  'story-passage-creator',
  'reading-practice-room',
  'smart-study-guide-generator',
]);

export type ToolInsightConfig = {
  sectionStartNum: number;
  bestPracticesText?: string;
};

const TOOL_INSIGHT_CONFIG: Record<string, ToolInsightConfig> = {
  'activity-project-generator': {
    sectionStartNum: 10,
    bestPracticesText:
      'Preview materials before class, assign roles in group work, and use the reflection prompt to close the activity with measurable outcomes.',
  },
  'concept-mastery-helper': {
    sectionStartNum: 10,
    bestPracticesText:
      'Use concept cards for spaced revision, then check formative questions before moving to application tasks.',
  },
  'daily-class-plan-maker': {
    sectionStartNum: 10,
    bestPracticesText:
      'Follow the day-wise flow in order: objectives → methods → activity → exit ticket → homework follow-up.',
  },
  'homework-creator': {
    sectionStartNum: 10,
    bestPracticesText:
      'Assign practice questions first, then application tasks. Review answers in the next class using the answer key snapshot.',
  },
  'flashcard-generator': {
    sectionStartNum: 8,
    bestPracticesText:
      'Shuffle cards each session, use memory hooks aloud, and revisit difficult cards after 24 hours for retention.',
  },
  'short-notes-summaries-maker': {
    sectionStartNum: 8,
    bestPracticesText:
      'Print for revision folders or share digitally before tests. Students should rewrite key points in their own words.',
  },
  'concept-breakdown-explainer': {
    sectionStartNum: 8,
    bestPracticesText:
      'Walk through each step visually, pause at checkpoints, and let students explain the concept back before moving on.',
  },
  'chapter-summary-creator': {
    sectionStartNum: 8,
    bestPracticesText:
      'Use overview + key concepts for pre-reading, then practice recall questions without notes before checking answers.',
  },
  'key-points-formula-extractor': {
    sectionStartNum: 8,
    bestPracticesText:
      'Highlight formulae and must-remember facts on a classroom wall chart; use mnemonics during quick drills.',
  },
  'quick-assignment-builder': {
    sectionStartNum: 8,
    bestPracticesText:
      'Set a clear time box, differentiate by task difficulty, and collect submissions against the rubric criteria.',
  },
  'my-study-decks': {
    sectionStartNum: 6,
    bestPracticesText:
      'Review a small deck daily, mark cards you miss, and rebuild the deck before exams with only weak cards.',
  },
  'mock-test-builder': {
    sectionStartNum: 12,
    bestPracticesText:
      'Simulate exam conditions with a timer, attempt all sections in order, then review using the answer key and Bloom tags.',
  },
  'project-idea-lab': {
    sectionStartNum: 10,
    bestPracticesText:
      'Let students choose one project track, scaffold research week-by-week, and assess with the provided success criteria.',
  },
  'study-schedule-maker': {
    sectionStartNum: 10,
    bestPracticesText:
      'Block short study sessions across the week, alternate subjects, and build in review slots before assessments.',
  },
};

export function getToolInsightConfig(toolSlug: string): ToolInsightConfig {
  return (
    TOOL_INSIGHT_CONFIG[toolSlug] || {
      sectionStartNum: 8,
      bestPracticesText:
        'Review generated sections in order, adapt examples to your class context, and align tasks with your weekly plan.',
    }
  );
}

export function toolHasBuiltinInsights(toolSlug: string): boolean {
  return TOOLS_WITH_BUILTIN_INSIGHTS.has(String(toolSlug || '').trim());
}
