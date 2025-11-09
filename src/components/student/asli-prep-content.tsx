import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, FileText, File, Image, Video, Download, Search, Filter, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio';
  subject: {
    _id: string;
    name: string;
  };
  topic?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  views?: number;
  downloadCount?: number;
  createdAt: string;
}

export default function AsliPrepContent() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: 'all',
    type: 'all',
    topic: ''
  });
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchContents();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      // Get student's board first
      const token = localStorage.getItem('authToken');
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const board = userData.user?.board;
        
        if (board) {
          const subjectsResponse = await fetch(`${API_BASE_URL}/api/super-admin/boards/${board}/subjects`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (subjectsResponse.ok) {
            const data = await subjectsResponse.json();
            if (data.success) {
              setSubjects(data.data || []);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams();
      if (filters.subject && filters.subject !== 'all') queryParams.append('subject', filters.subject);
      if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);
      if (filters.topic && filters.topic.trim()) queryParams.append('topic', filters.topic.trim());

      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContents(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [filters.subject, filters.type, filters.topic]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return <Video className="h-5 w-5" />;
      case 'TextBook': return <BookOpen className="h-5 w-5" />;
      case 'Workbook': return <FileText className="h-5 w-5" />;
      case 'Material': return <File className="h-5 w-5" />;
      case 'Audio': return <File className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Video': return 'bg-red-100 text-red-700';
      case 'TextBook': return 'bg-blue-100 text-blue-700';
      case 'Workbook': return 'bg-purple-100 text-purple-700';
      case 'Material': return 'bg-green-100 text-green-700';
      case 'Audio': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Asli Learn content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Asli Learn Exclusive
            </h2>
          </div>
          <p className="text-gray-600 mt-1 ml-[52px]">Premium study materials curated by Super Admin</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filter Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Subject</Label>
              <Select
                value={filters.subject || 'all'}
                onValueChange={(value) => setFilters({ ...filters, subject: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="TextBook">TextBook</SelectItem>
                  <SelectItem value="Workbook">Workbook</SelectItem>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic</Label>
              <Input
                placeholder="Search by topic..."
                value={filters.topic}
                onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {contents.length === 0 ? (
        <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Content Available Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Exclusive premium content will appear here once uploaded by Super Admin for your board.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content, index) => (
            <Card 
              key={content._id} 
              className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-purple-200 bg-gradient-to-br from-white to-purple-50/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg flex-1 font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                    {content.title}
                  </CardTitle>
                  <Badge className={`${getTypeColor(content.type)} border-2 border-white shadow-sm`}>
                    <span className="flex items-center">
                      {getTypeIcon(content.type)}
                      <span className="ml-1 capitalize font-semibold">{content.type}</span>
                    </span>
                  </Badge>
                </div>
                {content.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{content.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subject:</span>
                    <Badge variant="outline">{content.subject?.name || 'N/A'}</Badge>
                  </div>
                  {content.topic && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Topic:</span>
                      <span>{content.topic}</span>
                    </div>
                  )}
                  {(content.type === 'Video' || content.type === 'Audio') && content.duration && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span>{formatDuration(content.duration)}</span>
                    </div>
                  )}
                  {(content.type === 'TextBook' || content.type === 'Workbook' || content.type === 'Material') && content.size && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Size:</span>
                      <span>{formatFileSize(content.size)}</span>
                    </div>
                  )}
                  {(content.views !== undefined || content.downloadCount !== undefined) && (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {content.views !== undefined && `${content.views} views`}
                        {content.downloadCount !== undefined && ` • ${content.downloadCount} downloads`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-6">
                  {content.type === 'Video' ? (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => window.open(content.fileUrl, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Watch Video
                    </Button>
                  ) : content.type === 'Audio' ? (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => window.open(content.fileUrl, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Audio
                    </Button>
                  ) : (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => window.open(content.fileUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {content.type === 'TextBook' ? 'View TextBook' : content.type === 'Workbook' ? 'View Workbook' : 'Download Material'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

