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
import Navigation from '@/components/navigation';
import VideoModal from '@/components/video-modal';
import { API_BASE_URL } from '@/lib/api-config';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface Subject {
  _id: string;
  name: string;
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
  playbackUrl?: string;
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

export default function EduOTT() {
  const isMobile = useIsMobile();
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

  // Fetch subjects assigned to student
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const subjectsList = data.subjects || data.data || [];
          setSubjects(subjectsList);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch videos from Content model (filtered by class assigned subjects and type=Video)
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        // Don't fetch if student has no assigned subjects
        if (!subjects || subjects.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }

        // Fetch video content from Content model (filtered by student's class assigned subjects and type=Video)
        const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          
          console.log('📹 Fetched videos from database for student:', videosList.length, 'videos');
          if (videosList.length > 0) {
            console.log('📹 Sample video from database:', {
              _id: videosList[0]._id,
              title: videosList[0].title,
              fileUrl: videosList[0].fileUrl,
              subject: videosList[0].subject
            });
          }
          
          // Map Content model data to match UI expectations
          const videosWithSubjects = videosList.map((content: any) => {
            // Content model has subject populated with { _id, name }
            const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
            const subjectId = content.subject?._id || content.subject;
            
            // Handle duration - Content model stores duration in minutes
            const rawDuration = content.duration;
            const durationInMinutes = rawDuration && rawDuration > 0 
              ? Number(rawDuration) 
              : 0;
            const durationInSeconds = durationInMinutes > 0 ? durationInMinutes * 60 : 0;
            
            // Ensure fileUrl is properly formatted (handle relative/absolute URLs from database)
            let videoFileUrl = content.fileUrl;
            if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
              // If it's a relative URL, prepend API base URL
              if (videoFileUrl.startsWith('/')) {
                videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
              } else {
                videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
              }
            }
            
            return {
              _id: content._id,
              id: content._id,
              title: content.title || 'Untitled Video',
              description: content.description || '',
              videoUrl: videoFileUrl, // Use properly formatted fileUrl from database
              fileUrl: videoFileUrl,
              thumbnailUrl: content.thumbnailUrl, // Thumbnail from database
              duration: durationInSeconds, // Convert to seconds for display
              views: content.views || 0,
              createdAt: content.createdAt,
              subjectId: subjectId,
              subjectName: subjectName,
              // Check if it's a YouTube URL
              isYouTubeVideo: content.fileUrl && (
                content.fileUrl.includes('youtube.com') || 
                content.fileUrl.includes('youtu.be')
              ),
              youtubeUrl: (content.fileUrl && (
                content.fileUrl.includes('youtube.com') || 
                content.fileUrl.includes('youtu.be')
              )) ? content.fileUrl : undefined
            };
          });
          
          setVideos(videosWithSubjects);
        } else {
          console.error('Failed to fetch videos:', response.status);
          setVideos([]);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    if (subjects.length > 0 && activeTab === 'videos') {
      fetchVideos();
    } else {
      setLoading(false);
    }
  }, [subjects, activeTab]);

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

        const response = await fetch(`${API_BASE_URL}/api/student/streams`, {
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

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Filter videos based on search and subject filter
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || 
                          video.subjectId === selectedSubject ||
                          video.subjectName === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Filter live sessions
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

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Extract YouTube video ID for thumbnail
  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <>
      <Navigation />
      <div className="w-full px-2 sm:px-4 lg:px-6 pt-24 pb-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen relative">
        <div className="max-w-7xl mx-auto">
          
          {/* Robot GIF - Fixed at Bottom Left */}
          {!isMobile && (
            <div className="fixed bottom-8 left-4 z-30 pointer-events-none">
              <img 
                src="/ROBOT.gif" 
                alt="Robot" 
                className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          )}
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <VideoIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">EduOTT</h1>
                <p className="text-gray-600">Educational videos and live sessions from all your subjects</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="live-sessions">Live Sessions</TabsTrigger>
            </TabsList>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-6">
              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search videos by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                {/* Subject Filter */}
                <div className="md:w-64">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject._id || subject.name} value={subject._id || subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Showing {filteredVideos.length} of {videos.length} videos
                </p>
              </div>

              {/* Videos Grid */}
              {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16">
              <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {videos.length === 0 ? 'No Videos Available' : 'No Videos Found'}
              </h3>
              <p className="text-gray-500">
                {videos.length === 0 
                  ? 'No videos have been assigned to your subjects yet.' 
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card 
                  key={video._id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                  onClick={() => handleVideoClick(video)}
                >
                  {/* Video Thumbnail */}
                  <div className="relative">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : video.isYouTubeVideo && video.youtubeUrl ? (
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(video.youtubeUrl)}/maxresdefault.jpg`}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                        <Play className="w-16 h-16 text-white" fill="currentColor" />
                      </div>
                    )}
                    
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duration || 0)}
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                        {video.title}
                      </CardTitle>
                    </div>
                    {video.subjectName && (
                      <Badge variant="outline" className="mt-2 w-fit">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {video.subjectName}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent>
                    {video.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <VideoIcon className="w-3 h-3" />
                        {video.views || 0} views
                      </span>
                      {video.createdAt && (
                        <span>
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </TabsContent>

            {/* Live Sessions Tab */}
            <TabsContent value="live-sessions" className="space-y-6">
              {/* Search and Filter Section */}
              <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search live sessions..."
                    value={sessionSearchTerm}
                    onChange={(e) => setSessionSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>

                {/* Status Filter */}
                <div className="md:w-64">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full">
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
              </div>

              {/* Live Sessions List */}
              {loadingSessions ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="w-full h-32" />
                    </Card>
                  ))}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-16">
                  <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {liveSessions.length === 0 ? 'No Live Sessions Available' : 'No Live Sessions Found'}
                  </h3>
                  <p className="text-gray-500">
                    {liveSessions.length === 0 
                      ? 'No live sessions have been scheduled for your subjects yet.' 
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                </div>
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
                          {session.status === 'live' && (session.hlsUrl || session.playbackUrl) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                const streamUrl = session.hlsUrl || session.playbackUrl;
                                if (streamUrl) {
                                  window.open(streamUrl, '_blank');
                                }
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
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo ? {
          id: selectedVideo._id || selectedVideo.id,
          title: selectedVideo.title || '',
          description: selectedVideo.description || '',
          duration: selectedVideo.duration && selectedVideo.duration > 0 
            ? Math.round(selectedVideo.duration / 60) 
            : 0, // Convert from seconds to minutes
          subject: selectedVideo.subjectName || 'Unknown Subject',
          videoUrl: selectedVideo.videoUrl || selectedVideo.fileUrl,
          youtubeUrl: selectedVideo.youtubeUrl || (selectedVideo.isYouTubeVideo ? (selectedVideo.videoUrl || selectedVideo.fileUrl) : undefined),
          isYouTubeVideo: selectedVideo.isYouTubeVideo || false
        } : null}
      />
    </>
  );
}

