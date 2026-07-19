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
  filterContentsBySchoolProgram,
  resolveIsAsliPrepExclusive,
} from '@/lib/school-program';
import {
  extractPlainSubjectName,
  isSoftDeletedSubjectName,
} from '@/lib/subject-names';
import {
  buildClassFilterOptions,
  consolidateLearningPathSubjects,
  formatClassFilterOptionLabel,
  formatClassGroupTitle,
  groupLearningPathsByClass,
  subjectMatchesClassFilter,
} from '@/lib/learning-path-admin';

function isActiveCatalogSubject(subject: {
  name?: string;
  isActive?: boolean;
}): boolean {
  if (!subject) return false;
  if (subject.isActive === false) return false;
  if (isSoftDeletedSubjectName(subject.name || '')) return false;
  return true;
}

function isActiveCatalogContent(item: {
  isActive?: boolean;
  subject?: { name?: string; isActive?: boolean } | string;
}): boolean {
  if (item?.isActive === false) return false;
  const subj = item.subject;
  if (subj != null && typeof subj === 'object') {
    if (subj.isActive === false) return false;
    if (isSoftDeletedSubjectName(subj.name || '')) return false;
  }
  return true;
}

function getContentSubjectId(content: any): string | null {
  const subj = content?.subject;
  if (subj == null) return null;
  if (typeof subj === 'object' && subj._id != null) return String(subj._id);
  if (typeof subj === 'string' && subj.trim()) return subj.trim();
  return null;
}

export default function AdminLearningPaths() {
  const [, setLocation] = useLocation();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectsWithContent, setSubjectsWithContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);

  useEffect(() => {
    const loadProgram = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setIsAsliPrepExclusive(resolveIsAsliPrepExclusive(data?.user));
        }
      } catch {
        /* ignore */
      }
    };
    void loadProgram();
  }, []);

  const classOptionsFromData = useMemo(
    () => buildClassFilterOptions(subjectsWithContent),
    [subjectsWithContent]
  );

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

  const groupedSubjectsByClass = useMemo(
    () => groupLearningPathsByClass(filteredSubjectsWithContent),
    [filteredSubjectsWithContent]
  );

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
  }, [subjects, isLoading, isAsliPrepExclusive]);

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
        setSubjects(
          subjectsArray.filter((s: { name?: string; isActive?: boolean }) =>
            isActiveCatalogSubject(s)
          )
        );
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
          allContent = filterContentsBySchoolProgram(allContent, isAsliPrepExclusive);
        }
      } catch (e) {
        console.error('Failed to fetch all asli-prep content:', e);
        allContent = [];
      }

      const bySubjectId = new Map<string, any[]>();
      for (const item of allContent) {
        if (!isActiveCatalogContent(item)) continue;
        const sid = getContentSubjectId(item);
        if (!sid) continue;
        if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
        bySubjectId.get(sid)!.push(item);
      }

      const consumedIds = new Set<string>();
      const merged: any[] = [];

      for (const subject of subjects) {
        if (!isActiveCatalogSubject(subject)) continue;
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
        const activeItems = items.filter((item) => isActiveCatalogContent(item));
        if (activeItems.length === 0) return;
        const sorted = activeItems.slice().sort((a: any, b: any) => {
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
        if (isSoftDeletedSubjectName(nameFromPopulate)) return;
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

      const consolidated = consolidateLearningPathSubjects(merged).filter(
        (row) =>
          isActiveCatalogSubject(row) &&
          (row.asliPrepContent?.length ?? 0) > 0
      );
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
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-teal-50 p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900">Learning Paths</h2>
            <p className="text-gray-600">
              Redesigned by class structure: quickly view every class and its subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Classes</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{groupedSubjectsByClass.length}</p>
                </div>
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
              </CardContent>
            </Card>
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Subjects In View</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{filteredSubjectsWithContent.length}</p>
                </div>
                <Layers3 className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
              </CardContent>
            </Card>
            <Card className="border-sky-100 shadow-none">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Content Items</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{totalContentItemsInView}</p>
                </div>
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
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
                        {formatClassFilterOptionLabel(c)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
          {Array.from({ length: subjects.length }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : subjectsWithContent.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
            <p className="text-gray-500">No subjects have been registered for your board yet.</p>
          </CardContent>
        </Card>
      ) : filteredSubjectsWithContent.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">No matches</h3>
            <p className="text-gray-500">
              No subjects match the selected class and subject filters. Try choosing &quot;All
              classes&quot; or &quot;All subjects&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedSubjectsByClass.map((group) => {
            const classContentCount = group.subjects.reduce(
              (sum, s) => sum + (s.asliPrepContent?.length || 0),
              0
            );
            const classTitle = formatClassGroupTitle(group);

            return (
              <Card key={group.classKey} className="border-sky-100 overflow-hidden">
                <CardHeader className="bg-sky-50/60 border-b border-sky-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-sky-600 text-white border-0">
                        {classTitle}
                      </Badge>
                      <CardTitle className="text-sm sm:text-base text-gray-900">
                        {group.subjects.length} subject{group.subjects.length === 1 ? '' : 's'}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-gray-600">
                      {classContentCount} content item{classContentCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {group.subjects.map((subject: any) => {
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
                                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                              </div>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {subject.totalContent || 0}
                              </Badge>
                            </div>

                            <p className="text-xs text-gray-600 line-clamp-2">
                              {subject.description ||
                                `Structured content for ${displayName} in ${classTitle}.`}
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
                                  <p className="text-mini text-gray-500 truncate">
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
                              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
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


