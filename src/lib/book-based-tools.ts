/** Book-Based AI Generation — enabled tools (13). */
export const BOOK_BASED_TOOLS = [
  { id: 'my-study-decks', name: 'My Study Decks', description: 'Flashcard decks grounded in textbook content.' },
  { id: 'mock-test-builder', name: 'Mock Test Builder', description: 'Exam-style mock tests from uploaded books.' },
  { id: 'smart-study-guide-generator', name: 'Smart Study Guide Generator', description: 'Study guides aligned to textbook terminology.' },
  { id: 'concept-breakdown-explainer', name: 'Concept Breakdown Explainer', description: 'Step-by-step concept breakdown from book passages.' },
  { id: 'smart-qa-practice-generator', name: 'Smart Q&A Practice Generator', description: 'Practice Q&A sets using book definitions and examples.' },
  { id: 'key-points-formula-extractor', name: 'Key Points Extractor', description: 'Formulae, facts, and keywords from textbook chunks.' },
  { id: 'worksheet-mcq-generator', name: 'Worksheet & MCQ Generator', description: 'Worksheets and MCQs grounded in book content.' },
  { id: 'concept-mastery-helper', name: 'Concept Mastery Helper', description: 'Concept mastery notes from textbook material.' },
  { id: 'lesson-planner', name: 'Lesson Planner', description: 'Lesson plans aligned to uploaded textbook chapters.' },
  { id: 'short-notes-summaries-maker', name: 'Short Notes & Summaries', description: 'Concise revision notes from book passages.' },
  { id: 'flashcard-generator', name: 'Flash Card Generator', description: 'Teacher flashcard decks from textbook content.' },
  { id: 'exam-question-paper-generator', name: 'Exam Question Paper Generator', description: 'Full exam papers using book terminology.' },
  { id: 'homework-creator', name: 'Homework Creator', description: 'Homework tasks grounded in textbook material.' },
] as const;

export type BookBasedToolId = (typeof BOOK_BASED_TOOLS)[number]['id'];

export const BOOK_GENERATOR_BATCH_SIZE = 25;
export const BOOK_UNIQUENESS_TARGET = 50;
