import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  ArrowLeft,
  FileText, 
  Filter,
  X
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

export default function AdminSubjectContent() {
  const [, params] = useRoute('/admin/subject/:id');
  const [, setLocation] = useLocation();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchSubjectContent(params.id);
    }
  }, [params?.id]);

  const fetchSubjectContent = async (subjectId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      // Fetch subject info
      const subjectResponse = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (subjectResponse.ok) {
        const contentType = subjectResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const subjectData = await subjectResponse.json();
          setSubject(subjectData.subject || { _id: subjectId, name: subjectData.name || 'Subject' });
        } else {
          // Fallback
          setSubject({ _id: subjectId, name: 'Subject' });
        }
      } else {
        setSubject({ _id: subjectId, name: 'Subject' });
      }

      // Fetch Asli Prep content - use admin endpoint
      setLoadingContents(true);
      const contentsResponse = await fetch(`${API_BASE_URL}/api/admin/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (contentsResponse.ok) {
        const contentType = contentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const contentsData = await contentsResponse.json();
          const contentsList = contentsData.data || contentsData || [];
          setContents(contentsList);
        }
      } else {
        setContents([]);
      }
      setLoadingContents(false);

    } catch (error) {
      console.error('Failed to fetch subject content:', error);
      setSubject({ _id: params?.id || '', name: 'Subject' });
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeOptions = () => {
    const types = new Set(contents.map(c => c.type));
    return Array.from(types);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading subject content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{subject?.name || 'Subject'}</h1>
              {subject?.description && (
                <p className="text-gray-600 mt-2">{subject.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <Card className="bg-white/80 backdrop-blur-xl shadow-xl border border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Content Calendar</CardTitle>
              {getContentTypeOptions().length > 0 && (
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedContentType || ''}
                    onChange={(e) => setSelectedContentType(e.target.value || null)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Content Types</option>
                    {getContentTypeOptions().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
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
          </CardHeader>
          <CardContent>
            {loadingContents ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading content...</p>
              </div>
            ) : (
              <CalendarView 
                contents={selectedContentType 
                  ? contents.filter(c => c.type === selectedContentType)
                  : contents}
                onMarkAsDone={undefined}
                completedItems={[]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


