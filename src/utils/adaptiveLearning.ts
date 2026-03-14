/**
 * Adaptive Learning Recommendation Engine
 * Analyzes exam results, quiz performance, and subject progress to recommend
 * videos, notes, and quizzes for weak topics.
 */

export interface SubjectProgressItem {
  id: string;
  name: string;
  progress: number;
  color?: string;
  currentTopic?: string;
  exams?: number;
  [key: string]: unknown;
}

export interface ExamResultItem {
  subjectWiseScore?: Record<string, { total: number; correct: number }>;
  totalMarks?: number;
  obtainedMarks?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  percentage?: number;
  [key: string]: unknown;
}

export interface QuizItem {
  _id: string;
  title: string;
  subject?: string;
  difficulty?: string;
  duration?: number;
  totalPoints?: number;
  bestScore?: number | null;
  questionCount?: number;
  [key: string]: unknown;
}

export interface SubjectItem {
  _id: string;
  id?: string;
  name: string;
  videos?: VideoItem[];
  assessments?: QuizItem[];
  quizzes?: QuizItem[];
  [key: string]: unknown;
}

export interface VideoItem {
  _id: string;
  title: string;
  subjectId?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface ContentItem {
  _id: string;
  title: string;
  type?: string;
  subject?: { _id: string; name: string } | string;
  fileUrl?: string;
  [key: string]: unknown;
}

export interface AdaptiveRecommendation {
  subject: string;
  subjectId: string;
  progress: number;
  color?: string;
  recommendations: {
    videos: VideoItem[];
    notes: ContentItem[];
    quizzes: QuizItem[];
  };
}

const WEAK_PROGRESS_THRESHOLD = 70;
const WEAK_EXAM_SCORE_THRESHOLD = 65;
const WEAK_QUIZ_ACCURACY_THRESHOLD = 60;
const MAX_WEAK_SUBJECTS = 3;
const MAX_VIDEOS_PER_SUBJECT = 3;
const MAX_NOTES_PER_SUBJECT = 2;
const MAX_QUIZ_PER_SUBJECT = 1;

const NOTE_TYPES = ['TextBook', 'Workbook', 'Material'];

/**
 * Normalize subject name to a key for matching (lowercase, trimmed).
 */
function toSubjectKey(name: string): string {
  return (name || '').toLowerCase().trim();
}

/**
 * Normalize any ID to string for comparison (ObjectId or string).
 */
function normId(x: unknown): string {
  if (x == null) return '';
  return String(x);
}

/**
 * Return possible keys used in exam subjectWiseScore for a given subject name.
 * Backend may store "Physics", "physics", "Maths", "mathematics", etc.
 */
function getSubjectKeyVariants(subjectName: string): string[] {
  const name = (subjectName || '').trim();
  const lower = name.toLowerCase();
  const set = new Set<string>([lower, name]);
  if (lower.includes('math') || lower.includes('mathematics')) {
    set.add('maths');
    set.add('math');
    set.add('mathematics');
  }
  if (lower.includes('physics')) set.add('physics');
  if (lower.includes('chemistry')) set.add('chemistry');
  if (lower.includes('biology')) set.add('biology');
  return Array.from(set);
}

/**
 * Get subject ID from subjects list by name match (and key variants).
 */
function getSubjectIdByName(subjects: SubjectItem[], subjectName: string): string {
  const key = toSubjectKey(subjectName);
  const found = subjects.find(
    (s) => toSubjectKey(s.name) === key || normId(s._id) === subjectName
  );
  return found ? normId(found._id) : '';
}

/**
 * Compute per-subject exam score (percentage) from exam results.
 * Tries all key variants so we match regardless of how backend stores subject names.
 */
function getExamScoreBySubject(
  examResults: ExamResultItem[],
  subjectName: string
): number | undefined {
  const variants = getSubjectKeyVariants(subjectName);
  const keyNorm = toSubjectKey(subjectName);
  let total = 0;
  let correct = 0;
  for (const result of examResults) {
    const sws = result.subjectWiseScore;
    if (!sws || typeof sws !== 'object') continue;
    let found = false;
    for (const key of variants) {
      const entry = sws[key];
      if (entry && typeof entry.total === 'number' && typeof entry.correct === 'number') {
        total += entry.total;
        correct += entry.correct;
        found = true;
        break;
      }
    }
    if (found) continue;
    for (const [k, entry] of Object.entries(sws)) {
      if (!entry || typeof (entry as any).total !== 'number' || typeof (entry as any).correct !== 'number') continue;
      const kLower = String(k).toLowerCase().trim();
      if (kLower === keyNorm || kLower.includes(keyNorm) || keyNorm.includes(kLower)) {
        total += (entry as any).total;
        correct += (entry as any).correct;
        break;
      }
    }
  }
  if (total === 0) return undefined;
  return Math.round((correct / total) * 100);
}

/**
 * Compute per-subject quiz accuracy (percentage) from quizzes.
 */
function getQuizAccuracyBySubject(
  quizzes: QuizItem[],
  subjectName: string
): number | undefined {
  const key = toSubjectKey(subjectName);
  const subjectQuizzes = quizzes.filter(
    (q) => q.subject && toSubjectKey(q.subject as string) === key
  );
  if (subjectQuizzes.length === 0) return undefined;
  let totalPoints = 0;
  let totalScore = 0;
  for (const q of subjectQuizzes) {
    const points = q.totalPoints ?? 0;
    const score = q.bestScore ?? 0;
    if (points > 0) {
      totalPoints += points;
      totalScore += score;
    }
  }
  if (totalPoints === 0) return undefined;
  return Math.round((totalScore / totalPoints) * 100);
}

/**
 * Determine if a subject is "weak" based on progress, exam score, and quiz accuracy.
 */
function isWeakSubject(
  progress: number,
  examScore: number | undefined,
  quizAccuracy: number | undefined
): boolean {
  if (progress < WEAK_PROGRESS_THRESHOLD) return true;
  if (examScore !== undefined && examScore < WEAK_EXAM_SCORE_THRESHOLD) return true;
  if (quizAccuracy !== undefined && quizAccuracy < WEAK_QUIZ_ACCURACY_THRESHOLD) return true;
  return false;
}

/**
 * Get content subject id for matching (handles populated or raw ref).
 */
function getContentSubjectId(content: ContentItem): string {
  const subj = content.subject;
  if (!subj) return '';
  if (typeof subj === 'object' && subj._id) return normId(subj._id);
  return normId(subj);
}

/**
 * Check if content belongs to subject (by id or name).
 */
function contentMatchesSubject(
  content: ContentItem,
  subjectId: string,
  subjectName: string
): boolean {
  const contentSubjId = getContentSubjectId(content);
  if (contentSubjId && subjectId && normId(contentSubjId) === normId(subjectId)) return true;
  const subj = content.subject;
  if (typeof subj === 'object' && subj?.name) {
    return toSubjectKey(subj.name) === toSubjectKey(subjectName);
  }
  if (typeof subj === 'string') return toSubjectKey(subj) === toSubjectKey(subjectName);
  return false;
}

export interface GenerateRecommendationsInput {
  subjectProgress: SubjectProgressItem[];
  examResults: ExamResultItem[];
  quizzes: QuizItem[];
  subjects: SubjectItem[];
  videos?: VideoItem[];
  content: ContentItem[];
}

/**
 * Compute a single "weakness" score (higher = needs more help). Used to rank subjects.
 */
function weaknessScore(
  progress: number,
  examScore: number | undefined,
  quizAccuracy: number | undefined
): number {
  const p = 100 - progress;
  const e = examScore === undefined ? 0 : Math.max(0, 100 - examScore);
  const q = quizAccuracy === undefined ? 0 : Math.max(0, 100 - quizAccuracy);
  return p * 0.5 + e * 0.35 + q * 0.15;
}

/**
 * Collect all subject keys from exam results and map to subject names using subjects list.
 */
function getWeakSubjectsFromExamResults(
  examResults: ExamResultItem[],
  subjects: SubjectItem[]
): Map<string, { name: string; subjectId: string; progress: number; examScore: number; quizAccuracy: number | undefined }> {
  const keyToName = new Map<string, string>();
  for (const s of subjects) {
    const name = s.name || '';
    for (const v of getSubjectKeyVariants(name)) keyToName.set(v, name);
    keyToName.set(toSubjectKey(name), name);
  }
  const weak = new Map<string, { name: string; subjectId: string; progress: number; examScore: number; quizAccuracy: number | undefined }>();
  for (const result of examResults) {
    const sws = result.subjectWiseScore;
    if (!sws || typeof sws !== 'object') continue;
    for (const [key, entry] of Object.entries(sws)) {
      if (!entry || typeof (entry as any).total !== 'number' || (entry as any).total === 0) continue;
      const correct = (entry as any).correct ?? 0;
      const total = (entry as any).total;
      const pct = Math.round((correct / total) * 100);
      if (pct >= WEAK_EXAM_SCORE_THRESHOLD) continue;
      const name = keyToName.get(key.toLowerCase()) || keyToName.get(key) || key.charAt(0).toUpperCase() + key.slice(1);
      const subjectId = getSubjectIdByName(subjects, name);
      const existing = weak.get(name);
      if (existing) {
        if (pct < existing.examScore) weak.set(name, { ...existing, examScore: pct });
      } else {
        weak.set(name, {
          name,
          subjectId,
          progress: pct,
          examScore: pct,
          quizAccuracy: undefined,
        });
      }
    }
  }
  return weak;
}

/**
 * Generate adaptive learning recommendations for weak subjects.
 * Uses exam results, quiz performance, and subject progress. Ranks by combined weakness.
 * Returns up to MAX_WEAK_SUBJECTS subjects. Each includes up to 3 videos, 2 notes, 1 quiz.
 */
export function generateAdaptiveRecommendations(input: GenerateRecommendationsInput): AdaptiveRecommendation[] {
  const {
    subjectProgress,
    examResults,
    quizzes,
    subjects,
    videos: flatVideos = [],
    content,
  } = input;

  if (!subjects?.length) return [];

  const seenContentIds = new Set<string>();
  const weakMap = new Map<string, {
    name: string;
    subjectId: string;
    progress: number;
    color?: string;
    examScore: number | undefined;
    quizAccuracy: number | undefined;
  }>();

  const key = (n: string) => toSubjectKey(n);

  // 1) Weak subjects from subject progress (exam + learning path)
  for (const sp of subjectProgress || []) {
    const name = sp.name;
    const subjectId = getSubjectIdByName(subjects, name);
    const examScore = getExamScoreBySubject(examResults || [], name);
    const quizAccuracy = getQuizAccuracyBySubject(quizzes || [], name);
    if (!isWeakSubject(sp.progress, examScore, quizAccuracy)) continue;
    weakMap.set(key(name), {
      name,
      subjectId,
      progress: sp.progress,
      color: sp.color,
      examScore,
      quizAccuracy,
    });
  }

  // 2) Add weak subjects from exam results only (e.g. no progress yet)
  const fromExams = getWeakSubjectsFromExamResults(examResults || [], subjects);
  fromExams.forEach((val) => {
    const k = key(val.name);
    if (weakMap.has(k)) return;
    weakMap.set(k, {
      name: val.name,
      subjectId: val.subjectId,
      progress: val.progress,
      examScore: val.examScore,
      quizAccuracy: val.quizAccuracy,
    });
  });

  const weakSubjects = Array.from(weakMap.values());
  weakSubjects.sort((a, b) => {
    const wa = weaknessScore(a.progress, a.examScore, a.quizAccuracy);
    const wb = weaknessScore(b.progress, b.examScore, b.quizAccuracy);
    return wb - wa;
  });
  const topWeak = weakSubjects.slice(0, MAX_WEAK_SUBJECTS);

  const recommendations: AdaptiveRecommendation[] = [];

  for (const ws of topWeak) {
    const subjectVideos: VideoItem[] = [];
    const subjectNotes: ContentItem[] = [];
    const subjectQuizzes: QuizItem[] = [];

    const subjectSubject = subjects.find((s) => toSubjectKey(s.name) === toSubjectKey(ws.name));
    const nestedVideos = subjectSubject?.videos ?? [];
    const nestedQuizzes = subjectSubject?.assessments ?? subjectSubject?.quizzes ?? [];

    for (const v of nestedVideos) {
      const vidId = v._id?.toString() || v._id;
      if (subjectVideos.length >= MAX_VIDEOS_PER_SUBJECT) break;
      if (vidId && !seenContentIds.has(`video-${vidId}`)) {
        subjectVideos.push(v);
        seenContentIds.add(`video-${vidId}`);
      }
    }
    if (subjectVideos.length < MAX_VIDEOS_PER_SUBJECT && flatVideos.length > 0) {
      const subjectIdStr = normId(ws.subjectId);
      for (const v of flatVideos) {
        if (subjectVideos.length >= MAX_VIDEOS_PER_SUBJECT) break;
        const vidId = v._id?.toString() || v._id;
        if (vidId && seenContentIds.has(`video-${vidId}`)) continue;
        const vSubjId = normId(v.subjectId);
        const matches = subjectIdStr && vSubjId && (vSubjId === subjectIdStr || toSubjectKey(vSubjId) === toSubjectKey(ws.name));
        if (matches) {
          subjectVideos.push(v);
          if (vidId) seenContentIds.add(`video-${vidId}`);
        }
      }
    }

    // 3) Add Video-type content from Digital Library (asli-prep-content) — same source as "78 files"
    for (const c of content) {
      if (subjectVideos.length >= MAX_VIDEOS_PER_SUBJECT) break;
      const type = (c.type || '').trim();
      if (type !== 'Video') continue;
      if (!contentMatchesSubject(c, ws.subjectId, ws.name)) continue;
      const cid = c._id?.toString() || c._id;
      if (cid && seenContentIds.has(`content-video-${cid}`)) continue;
      const url = c.fileUrl || '';
      subjectVideos.push({
        _id: String(cid),
        title: c.title || 'Video',
        videoUrl: url,
        youtubeUrl: url && (url.includes('youtube.com') || url.includes('youtu.be')) ? url : undefined,
        subjectId: ws.subjectId,
      } as VideoItem);
      if (cid) seenContentIds.add(`content-video-${cid}`);
    }

    for (const c of content) {
      if (subjectNotes.length >= MAX_NOTES_PER_SUBJECT) break;
      const type = (c.type || '').trim();
      if (!NOTE_TYPES.includes(type)) continue;
      if (!contentMatchesSubject(c, ws.subjectId, ws.name)) continue;
      const cid = c._id?.toString() || c._id;
      if (cid && seenContentIds.has(`content-${cid}`)) continue;
      subjectNotes.push(c);
      if (cid) seenContentIds.add(`content-${cid}`);
    }

    for (const q of nestedQuizzes) {
      if (subjectQuizzes.length >= MAX_QUIZ_PER_SUBJECT) break;
      const qSubject = (q.subject as string) || (q as QuizItem & { subjectIds?: { name: string }[] })?.subjectIds?.[0]?.name;
      if (!qSubject || toSubjectKey(qSubject) !== toSubjectKey(ws.name)) continue;
      const qid = q._id?.toString() || q._id;
      if (qid && !seenContentIds.has(`quiz-${qid}`)) {
        subjectQuizzes.push(q);
        seenContentIds.add(`quiz-${qid}`);
      }
    }
    if (subjectQuizzes.length < MAX_QUIZ_PER_SUBJECT) {
      for (const q of quizzes) {
        if (subjectQuizzes.length >= MAX_QUIZ_PER_SUBJECT) break;
        if (!q.subject || toSubjectKey(q.subject as string) !== toSubjectKey(ws.name)) continue;
        const qid = q._id?.toString() || q._id;
        if (qid && seenContentIds.has(`quiz-${qid}`)) continue;
        subjectQuizzes.push(q);
        if (qid) seenContentIds.add(`quiz-${qid}`);
      }
    }

    recommendations.push({
      subject: ws.name,
      subjectId: ws.subjectId,
      progress: ws.progress,
      color: ws.color,
      recommendations: {
        videos: subjectVideos.slice(0, MAX_VIDEOS_PER_SUBJECT),
        notes: subjectNotes.slice(0, MAX_NOTES_PER_SUBJECT),
        quizzes: subjectQuizzes.slice(0, MAX_QUIZ_PER_SUBJECT),
      },
    });
  }

  return recommendations;
}
