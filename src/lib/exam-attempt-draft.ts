/** Local backup for exam autosave (survives refresh if last server save failed). */

export type ExamDraftLocal = {
  examId: string;
  answers: Record<string, unknown>;
  flaggedQuestions: number[];
  questionTimings: Record<string, number>;
  currentQuestionIndex: number;
  remainingSeconds: number;
  durationSeconds: number;
  lastSavedAt: string;
};

function storageKey(examId: string, userId?: string | null) {
  return `aslilearn:exam-draft:${String(userId || 'anon')}:${String(examId)}`;
}

export function readLocalExamDraft(examId: string, userId?: string | null): ExamDraftLocal | null {
  try {
    if (typeof window === 'undefined' || !examId) return null;
    const raw = window.localStorage.getItem(storageKey(examId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamDraftLocal;
    if (!parsed || String(parsed.examId) !== String(examId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalExamDraft(
  examId: string,
  payload: Omit<ExamDraftLocal, 'examId' | 'lastSavedAt'>,
  userId?: string | null,
) {
  try {
    if (typeof window === 'undefined' || !examId) return;
    const doc: ExamDraftLocal = {
      examId: String(examId),
      ...payload,
      lastSavedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey(examId, userId), JSON.stringify(doc));
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalExamDraft(examId: string, userId?: string | null) {
  try {
    if (typeof window === 'undefined' || !examId) return;
    window.localStorage.removeItem(storageKey(examId, userId));
  } catch {
    /* ignore */
  }
}

/** Prefer server draft when present; otherwise local. */
export function pickResumeDraft(
  server: ExamDraftLocal | null | undefined,
  local: ExamDraftLocal | null | undefined,
): ExamDraftLocal | null {
  if (server && local) {
    const s = new Date(server.lastSavedAt || 0).getTime();
    const l = new Date(local.lastSavedAt || 0).getTime();
    return l > s ? local : server;
  }
  return server || local || null;
}
