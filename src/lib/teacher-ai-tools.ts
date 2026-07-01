/** Teacher Vidya AI tools — aligned with teacher dashboard Available Tools */

import { isAiToolVisibleForSubjects, STORY_PASSAGE_TOOL_ID } from '@/lib/ai-tool-subject-rules';

export type TeacherAiTool = {
  id: string;
  title: string;
  description: string;
  route: string;
};

export const TEACHER_AI_TOOLS: TeacherAiTool[] = [
  {
    id: 'activity-project-generator',
    title: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum.',
    route: '/teacher/tools/activity-project-generator',
  },
  {
    id: 'worksheet-mcq-generator',
    title: 'Worksheet & MCQ Generator',
    description: 'Design custom worksheets and MCQs with various question types.',
    route: '/teacher/tools/worksheet-mcq-generator',
  },
  {
    id: 'concept-mastery-helper',
    title: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons.',
    route: '/teacher/tools/concept-mastery-helper',
  },
  {
    id: 'lesson-planner',
    title: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities.',
    route: '/teacher/tools/lesson-planner',
  },
  {
    id: 'exam-question-paper-generator',
    title: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty.',
    route: '/teacher/tools/exam-question-paper-generator',
  },
  {
    id: 'daily-class-plan-maker',
    title: 'Daily Class Plan Maker',
    description: 'Organize your daily teaching schedule efficiently.',
    route: '/teacher/tools/daily-class-plan-maker',
  },
  {
    id: 'homework-creator',
    title: 'Homework Creator',
    description: 'Generate meaningful homework assignments.',
    route: '/teacher/tools/homework-creator',
  },
  {
    id: 'story-passage-creator',
    title: 'Story & Passage Creator',
    description: 'Generate stories and reading passages (English, Hindi & Telugu only).',
    route: '/teacher/tools/story-passage-creator',
  },
  {
    id: 'short-notes-summaries-maker',
    title: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes.',
    route: '/teacher/tools/short-notes-summaries-maker',
  },
  {
    id: 'flashcard-generator',
    title: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision.',
    route: '/teacher/tools/flashcard-generator',
  },
];

export const TEACHER_AI_TOOLS_SUBTITLE =
  'Select a tool to get started. All tools use Gemini AI to generate content based on your input.';

export function filterVisibleTeacherTools(subjectNames: string[]): TeacherAiTool[] {
  return TEACHER_AI_TOOLS.filter(
    (tool) =>
      tool.id === STORY_PASSAGE_TOOL_ID || isAiToolVisibleForSubjects(tool.id, subjectNames),
  );
}
