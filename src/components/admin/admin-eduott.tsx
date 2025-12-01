import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Play, 
  Clock, 
  Search,
  Filter,
  Video as VideoIcon,
  BookOpen,
  Radio,
  Eye,
  Users,
  Calendar
} from 'lucide-react';
import VideoModal from '@/components/video-modal';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  views: number;
  createdAt: string;
  subjectId?: string;
  subjectName?: string;
}

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  streamer: {
    _id: string;
    fullName: string;
    email: string;
  };
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  hlsUrl?: string;
  scheduledTime?: string;
  scheduledStartTime?: string;
  subject?: {
    _id: string;
    name: string;
  };
  board?: string;
  classNumber?: string;
  viewerCount: number;
  createdAt: string;
}

interface Subject {
  _id: string;
  name: string;
}

export default function AdminEduOTT() {
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data) ? data : (data.data || data.subjects || []);
          setSubjects(subjectsList);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/asli-prep-content?type=Video`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          
          const videosWithSubjects = videosList.map((content: any) => {
            const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
            const subjectId = content.subject?._id || content.subject;
            
            const rawDuration = content.duration;
            const durationInMinutes = rawDuration && rawDuration > 0 
              ? Number(rawDuration) 
              : 0;
            const durationInSeconds = durationInMinutes > 0 ? durationInMinutes * 60 : 0;
            
            let videoFileUrl = content.fileUrl;
            if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
              if (videoFileUrl.startsWith('/')) {
                videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
              } else {
                videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
              }
            }
            
            return {
              _id: content._id,
              title: content.title || 'Untitled Video',
              description: content.description || '',
              duration: durationInMinutes,
              durationSeconds: durationInSeconds,
              videoUrl: videoFileUrl,
              youtubeUrl: content.youtubeUrl || '',
              isYouTubeVideo: !!content.youtubeUrl,
              thumbnailUrl: content.thumbnailUrl || '',
              views: content.views || 0,
              createdAt: content.createdAt || content.date || new Date().toISOString(),
              subjectId: subjectId,
              subjectName: subjectName
            };
          });

          setVideos(videosWithSubjects);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [activeTab]);

  // Fetch live sessions
  useEffect(() => {
    const fetchLiveSessions = async () => {
      try {
        setLoadingSessions(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoadingSessions(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/streams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const sessionsList = data.data || data || [];
          setLiveSessions(sessionsList);
        }
      } catch (error) {
        console.error('Failed to fetch live sessions:', error);
        setLiveSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    if (activeTab === 'live-sessions') {
      fetchLiveSessions();
    }
  }, [activeTab]);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || video.subjectId === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredSessions = liveSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'ended':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return '0 mins';
    if (minutes < 60) return `${Math.round(minutes)} mins`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-teal-500 rounded-lg flex items-center justify-center">
            <VideoIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">EduOTT</h2>
            <p className="text-gray-600">Educational content and live sessions</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="live-sessions">Live Sessions</TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6 mt-6">
            {/* Search and Filter */}
            <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by subject" />
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

            {/* Videos Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Videos Found</h3>
                  <p className="text-gray-500">No videos match your search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Card
                    key={video._id}
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden"
                    onClick={() => {
                      setSelectedVideo(video);
                      setIsVideoModalOpen(true);
                    }}
                  >
                    <div className="relative aspect-video bg-gray-900 overflow-hidden">
                      {video.isYouTubeVideo && video.youtubeUrl ? (
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeUrl.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeUrl.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`;
                          }}
                        />
                      ) : video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-teal-500">
                          <VideoIcon className="w-16 h-16 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-sky-600 ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-black/70 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(video.duration)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                      {video.subjectName && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {video.subjectName}
                        </Badge>
                      )}
                      {video.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Live Sessions Tab */}
          <TabsContent value="live-sessions" className="space-y-6 mt-6">
            {/* Search and Filter */}
            <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search live sessions..."
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live Sessions List */}
            {loadingSessions ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Live Sessions Found</h3>
                  <p className="text-gray-500">No live sessions match your search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session._id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status.toUpperCase()}
                            </Badge>
                          </div>
                          {session.description && (
                            <p className="text-gray-600 mb-4">{session.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{session.streamer?.fullName || session.streamer?.email || 'Unknown'}</span>
                            </div>
                            {session.subject?.name && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                <span>{session.subject.name}</span>
                              </div>
                            )}
                            {session.classNumber && (
                              <Badge variant="outline">Class {session.classNumber}</Badge>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{session.viewerCount || 0} viewers</span>
                            </div>
                            {(session.scheduledTime || session.scheduledStartTime) && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(session.scheduledTime || session.scheduledStartTime || '').toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {session.status === 'live' && session.hlsUrl && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              window.open(session.hlsUrl, '_blank');
                            }}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Watch Live
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Modal */}
      <VideoModal
        video={selectedVideo ? {
          id: selectedVideo._id,
          title: selectedVideo.title,
          description: selectedVideo.description || '',
          duration: selectedVideo.duration,
          videoUrl: selectedVideo.videoUrl || '',
          youtubeUrl: selectedVideo.youtubeUrl || '',
          isYouTubeVideo: selectedVideo.isYouTubeVideo || false,
          thumbnailUrl: selectedVideo.thumbnailUrl || ''
        } : null}
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setSelectedVideo(null);
        }}
      />
    </div>
  );
}

