import { API_BASE_URL } from '@/lib/api-config';
import { consolidateLearningPathSubjects } from '@/lib/learning-path-admin';
import { isActiveCatalogSubject, isSoftDeletedSubjectName } from '@/lib/subject-names';
import { filterContentsBySchoolProgram } from '@/lib/school-program';

export type LearningPathRole = 'admin' | 'teacher' | 'student';

export type SubjectWithPathContent = {
  _id: string;
  id: string;
  name: string;
  description?: string;
  board?: string;
  classNumber?: string;
  asliPrepContent: any[];
  totalContent: number;
  mergedSubjectIds?: string[];
};

function parseSubjectsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  return [];
}

function parseContentPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getContentSubjectId(content: any): string | null {
  const subj = content?.subject;
  if (subj == null) return null;
  if (typeof subj === 'object' && subj._id != null) return String(subj._id);
  if (typeof subj === 'string' && subj.trim()) return subj.trim();
  return null;
}

async function authFetch(path: string): Promise<any> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchSubjects(role: LearningPathRole): Promise<any[]> {
  if (role === 'admin') {
    const data = await authFetch('/api/admin/subjects');
    return parseSubjectsPayload(data);
  }
  if (role === 'teacher') {
    const data = await authFetch('/api/teacher/subjects');
    return parseSubjectsPayload(data);
  }
  const data = await authFetch('/api/student/subjects');
  return parseSubjectsPayload(data);
}

async function fetchAllPrepContent(role: LearningPathRole): Promise<any[]> {
  if (role === 'admin') {
    const data = await authFetch('/api/admin/asli-prep-content');
    return parseContentPayload(data);
  }
  if (role === 'teacher') {
    const data = await authFetch('/api/teacher/asli-prep-content');
    return parseContentPayload(data);
  }
  const data = await authFetch('/api/student/asli-prep-content');
  return parseContentPayload(data);
}

function sortContentNewestFirst(items: any[]): any[] {
  return items.slice().sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

async function fetchTeacherSubjectContent(subjectId: string): Promise<any[]> {
  const json = await authFetch(
    `/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}`
  );
  if (!json) return [];
  const data = json?.data ?? json;
  return parseContentPayload(data);
}

/** Teacher cards use per-subject fetch (sibling IDs resolved on the server). */
async function loadTeacherLearningPathCatalog(
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  const subjects = await fetchSubjects('teacher');
  const rows = await Promise.all(
    subjects.map(async (subject) => {
      const subjectId = String(subject._id || subject.id || '');
      if (!subjectId) return null;

      try {
        const asliPrepContent = sortContentNewestFirst(
          filterContentsBySchoolProgram(
            await fetchTeacherSubjectContent(subjectId),
            isAsliPrepExclusive
          )
        );
        if (asliPrepContent.length === 0) return null;

        return {
          _id: subjectId,
          id: subjectId,
          name: subject.name || 'Unknown Subject',
          description: subject.description || `Content for ${subject.name || 'Subject'}`,
          board: subject.board || '',
          classNumber: subject.classNumber,
          asliPrepContent,
          totalContent: asliPrepContent.length,
        };
      } catch {
        return null;
      }
    })
  );

  return rows
    .filter((row): row is SubjectWithPathContent => row != null)
    .filter((row) => isActiveCatalogSubject(row) && row.totalContent > 0)
    .sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
}

/** Load subjects grouped with catalog content — matches mobile teacher learning paths. */
export async function loadLearningPathCatalog(
  role: LearningPathRole,
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  if (role === 'teacher') {
    return loadTeacherLearningPathCatalog(isAsliPrepExclusive);
  }

  const [subjects, allContentRaw] = await Promise.all([
    fetchSubjects(role),
    fetchAllPrepContent(role),
  ]);

  const allContent = filterContentsBySchoolProgram(allContentRaw, isAsliPrepExclusive);
  const bySubjectId = new Map<string, any[]>();

  for (const item of allContent) {
    const sid = getContentSubjectId(item);
    if (!sid) continue;
    if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
    bySubjectId.get(sid)!.push(item);
  }

  const consumedIds = new Set<string>();
  const merged: SubjectWithPathContent[] = [];

  for (const subject of subjects) {
    const subjectId = String(subject._id || subject.id || '');
    if (!subjectId) continue;
    const asliPrepContent = sortContentNewestFirst(bySubjectId.get(subjectId) || []);
    consumedIds.add(subjectId);
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: subject.name || 'Unknown Subject',
      description: subject.description || '',
      board: subject.board || '',
      classNumber: subject.classNumber,
      asliPrepContent,
      totalContent: asliPrepContent.length,
    });
  }

  bySubjectId.forEach((items, subjectId) => {
    if (consumedIds.has(subjectId)) return;
    const sorted = sortContentNewestFirst(items);
    const first = sorted[0];
    const populated = first?.subject;
    const nameFromPopulate =
      typeof populated === 'object' && populated?.name ? populated.name : 'Subject';
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: nameFromPopulate,
      description: `Content for ${nameFromPopulate}`,
      board: first?.board || '',
      classNumber: first?.classNumber,
      asliPrepContent: sorted,
      totalContent: sorted.length,
    });
  });

  const withContent = merged.filter((row) => row.totalContent > 0);

  if (role === 'admin' || role === 'teacher') {
    return consolidateLearningPathSubjects(withContent).filter(
      (row) => isActiveCatalogSubject(row) && row.totalContent > 0
    );
  }

  return withContent
    .filter((row) => !isSoftDeletedSubjectName(row.name || ''))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
}
