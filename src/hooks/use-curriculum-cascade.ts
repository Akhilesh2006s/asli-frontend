import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/api-config';

type CurriculumRow = { id: string; name: string; label: string };

/** In-memory cache to avoid duplicate curriculum API calls (per session). */
const responseCache = new Map<string, unknown>();
const MAX_CACHE = 80;

function cacheKey(path: string) {
  return path;
}

function cacheGet<T>(key: string): T | undefined {
  return responseCache.get(key) as T | undefined;
}

function cacheSet(key: string, val: unknown) {
  if (responseCache.size >= MAX_CACHE) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, val);
}

function rowsToNames(rows: CurriculumRow[] | undefined): string[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((r) => r.name || r.label || r.id).filter(Boolean);
}

function normalizeSubjectKey(value: string): string {
  const compact = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'maths' || compact === 'math') return 'mathematics';
  if (compact === 'socialstudies' || compact === 'sst') return 'socialscience';
  return compact;
}

function dedupeSubjectOptions(subjects: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const subject of subjects) {
    const key = normalizeSubjectKey(subject);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(subject);
  }
  return result;
}

function fallbackSubjectsForGrade(gradeLevel: string | undefined): string[] {
  const g = normalizeGradeForCurriculum(gradeLevel);
  if (g === 'Class 6' || g === 'Class 7' || g === 'Class 8' || g === 'Class 10') {
    return ['Science', 'English', 'Hindi', 'Mathematics', 'Social Science'];
  }
  return [];
}

/** Legacy values still map for API calls if old form state exists. */
export function normalizeGradeForCurriculum(gradeLevel: string | undefined) {
  if (!gradeLevel) return undefined;
  if (gradeLevel === 'Class-6-IIT' || gradeLevel === 'IIT-6') return 'IIT-6';
  return gradeLevel;
}

/** NCERT topic/subtopic dropdowns are only loaded for these classes. */
export function isClass6Or7Grade(gradeLevel: string | undefined): boolean {
  const g = normalizeGradeForCurriculum(gradeLevel);
  return g === 'Class 6' || g === 'Class 7';
}

/** Classes currently supported in cascade-driven dropdown UI. */
export function isGradeWithScienceCurriculumDropdowns(gradeLevel: string | undefined): boolean {
  const g = normalizeGradeForCurriculum(gradeLevel);
  return g === 'Class 6' || g === 'Class 7' || g === 'Class 8' || g === 'Class 10';
}

async function fetchCurriculum(path: string, auth: string | null) {
  const key = cacheKey(path);
  if (responseCache.has(key)) {
    return cacheGet<{ success?: boolean; data?: CurriculumRow[] }>(key)!;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: auth ? `Bearer ${auth}` : '',
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  cacheSet(key, json);
  return json;
}

/**
 * Cascading curriculum: Class → Subject → Topic → Subtopic via /api/curriculum/*.
 * Does not call child endpoints until parent selection exists.
 */
export function useCurriculumCascade(gradeLevel: string | undefined, subject: string | undefined, topic: string | undefined) {
  const gradeForApi = normalizeGradeForCurriculum(gradeLevel);
  const [classRows, setClassRows] = useState<CurriculumRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  const authToken = useMemo(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        const data = await fetchCurriculum('/api/curriculum/classes?v=3', token);
        if (cancelled) return;
        const rows = (data as { data?: CurriculumRow[] }).data || [];
        setClassRows(rows);
      } catch {
        if (!cancelled) setClassRows([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi) {
      setSubjects([]);
      setLoadingSubjects(false);
      return;
    }

    (async () => {
      setLoadingSubjects(true);
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        const q = `/api/curriculum/subjects?classId=${encodeURIComponent(gradeForApi)}&syllabus=curriculum-v3`;
        const data = await fetchCurriculum(q, token);
        if (cancelled) return;
        const fetched = dedupeSubjectOptions(rowsToNames((data as { data?: CurriculumRow[] }).data));
        if (fetched.length > 0) {
          setSubjects(fetched);
        } else {
          setSubjects(fallbackSubjectsForGrade(gradeLevel));
        }
      } catch {
        if (!cancelled) setSubjects(fallbackSubjectsForGrade(gradeLevel));
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi || !subject) {
      setTopics([]);
      setLoadingTopics(false);
      return;
    }

    (async () => {
      setLoadingTopics(true);
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        const q = `/api/curriculum/topics?classId=${encodeURIComponent(gradeForApi)}&subjectId=${encodeURIComponent(subject)}&syllabus=ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1`;
        const data = await fetchCurriculum(q, token);
        if (cancelled) return;
        setTopics(rowsToNames((data as { data?: CurriculumRow[] }).data));
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject]);

  useEffect(() => {
    let cancelled = false;
    if (!gradeLevel || !gradeForApi || !subject || !topic) {
      setSubtopics([]);
      setLoadingSubtopics(false);
      return;
    }

    (async () => {
      setLoadingSubtopics(true);
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
        const q =
          `/api/curriculum/subtopics?classId=${encodeURIComponent(gradeForApi)}` +
          `&subjectId=${encodeURIComponent(subject)}&topicId=${encodeURIComponent(topic)}&syllabus=ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1`;
        const data = await fetchCurriculum(q, token);
        if (cancelled) return;
        setSubtopics(rowsToNames((data as { data?: CurriculumRow[] }).data));
      } catch {
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, topic]);

  const classOptions = useMemo(() => {
    if (classRows.length > 0) return classRows.map((r) => r.name || r.label || r.id);
    return [];
  }, [classRows]);

  return {
    /** Display names for Class dropdown (from API when loaded) */
    classOptions,
    classRows,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  };
}
