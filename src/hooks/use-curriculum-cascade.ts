import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';
import {
  getCurriculumResponseCache,
  hasCurriculumResponseCache,
  setCurriculumResponseCache,
} from '@/lib/curriculum-response-cache';
import { compareClassLabels, sortClassLabelsAscending } from '@/lib/super-admin-curriculum-classes';
import { mergePreservingPrimaryOrder } from '@/lib/curriculum-chapter-sort';
import {
  CURRICULUM_TAXONOMY_CHANGED_EVENT,
  getCurriculumTaxonomyRevision,
} from '@/lib/curriculum-taxonomy-refresh';

type CurriculumRow = { id: string; name: string; label: string };

function cacheKey(path: string) {
  return path;
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

/** Legacy values still map for API calls if old form state exists. */
export function normalizeGradeForCurriculum(gradeLevel: string | undefined) {
  if (!gradeLevel) return undefined;
  if (gradeLevel === 'Class-6-IIT' || gradeLevel === 'IIT-6') return 'Class 6';
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
  if (hasCurriculumResponseCache(key)) {
    return getCurriculumResponseCache<{ success?: boolean; data?: CurriculumRow[] }>(key)!;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: auth ? `Bearer ${auth}` : '',
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  setCurriculumResponseCache(key, json);
  return json;
}

async function fetchManagedTopicTaxonomy(
  auth: string | null,
  params: { board?: string; classLabel?: string; subject?: string; topicName?: string },
) {
  const buildPath = (includeBoard: boolean) => {
    const qs = new URLSearchParams();
    if (includeBoard && params.board) qs.set('board', params.board);
    if (params.classLabel) qs.set('classLabel', params.classLabel);
    if (params.subject) qs.set('subject', params.subject);
    if (params.topicName) qs.set('topicName', params.topicName);
    return `/api/ai-generator/topic-taxonomy?${qs.toString()}`;
  };

  const load = async (includeBoard: boolean) => {
    const path = buildPath(includeBoard);
    const key = cacheKey(path);
    if (hasCurriculumResponseCache(key)) {
      return getCurriculumResponseCache<{
        success?: boolean;
        data?: { subjects?: string[]; topics?: string[]; subTopics?: string[] };
      }>(key)!;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: auth ? `Bearer ${auth}` : '',
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (res.ok && json?.success !== false) {
      setCurriculumResponseCache(key, json);
    }
    return json;
  };

  let json = await load(true);
  return json;
}

/**
 * Cascading curriculum: Class → Subject → Topic → Subtopic via /api/curriculum/*.
 * Does not call child endpoints until parent selection exists.
 */
export function useCurriculumCascade(
  gradeLevel: string | undefined,
  subject: string | undefined,
  topic: string | undefined,
  board: string | undefined = undefined,
) {
  const gradeForApi = normalizeGradeForCurriculum(gradeLevel);
  const [classRows, setClassRows] = useState<CurriculumRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [taxonomyRevision, setTaxonomyRevision] = useState(getCurriculumTaxonomyRevision);

  useEffect(() => {
    const onTaxonomyChanged = () => setTaxonomyRevision(getCurriculumTaxonomyRevision());
    window.addEventListener(CURRICULUM_TAXONOMY_CHANGED_EVENT, onTaxonomyChanged);
    return () => window.removeEventListener(CURRICULUM_TAXONOMY_CHANGED_EVENT, onTaxonomyChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      try {
        const token = getAuthToken();
        const qs = new URLSearchParams({ v: '4' });
        if (board) qs.set('board', board);
        const data = await fetchCurriculum(`/api/curriculum/classes?${qs.toString()}`, token);
        if (cancelled) return;
        const rows = (data as { data?: CurriculumRow[] }).data || [];
        setClassRows(
          [...rows].sort((a, b) =>
            compareClassLabels(a.name || a.label || a.id, b.name || b.label || b.id),
          ),
        );
      } catch {
        if (!cancelled) setClassRows([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board]);

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
        const token = getAuthToken();
        const qs = new URLSearchParams({
          classId: gradeForApi,
          syllabus: 'curriculum-v3',
        });
        if (board) qs.set('board', board);
        const q = `/api/curriculum/subjects?${qs.toString()}`;
        const [data, managed] = await Promise.all([
          fetchCurriculum(q, token),
          fetchManagedTopicTaxonomy(token, { board, classLabel: gradeForApi }),
        ]);
        if (cancelled) return;
        const curriculumSubjects = dedupeSubjectOptions(rowsToNames((data as { data?: CurriculumRow[] }).data));
        const managedSubjects = (managed as { data?: { subjects?: string[] } })?.data?.subjects || [];
        setSubjects(dedupeSubjectOptions([...curriculumSubjects, ...managedSubjects]));
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, board, taxonomyRevision]);

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
        const token = getAuthToken();
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          syllabus: 'ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1',
        });
        if (board) qs.set('board', board);
        const q = `/api/curriculum/topics?${qs.toString()}`;
        const [data, managed] = await Promise.all([
          fetchCurriculum(q, token),
          fetchManagedTopicTaxonomy(token, { board, classLabel: gradeForApi, subject }),
        ]);
        if (cancelled) return;
        const curriculumTopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedTopics = (managed as { data?: { topics?: string[] } })?.data?.topics || [];
        setTopics(mergePreservingPrimaryOrder(managedTopics, curriculumTopics));
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, board, taxonomyRevision]);

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
        const token = getAuthToken();
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          topicId: topic,
          syllabus: 'ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1',
        });
        if (board) qs.set('board', board);
        const q = `/api/curriculum/subtopics?${qs.toString()}`;
        const [data, managed] = await Promise.all([
          fetchCurriculum(q, token),
          fetchManagedTopicTaxonomy(token, { board, classLabel: gradeForApi, subject, topicName: topic }),
        ]);
        if (cancelled) return;
        const curriculumSubtopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedSubtopics = (managed as { data?: { subTopics?: string[] } })?.data?.subTopics || [];
        setSubtopics(mergePreservingPrimaryOrder(managedSubtopics, curriculumSubtopics));
      } catch {
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, topic, board, taxonomyRevision]);

  const classOptions = useMemo(() => {
    if (classRows.length === 0) return [];
    let options = sortClassLabelsAscending(classRows.map((r) => r.name || r.label || r.id));
    const boardKey = String(board || '').toUpperCase().replace(/[\s/\\-]+/g, '');
    if (boardKey.includes('IIT') || boardKey.includes('NEET') || boardKey.includes('JEE')) {
      options = options.map((o) => (o === 'IIT-6' || o === 'Class-6-IIT' ? 'Class 6' : o));
      options = [...new Set(options)].filter((o) => o !== 'IIT-6' && o !== 'Class-6-IIT');
      if (!options.includes('Class 6')) {
        options = sortClassLabelsAscending([...options, 'Class 6']);
      }
    }
    return options;
  }, [classRows, board]);

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
