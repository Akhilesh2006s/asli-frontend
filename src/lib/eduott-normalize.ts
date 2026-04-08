import {
  extractPlainSubjectName,
  getSubjectClassLabel,
} from '@/lib/subject-names';

/** Normalized fields for EduOTT lists (API + UI binding). */
export type EduOTTNormalized = {
  class: string;
  subject: string;
};

export function normalizeVideoLike(input: {
  subjectName?: string;
  classNumber?: string;
}): EduOTTNormalized {
  const subject = extractPlainSubjectName(input.subjectName || '').trim() || '';
  const classLabel = getSubjectClassLabel({
    name: input.subjectName,
    classNumber: input.classNumber,
  });
  return {
    class: classLabel || '',
    subject,
  };
}

export function normalizeSessionLike(input: {
  subject?: { name?: string };
  classNumber?: string;
}): EduOTTNormalized {
  const name = input.subject?.name || '';
  const subject = extractPlainSubjectName(name).trim() || '';
  const classLabel = getSubjectClassLabel({
    name,
    classNumber: input.classNumber,
  });
  return {
    class: classLabel || '',
    subject,
  };
}
