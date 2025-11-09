import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Play, 
  FileText, 
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  Video
} from 'lucide-react';
import { useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';

export default function AdminLearningPaths() {
  const [, setLocation] = useLocation();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectsWithContent, setSubjectsWithContent] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (subjects.length > 0) {
      fetchSubjectsWithContent();
    }
  }, [subjects]);

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

      // Fetch content for each subject
      const subjectsWithContentResults = await Promise.allSettled(
        subjects.map(async (subject: any) => {
          try {
            const subjectId = subject._id || subject.id;
            
            // Fetch Asli Prep content for this subject
            let asliPrepContent = [];
            try {
              const contentResponse = await fetch(`${API_BASE_URL}/api/admin/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              });
              
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                asliPrepContent = contentData.data || contentData || [];
                if (!Array.isArray(asliPrepContent)) asliPrepContent = [];
              }
            } catch (contentError) {
              console.error('Error fetching content for subject:', subjectId, contentError);
              asliPrepContent = [];
            }

            return {
              _id: subject._id || subject.id,
              id: subject._id || subject.id,
              name: subject.name || 'Unknown Subject',
              description: subject.description || '',
              board: subject.board || '',
              asliPrepContent: asliPrepContent,
              totalContent: asliPrepContent.length
            };
          } catch (error) {
            console.error('Error processing subject:', subject, error);
            return null;
          }
        })
      );

      // Filter out failed results
      const validSubjects = subjectsWithContentResults
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      setSubjectsWithContent(validSubjects);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Learning Paths</h2>
          <p className="text-gray-600 mt-1">View content uploaded for each subject in your board</p>
        </div>
      </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectsWithContent.map((subject: any) => {
            const Icon = getSubjectIcon(subject.name);
            
            return (
              <Card key={subject._id || subject.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {subject.totalContent || 0} items
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{subject.name}</CardTitle>
                  <p className="text-gray-600 text-sm mt-2">{subject.description || `Content for ${subject.name}`}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Content Stats */}
                  <div className="grid grid-cols-1 gap-2 text-center">
                    <div className="bg-orange-50 rounded-lg p-2">
                      <BarChart3 className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                      <p className="text-xs font-medium text-orange-800">{subject.asliPrepContent?.length || 0}</p>
                      <p className="text-xs text-orange-600">Content Items</p>
                    </div>
                  </div>

                  {/* Recent Content Preview */}
                  {subject.asliPrepContent?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Recent Content:</p>
                      <div className="space-y-1">
                        {subject.asliPrepContent.slice(0, 2).map((content: any, idx: number) => (
                          <div key={content._id || idx} className="bg-gray-50 rounded-lg p-2 text-xs">
                            <p className="text-gray-900 font-medium truncate">{content.title || 'Untitled'}</p>
                            <p className="text-gray-600 text-xs">Type: {content.type || 'Unknown'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    onClick={() => setLocation(`/admin/subject/${subject._id || subject.id}`)}
                  >
                    View Content
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


