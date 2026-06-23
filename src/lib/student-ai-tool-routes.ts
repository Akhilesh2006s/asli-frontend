/**
 * Student legacy route aliases → canonical student backend tool ids.
 * Left column (teacher-style slug) maps to right column (student tool) on student routes only.
 */
export const STUDENT_LEGACY_TOOL_ROUTE_MAP: Record<string, string> = {
  'flashcard-generator': 'my-study-decks',
  'exam-question-paper-generator': 'mock-test-builder',
  'activity-project-generator': 'project-idea-lab',
  'lesson-planner': 'study-schedule-maker',
  'story-passage-creator': 'reading-practice-room',
};

export function resolveStudentAiApiToolType(toolType: string): string {
  return STUDENT_LEGACY_TOOL_ROUTE_MAP[toolType] ?? toolType;
}

export function resolveStudentToolConfigKey(toolType: string): string {
  return resolveStudentAiApiToolType(toolType);
}
