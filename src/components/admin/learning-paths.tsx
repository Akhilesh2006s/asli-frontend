import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BookOpen, 
  GraduationCap,
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  Layers3
} from 'lucide-react';
import { useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import {
  extractPlainSubjectName,
  getLearningPathClassLabel,
} from '@/lib/subject-names';

function subjectMatchesClassFilter(
  row: {
    name?: string;
    classNumber?: string;
    asliPrepContent?: Array<{ classNumber?: string }>;
  },
  classFilter: string
): boolean {
  if (classFilter === 'all') return true;
  const label = getLearningPathClassLabel(row);
  return label === classFilter;
}

function getContentSubjectId(content: any): string | null {
  const subj = content?.subject;
  if (subj == null) return null;
  if (typeof subj === 'object' && subj._id != null) return String(subj._id);
  if (typeof subj === 'string' && subj.trim()) return subj.trim();
  return null;
}

/** Collapse duplicate Subject rows (e.g. BIO vs Biology vs BIOLOGY) for the same class. */
function normalizeSubjectNameForMerge(name: string): string {
  const plain = extractPlainSubjectName(name || '').trim().toLowerCase();
  if (/^bio(logy)?$/.test(plain) || plain === 'bio') return 'biology';
  return plain;
}

function groupKeyForSubjectRow(row: {
  name?: string;
  classNumber?: string;
  asliPrepContent?: any[];
}): string {
  const classLabel =
    getLearningPathClassLabel(row) ||
    String(row.classNumber || '').trim() ||
    'none';
  return `${classLabel}::${normalizeSubjectNameForMerge(row.name || '')}`;
}

function consolidateDuplicateSubjectCards(rows: any[]): any[] {
  const byKey = new Map<string, any>();

  for (const row of rows) {
    const key = groupKeyForSubjectRow(row);
    const rowId = String(row._id || row.id);
    const incoming = [...(row.asliPrepContent || [])];

    if (!byKey.has(key)) {
      byKey.set(key, {
        ...row,
        mergedSubjectIds: [rowId],
        asliPrepContent: incoming,
      });
      continue;
    }

    const agg = byKey.get(key)!;
    const idSet = new Set<string>(
      Array.isArray(agg.mergedSubjectIds)
        ? agg.mergedSubjectIds
        : [String(agg._id || agg.id)]
    );
    idSet.add(rowId);
    agg.mergedSubjectIds = Array.from(idSet);

    const seen = new Set(
      (agg.asliPrepContent || []).map((c: any) => String(c._id))
    );
    for (const c of incoming) {
      const cid = String(c._id);
      if (!seen.has(cid)) {
        seen.add(cid);
        agg.asliPrepContent.push(c);
      }
    }

    if ((row.name || '').length > (agg.name || '').length) {
      agg.name = row.name;
    }
    if ((!agg.description || !String(agg.description).trim()) && row.description) {
      agg.description = row.description;
    }
    if (
      (agg.classNumber == null || String(agg.classNumber).trim() === '') &&
      row.classNumber != null
    ) {
      agg.classNumber = row.classNumber;
    }
  }

  const result = Array.from(byKey.values()).map((agg) => {
    const contents = (agg.asliPrepContent || []).slice().sort((a: any, b: any) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const ids: string[] =
      agg.mergedSubjectIds && agg.mergedSubjectIds.length > 0
        ? agg.mergedSubjectIds
        : [String(agg._id || agg.id)];

    const countBySubject = new Map<string, number>();
    for (const c of contents) {
      const sid = getContentSubjectId(c);
      if (!sid) continue;
      countBySubject.set(sid, (countBySubject.get(sid) || 0) + 1);
    }

    let primaryId = String(agg._id || agg.id);
    let max = -1;
    for (const sid of ids) {
      const n = countBySubject.get(sid) || 0;
      if (n > max) {
        max = n;
        primaryId = sid;
      }
    }
    if (max <= 0) {
      primaryId = ids[0];
    }

    const inferredClass =
      (agg.classNumber != null && String(agg.classNumber).trim() !== ''
        ? String(agg.classNumber).trim()
        : null) ||
      (() => {
        for (const c of contents) {
          const cn = c?.classNumber != null && String(c.classNumber).trim() !== ''
            ? String(c.classNumber).trim()
            : '';
          if (cn) return cn;
        }
        return null;
      })();

    return {
      ...agg,
      _id: primaryId,
      id: primaryId,
      mergedSubjectIds: ids,
      asliPrepContent: contents,
      totalContent: contents.length,
      ...(inferredClass ? { classNumber: inferredClass } : {}),
    };
  });

  return result.sort((a: any, b: any) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  );
}

export default function AdminLearningPaths() {
  const [, setLocation] = useLocation();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectsWithContent, setSubjectsWithContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const classOptionsFromData = useMemo(() => {
    const classSet = new Set<string>();
    subjectsWithContent.forEach((subj: any) => {
      const label = getLearningPathClassLabel(subj);
      if (label) classSet.add(label);
    });
    return Array.from(classSet).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [subjectsWithContent]);

  const subjectNameOptions = useMemo(() => {
    const names = new Set<string>();
    subjectsWithContent.forEach((subj: any) => {
      if (!subjectMatchesClassFilter(subj, classFilter)) return;
      names.add(extractPlainSubjectName(subj.name || '').trim());
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [subjectsWithContent, classFilter]);

  const filteredSubjectsWithContent = useMemo(() => {
    return subjectsWithContent.filter((subj: any) => {
      if (!subjectMatchesClassFilter(subj, classFilter)) return false;
      if (subjectFilter === 'all') return true;
      return (
        extractPlainSubjectName(subj.name || '').toLowerCase() ===
        subjectFilter.toLowerCase()
      );
    });
  }, [subjectsWithContent, classFilter, subjectFilter]);

  const groupedSubjectsByClass = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const subj of filteredSubjectsWithContent) {
      const classLabel = getLearningPathClassLabel(subj) || 'Unassigned';
      if (!grouped.has(classLabel)) grouped.set(classLabel, []);
      grouped.get(classLabel)!.push(subj);
    }

    const classKeys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return classKeys.map((classKey) => ({
      classKey,
      subjects: (grouped.get(classKey) || []).slice().sort((a: any, b: any) =>
        extractPlainSubjectName(a.name || '').localeCompare(
          extractPlainSubjectName(b.name || ''),
          undefined,
          { sensitivity: 'base' }
        )
      ),
    }));
  }, [filteredSubjectsWithContent]);

  const totalContentItemsInView = useMemo(
    () =>
      filteredSubjectsWithContent.reduce(
        (sum: number, subj: any) => sum + (subj.asliPrepContent?.length || 0),
        0
      ),
    [filteredSubjectsWithContent]
  );

  useEffect(() => {
    setSubjectFilter('all');
  }, [classFilter]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void fetchSubjectsWithContent();
  }, [subjects, isLoading]);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both array and object responses
        const subjectsArray = Array.isArray(data) ? data : (data.data || data.subjects || []);
        setSubjects(subjectsArray);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjectsWithContent = async () => {
    try {
      setIsLoadingContent(true);
      const token = localStorage.getItem('authToken');

      // One request for all Asli Prep content (same source Super Admin uses), then group by subject.
      // This avoids missing paths when the catalog has more content than per-subject calls surface.
      let allContent: any[] = [];
      try {
        const contentResponse = await fetch(
          `${API_BASE_URL}/api/admin/asli-prep-content`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          allContent = contentData.data || contentData || [];
          if (!Array.isArray(allContent)) allContent = [];
        }
      } catch (e) {
        console.error('Failed to fetch all asli-prep content:', e);
        allContent = [];
      }

      const bySubjectId = new Map<string, any[]>();
      for (const item of allContent) {
        const sid = getContentSubjectId(item);
        if (!sid) continue;
        if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
        bySubjectId.get(sid)!.push(item);
      }

      const consumedIds = new Set<string>();
      const merged: any[] = [];

      for (const subject of subjects) {
        const subjectId = String(subject._id || subject.id);
        const asliPrepContent = (bySubjectId.get(subjectId) || [])
          .slice()
          .sort((a: any, b: any) => {
            const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });
        consumedIds.add(subjectId);
        merged.push({
          _id: subject._id || subject.id,
          id: subject._id || subject.id,
          name: subject.name || 'Unknown Subject',
          description: subject.description || '',
          board: subject.board || '',
          classNumber: subject.classNumber,
          asliPrepContent,
          totalContent: asliPrepContent.length,
        });
      }

      // Subjects that only appear on content (e.g. catalog row missing from /subjects response)
      bySubjectId.forEach((items, subjectId) => {
        if (consumedIds.has(subjectId)) return;
        const sorted = items.slice().sort((a: any, b: any) => {
          const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        const first = sorted[0];
        const populated = first?.subject;
        const nameFromPopulate =
          typeof populated === 'object' && populated?.name
            ? populated.name
            : 'Subject';
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

      const consolidated = consolidateDuplicateSubjectCards(merged);
      setSubjectsWithContent(consolidated);
    } catch (error) {
      console.error('Failed to fetch subjects with content:', error);
      setSubjectsWithContent([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const getSubjectIcon = (subjectName: string) => {
    if (subjectName.toLowerCase().includes('math')) return Target;
    if (subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('physics') || subjectName.toLowerCase().includes('chemistry')) return Zap;
    if (subjectName.toLowerCase().includes('english')) return BookOpen;
    return BookOpen;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-teal-50 p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Learning Paths</h2>
            <p className="text-gray-600">
              Redesigned by class structure: quickly view every class and its subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Classes</p>
                  <p className="text-xl font-bold text-gray-900">{groupedSubjectsByClass.length}</p>
                </div>
                <GraduationCap className="h-5 w-5 text-sky-600" />
              </CardContent>
            </Card>
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Subjects In View</p>
                  <p className="text-xl font-bold text-gray-900">{filteredSubjectsWithContent.length}</p>
                </div>
                <Layers3 className="h-5 w-5 text-teal-600" />
              </CardContent>
            </Card>
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Content Items</p>
                  <p className="text-xl font-bold text-gray-900">{totalContentItemsInView}</p>
                </div>
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {!isLoadingContent && subjectsWithContent.length > 0 && (
        <Card className="border-sky-100">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="lp-class-filter" className="text-xs text-gray-500">
                  Class
                </Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="lp-class-filter" className="w-full sm:w-[200px] bg-white">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classOptionsFromData.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp-subject-filter" className="text-xs text-gray-500">
                  Subject
                </Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger id="lp-subject-filter" className="w-full sm:w-[220px] bg-white">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjectNameOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingContent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: subjects.length }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : subjectsWithContent.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
            <p className="text-gray-500">No subjects have been registered for your board yet.</p>
          </CardContent>
        </Card>
      ) : filteredSubjectsWithContent.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No matches</h3>
            <p className="text-gray-500">
              No subjects match the selected class and subject filters. Try choosing &quot;All
              classes&quot; or &quot;All subjects&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedSubjectsByClass.map(({ classKey, subjects }) => {
            const classContentCount = subjects.reduce(
              (sum, s) => sum + (s.asliPrepContent?.length || 0),
              0
            );

            return (
              <Card key={classKey} className="border-sky-100 overflow-hidden">
                <CardHeader className="bg-sky-50/60 border-b border-sky-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sky-600 text-white border-0">
                        {classKey === 'Unassigned' ? 'Unassigned' : `Class ${classKey}`}
                      </Badge>
                      <CardTitle className="text-base text-gray-900">
                        {subjects.length} subject{subjects.length === 1 ? '' : 's'}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-gray-600">
                      {classContentCount} content item{classContentCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {subjects.map((subject: any) => {
                      const Icon = getSubjectIcon(subject.name);
                      const displayName = extractPlainSubjectName(subject.name || '');
                      const primaryId = String(subject._id || subject.id);
                      const mergedIds: string[] = Array.isArray(subject.mergedSubjectIds)
                        ? subject.mergedSubjectIds.map(String)
                        : [primaryId];
                      const otherIds = mergedIds.filter((id) => id !== primaryId);
                      const viewHref =
                        otherIds.length > 0
                          ? `/admin/subject/${primaryId}?merge=${encodeURIComponent(otherIds.join(','))}`
                          : `/admin/subject/${primaryId}`;

                      return (
                        <Card
                          key={mergedIds.slice().sort().join('-')}
                          className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-full"
                        >
                          <CardContent className="p-4 h-full flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-teal-500 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                              </div>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {subject.totalContent || 0}
                              </Badge>
                            </div>

                            <p className="text-xs text-gray-600 line-clamp-2">
                              {subject.description ||
                                `Structured content for ${displayName} in ${
                                  classKey === 'Unassigned' ? 'unassigned class' : `Class ${classKey}`
                                }.`}
                            </p>

                            <div className="space-y-1.5 min-h-[52px]">
                              {subject.asliPrepContent?.slice(0, 2).map((content: any, idx: number) => (
                                <div
                                  key={content._id || idx}
                                  className="rounded-md bg-gray-50 border border-gray-100 px-2 py-1"
                                >
                                  <p className="text-xs text-gray-800 font-medium truncate">
                                    {content.title || 'Untitled'}
                                  </p>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {content.type || 'Content'}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <Button
                              className="w-full mt-auto bg-gradient-to-r from-sky-400 to-teal-500 hover:from-sky-500 hover:to-teal-600 text-white"
                              onClick={() => setLocation(viewHref)}
                            >
                              View Content
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


