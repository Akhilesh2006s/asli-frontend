/**
 * Public B2C copy: which Asli Prep IIT books we use, who they are for,
 * and which platform tools follow those chapters.
 */

export const B2C_BOARD_PRICE = 99;
export const B2C_IIT_PRICE = 249;

export type IitTrackCode = 'ALPHA' | 'BETA' | 'GAMMA';

export type IitTrackSpec = {
  code: IitTrackCode;
  name: string;
  book: string;
  classes: string;
  classNumbers: number[];
  headline: string;
  body: string;
  forWhom: string;
  points: string[];
  tone: {
    border: string;
    bg: string;
    badge: string;
    icon: string;
  };
};

export const IIT_TRACK_SPECS: IitTrackSpec[] = [
  {
    code: 'ALPHA',
    name: 'Alpha',
    book: 'Asli Prep Alpha',
    classes: 'Classes 6–8',
    classNumbers: [6, 7, 8],
    headline: 'Board fundamentals with early Foundation thinking',
    body: 'Chapter-by-chapter CBSE coverage with beginner Olympiad, JEE and NEET Foundation questions from the Asli Prep Alpha books.',
    forWhom: 'Best when the student is building school concepts first and wants a gentle start on competitive exams.',
    points: [
      'CBSE-aligned Alpha book chapters',
      'Concept videos and Vidya explanations for the same chapter',
      'Daily quizzes mapped to the Alpha book',
      'Foundation-level Olympiad / JEE / NEET practice',
    ],
    tone: {
      border: 'border-blue-200',
      bg: 'bg-gradient-to-br from-blue-50 to-white',
      badge: 'text-blue-700',
      icon: 'bg-blue-600 text-white',
    },
  },
  {
    code: 'BETA',
    name: 'Beta',
    book: 'Asli Prep Beta',
    classes: 'Classes 6–10',
    classNumbers: [6, 7, 8, 9, 10],
    headline: 'Deeper, exam-focused Foundation pathway',
    body: 'Asli Prep Beta books go beyond the Board syllabus with higher-difficulty JEE, NEET and Olympiad problem sets through Class 10.',
    forWhom: 'Choose Beta when the student is ready for a faster competitive pace alongside Board learning.',
    points: [
      'Beta book chapters as the source of truth',
      'Higher-difficulty adaptive practice from the same topics',
      'Previous-year question banks linked to Beta chapters',
      'Class-wise progression from 6 through 10',
    ],
    tone: {
      border: 'border-emerald-200',
      bg: 'bg-gradient-to-br from-emerald-50 to-white',
      badge: 'text-emerald-700',
      icon: 'bg-emerald-600 text-white',
    },
  },
  {
    code: 'GAMMA',
    name: 'Gamma',
    book: 'Asli Prep Gamma',
    classes: 'Classes 8–10',
    classNumbers: [8, 9, 10],
    headline: 'Advanced competitive stretch for older classes',
    body: 'Asli Prep Gamma is the advanced IIT Foundation book set — tougher multi-concept problems for students targeting serious JEE / NEET readiness.',
    forWhom: 'Recommended for Class 8–10 students who already handle Beta-level work comfortably.',
    points: [
      'Gamma book chapters for advanced Foundation',
      'Multi-concept and higher-order problems',
      'Timed mock tests aligned to Gamma topics',
      'Revision sheets pulled from the same Gamma chapters',
    ],
    tone: {
      border: 'border-violet-200',
      bg: 'bg-gradient-to-br from-violet-50 to-white',
      badge: 'text-violet-700',
      icon: 'bg-violet-600 text-white',
    },
  },
];

export const IIT_TOOLS_LINKED_TO_BOOKS = [
  {
    title: 'Vidya AI tutor',
    body: 'Doubts are answered from the same Alpha / Beta / Gamma chapter the student is studying — not generic internet content.',
  },
  {
    title: 'Daily quiz & question bank',
    body: 'Each day’s questions are generated from the current book chapter and sub-topic for that track.',
  },
  {
    title: 'Practice & mock exams',
    body: 'Board-pattern and Foundation papers reuse the same IIT book topics, so exam practice matches what is in the material.',
  },
  {
    title: 'Notes, worksheets & flashcards',
    body: 'Short notes, key points, worksheets and flashcards are produced from the selected Asli Prep book chapter.',
  },
];

/** Which tracks are offered for a given class number (6–10). */
export function tracksForClass(classNumber: number | string | null | undefined): IitTrackSpec[] {
  const n = Number(String(classNumber ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(n)) return IIT_TRACK_SPECS;
  return IIT_TRACK_SPECS.filter((t) => t.classNumbers.includes(n));
}

export function classNumbersFromLabel(label: string | number | null | undefined): number | null {
  const n = Number(String(label ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && n >= 6 && n <= 12 ? n : null;
}

export function recommendedTrackForClass(classNumber: number): IitTrackCode {
  if (classNumber <= 7) return 'ALPHA';
  if (classNumber === 8) return 'BETA';
  return 'GAMMA';
}

export const CLASS_TRACK_MATRIX: { classNumber: number; recommended: IitTrackCode; also: IitTrackCode[] }[] = [
  { classNumber: 6, recommended: 'ALPHA', also: ['BETA'] },
  { classNumber: 7, recommended: 'ALPHA', also: ['BETA'] },
  { classNumber: 8, recommended: 'BETA', also: ['ALPHA', 'GAMMA'] },
  { classNumber: 9, recommended: 'BETA', also: ['GAMMA'] },
  { classNumber: 10, recommended: 'GAMMA', also: ['BETA'] },
];
