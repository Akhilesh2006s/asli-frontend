import { normalizeBoardKey } from '@/lib/board-label';
import { learningPathDisplayName } from '@/lib/learning-path-subjects';
import {
  extractPlainSubjectName,
  formatSubjectWithIitCategory,
} from '@/lib/subject-names';

export type LibrarySubjectRef = {
  _id?: string;
  name?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  board?: string | null;
};

export type LibraryContentLike = {
  title?: string | null;
  topic?: string | null;
  type?: string | null;
  classNumber?: string | number | null;
  productCategory?: string | null;
  board?: string | null;
  subject?: LibrarySubjectRef | string | null;
  subjectId?: LibrarySubjectRef | string | null;
};

function asSubjectRef(
  value: LibraryContentLike['subject'] | LibraryContentLike['subjectId'],
): LibrarySubjectRef | null {
  if (!value) return null;
  if (typeof value === 'string') return { _id: value };
  return value;
}

export function getLibraryContentProductCategory(row: LibraryContentLike): string {
  const direct = String(row.productCategory || '')
    .trim()
    .toUpperCase();
  if (direct && direct !== 'GENERAL' && direct !== 'NONE' && direct !== 'ALL') {
    return direct;
  }
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const fromSubject = String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
  if (fromSubject && fromSubject !== 'GENERAL' && fromSubject !== 'NONE' && fromSubject !== 'ALL') {
    return fromSubject;
  }
  return '';
}

function contentBoardKey(row: LibraryContentLike): string {
  const direct = normalizeBoardKey(String(row.board || ''));
  if (direct) return direct;
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  return normalizeBoardKey(String(subject?.board || ''));
}

/** IIT-board or Alpha/Beta/Gamma track materials (videos stay EduOTT). */
export function isIitTrackContent(row: LibraryContentLike): boolean {
  if (getLibraryContentProductCategory(row)) return true;
  const board = contentBoardKey(row);
  return board === 'IIT' || board === 'IIT/NEET';
}

export function getLibraryContentSubjectName(row: LibraryContentLike): string {
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  const raw = String(subject?.name || '').trim();
  if (raw) return learningPathDisplayName(raw) || extractPlainSubjectName(raw);
  return '';
}

/** e.g. Biology IIT Alpha — used under the Learning Paths IIT section. */
export function formatIitLearningPathContentLabel(
  row: LibraryContentLike,
  fallbackSubjectName?: string,
): string {
  const subjectName =
    getLibraryContentSubjectName(row) ||
    learningPathDisplayName(fallbackSubjectName || '') ||
    'Subject';
  const cat = getLibraryContentProductCategory(row);
  if (!cat) return `${subjectName} IIT`;
  return formatSubjectWithIitCategory(subjectName, cat);
}
