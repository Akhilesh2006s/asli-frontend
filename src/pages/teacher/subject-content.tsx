import { useState, useEffect, useRef, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  Filter,
  Play,
  Video,
  X,
} from 'lucide-react';
import CalendarView from '@/components/student/calendar-view';
import { API_BASE_URL } from '@/lib/api-config';

interface ContentItem {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework';
  fileUrl: string;
  date: string;
  createdAt: string;
  deadline?: string;
}

interface Subject {
  _id: string;
  name: string;
  description?: string;
}

export default function TeacherSubjectContent() {
  const [, params] = useRoute('/teacher/subject/:id');
  const [, setLocation] = useLocation();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!params?.id) return;
    void fetchSubjectContent(params.id);
  }, [params?.id]);

  const fetchSubjectContent = async (subjectId: string) => {
    const fetchId = ++fetchGenRef.current;
    try {
      setLoading(true);
      setLoadingContents(true);
      const token = localStorage.getItem('authToken');

      const subjectResponse = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (fetchId !== fetchGenRef.current) return;

      if (subjectResponse.ok) {
        const contentType = subjectResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const subjectData = await subjectResponse.json();
          setSubject(subjectData.subject || { _id: subjectId, name: subjectData.name || 'Subject' });
        } else {
          setSubject({ _id: subjectId, name: 'Subject' });
        }
      } else {
        setSubject({ _id: subjectId, name: 'Subject' });
      }

      const contentsResponse = await fetch(
        `${API_BASE_URL}/api/teacher/asli-prep-content?subject=${encodeURIComponent(subjectId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (fetchId !== fetchGenRef.current) return;

      if (contentsResponse.ok) {
        const contentType = contentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const contentsData = await contentsResponse.json();
          const contentsList = contentsData.data || contentsData || [];
          setContents(Array.isArray(contentsList) ? contentsList : []);
        } else {
          setContents([]);
        }
      } else {
        setContents([]);
      }
    } catch (error) {
      console.error('Failed to fetch subject content:', error);
      if (fetchId === fetchGenRef.current) {
        setSubject({ _id: params?.id || '', name: 'Subject' });
        setContents([]);
      }
    } finally {
      if (fetchId === fetchGenRef.current) {
        setLoadingContents(false);
        setLoading(false);
      }
    }
  };

  const contentStats = useMemo(() => {
    const videoCount = contents.filter((c) => c.type === 'Video').length;
    const homeworkCount = contents.filter((c) => c.type === 'Homework').length;
    const otherCount = contents.length - videoCount - homeworkCount;
    return { videoCount, homeworkCount, otherCount, total: contents.length };
  }, [contents]);

  const filteredContents = useMemo(() => {
    if (!selectedContentType) return contents;
    return contents.filter((c) => c.type === selectedContentType);
  }, [contents, selectedContentType]);

  const uniqueContentTypes = useMemo(
    () => Array.from(new Set(contents.map((c) => c.type))).sort(),
    [contents],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading subject content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Back link */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation('/teacher/dashboard')}
            className="bg-white/90 backdrop-blur-sm border-blue-200 text-blue-700 shadow-sm hover:bg-blue-50 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Blue header — matches student learning path */}
        <div className="mb-8">
          <div className="gradient-primary rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-7 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-1 uppercase tracking-wide">
                    {subject?.name || 'Subject'}
                  </h1>
                  {subject?.description && (
                    <p className="text-blue-100 text-sm sm:text-base">{subject.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-6">
                <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                  {contentStats.total} items
                </Badge>
                <div className="flex items-center space-x-1 text-blue-100 text-sm">
                  <Video className="w-4 h-4" />
                  <span>{contentStats.videoCount} videos</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-100 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>{contentStats.otherCount + contentStats.homeworkCount} resources</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-100 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Super Admin catalog</span>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-100">Content loaded</span>
                  <span className="text-sm font-medium text-white">
                    {loadingContents ? '…' : contentStats.total > 0 ? '100%' : '0%'}
                  </span>
                </div>
                <Progress
                  value={loadingContents ? 0 : contentStats.total > 0 ? 100 : 0}
                  className="h-2 bg-white/20 [&>div]:bg-white"
                />
              </div>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M47.1,-78.5C58.9,-69.2,64.3,-50.4,73.2,-32.8C82.1,-15.1,94.5,1.4,94.4,17.9C94.3,34.4,81.7,50.9,66.3,63.2C50.9,75.5,32.7,83.6,13.8,87.1C-5.1,90.6,-24.7,89.5,-41.6,82.1C-58.5,74.7,-72.7,61,-79.8,44.8C-86.9,28.6,-86.9,9.9,-83.2,-6.8C-79.5,-23.5,-72.1,-38.2,-61.3,-49.6C-50.5,-61,-36.3,-69.1,-21.4,-75.8C-6.5,-82.5,9.1,-87.8,25.2,-84.9C41.3,-82,57.9,-70,47.1,-78.5Z"
                  transform="translate(100 100)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Learning Calendar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Learning Calendar</h2>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Content organized by upload date
              </p>
            </div>

            {contents.length > 0 && (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2 bg-white">
                      <Filter className="w-4 h-4" />
                      <span>
                        {selectedContentType ? `Filter: ${selectedContentType}` : 'Filter by Type'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setSelectedContentType(null)}
                      className={!selectedContentType ? 'bg-blue-50' : ''}
                    >
                      All Types ({contents.length})
                    </DropdownMenuItem>
                    {uniqueContentTypes.map((type) => {
                      const count = contents.filter((c) => c.type === type).length;
                      return (
                        <DropdownMenuItem
                          key={type}
                          onClick={() => setSelectedContentType(type)}
                          className={selectedContentType === type ? 'bg-blue-50' : ''}
                        >
                          {type} ({count})
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedContentType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContentType(null)}
                    className="flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {loadingContents ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading content...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No content available</h3>
              <p className="text-gray-500 text-sm">
                {selectedContentType
                  ? `No ${selectedContentType} items for this subject yet.`
                  : 'Content will appear here once it is added to your assigned subjects.'}
              </p>
            </div>
          ) : (
            <CalendarView
              contents={filteredContents}
              isLoading={loadingContents}
              onMarkAsDone={undefined}
              completedItems={[]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
