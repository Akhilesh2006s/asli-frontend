import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Play,
  Search,
  Video as VideoIcon,
  BookOpen,
  Radio,
  Eye,
  Users,
  Calendar,
} from 'lucide-react';
import Navigation from '@/components/navigation';
import { API_BASE_URL } from '@/lib/api-config';
import { EduOTTVideoCard, EduOTTSubjectBadges } from '@/components/eduott/EduOTTVideoCard';
import type { EduOTTVideoCardItem } from '@/components/eduott/EduOTTVideoCard';
import { EduOTTVideoPlayerDialog } from '@/components/eduott/EduOTTVideoPlayerDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  extractPlainSubjectName,
  getSubjectClassLabel,
} from '@/lib/subject-names';
import { normalizeVideoLike, normalizeSessionLike } from '@/lib/eduott-normalize';
import { resolveContentDurationSeconds } from '@/lib/eduott-video-utils';
import { useEduOTTFilters } from '@/contexts/edu-ott-filter-context';
import { EduOTTGlobalFilterBar } from '@/components/eduott/EduOTTGlobalFilterBar';
import VidyaAIFloatingAssistant from '@/components/student/VidyaAIFloatingAssistant';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  durationSeconds?: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  views: number;
  createdAt: string;
  subjectId?: string;
  subjectName?: string;
  classNumber?: string;
  fileUrl?: string;
  id?: string;
  /** Normalized class number / label for filters & binding */
  class: string;
  /** Plain subject name for filters & binding */
  subject: string;
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
  board?: string;
  classNumber?: string;
  viewerCount: number;
  createdAt: string;
  /** Normalized class label for filters & UI */
  class: string;
  /** Plain subject name (binding); replaces populated subject from API */
  subject: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function mapContentToVideo(content: any): Video {
  const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
  const subjectId = content.subject?._id || content.subject;
  const classNum =
    content.classNumber != null && String(content.classNumber).trim() !== ''
      ? String(content.classNumber).trim()
      : content.subject?.classNumber != null &&
          String(content.subject.classNumber).trim() !== ''
        ? String(content.subject.classNumber).trim()
        : undefined;

  const durationInSeconds = resolveContentDurationSeconds({
    duration: content.duration,
    durationSeconds: content.durationSeconds,
  });

  let videoFileUrl = content.fileUrl;
  if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
    if (videoFileUrl.startsWith('/')) {
      videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
    } else {
      videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
    }
  }

  const norm = normalizeVideoLike({ subjectName, classNumber: classNum });

  return {
    _id: content._id,
    id: content._id,
    title: content.title || 'Untitled Video',
    description: content.description || '',
    videoUrl: videoFileUrl,
    fileUrl: videoFileUrl,
    thumbnailUrl: content.thumbnailUrl,
    duration: durationInSeconds,
    durationSeconds: durationInSeconds,
    views: content.views || 0,
    createdAt: content.createdAt,
    subjectId,
    subjectName,
    classNumber: classNum,
    class: norm.class,
    subject: norm.subject,
    isYouTubeVideo: !!(
      content.fileUrl &&
      (content.fileUrl.includes('youtube.com') || content.fileUrl.includes('youtu.be'))
    ),
    youtubeUrl:
      content.fileUrl &&
      (content.fileUrl.includes('youtube.com') || content.fileUrl.includes('youtu.be'))
        ? content.fileUrl
        : undefined,
  };
}

function mapStreamToSession(s: any): LiveSession {
  const norm = normalizeSessionLike({
    subject: s.subject,
    classNumber: s.classNumber,
  });
  return {
    ...s,
    class: norm.class,
    subject: norm.subject,
  };
}

function buildVideosUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams({ type: 'Video' });
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  return `${API_BASE_URL}/api/student/asli-prep-content?${params.toString()}`;
}

function buildStreamsUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams();
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  const q = params.toString();
  return `${API_BASE_URL}/api/student/streams${q ? `?${q}` : ''}`;
}

export default function EduOTT() {
  const isMobile = useIsMobile();
  const {
    selectedClass,
    selectedSubject,
    listEpoch,
  } = useEduOTTFilters();

  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [videoCatalog, setVideoCatalog] = useState<Video[]>([]);
  const [sessionCatalog, setSessionCatalog] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isRefreshingVideos, setIsRefreshingVideos] = useState(false);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const [hasLoadedVideos, setHasLoadedVideos] = useState(false);
  const [hasLoadedSessions, setHasLoadedSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<EduOTTVideoCardItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  /** Unfiltered catalog for global class/subject dropdown options */
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const [vRes, sRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/student/streams`, { headers: authHeaders() }),
        ]);

        if (cancelled) return;

        if (vRes.ok) {
          const data = await vRes.json();
          const list = data.data || data || [];
          setVideoCatalog(list.map(mapContentToVideo));
        } else {
          setVideoCatalog([]);
        }

        if (sRes.ok) {
          const data = await sRes.json();
          const list = data.data || data || [];
          setSessionCatalog(list.map(mapStreamToSession));
        } else {
          setSessionCatalog([]);
        }
      } catch {
        if (!cancelled) {
          setVideoCatalog([]);
          setSessionCatalog([]);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'videos') {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchVideos() {
      try {
        if (!hasLoadedVideos) {
          setLoading(true);
        } else {
          setIsRefreshingVideos(true);
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          buildVideosUrl(selectedClass, selectedSubject),
          { headers: authHeaders() }
        );

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const videosList = data.data || data || [];
          setVideos(videosList.map(mapContentToVideo));
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshingVideos(false);
          setHasLoadedVideos(true);
        }
      }
    }

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedClass, selectedSubject, listEpoch]);

  useEffect(() => {
    if (activeTab !== 'live-sessions') {
      setLoadingSessions(false);
      return;
    }
    let cancelled = false;

    async function fetchLiveSessions() {
      try {
        if (!hasLoadedSessions) {
          setLoadingSessions(true);
        } else {
          setIsRefreshingSessions(true);
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
          setLoadingSessions(false);
          return;
        }

        const response = await fetch(
          buildStreamsUrl(selectedClass, selectedSubject),
          { headers: authHeaders() }
        );

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const sessionsList = data.data || data || [];
          setLiveSessions(sessionsList.map(mapStreamToSession));
        } else {
          setLiveSessions([]);
        }
      } catch (error) {
        console.error('Failed to fetch live sessions:', error);
        if (!cancelled) setLiveSessions([]);
      } finally {
        if (!cancelled) {
          setLoadingSessions(false);
          setIsRefreshingSessions(false);
          setHasLoadedSessions(true);
        }
      }
    }

    fetchLiveSessions();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedClass, selectedSubject, listEpoch]);

  const globalClassOptions = useMemo(() => {
    const set = new Set<string>();
    videoCatalog.forEach((v) => {
      if (v.class) set.add(v.class);
    });
    sessionCatalog.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [videoCatalog, sessionCatalog]);

  const globalSubjectOptions = useMemo(() => {
    const names = new Set<string>();
    videoCatalog.forEach((v) => {
      if (selectedClass && v.class !== selectedClass) return;
      if (v.subject) names.add(v.subject);
    });
    sessionCatalog.forEach((s) => {
      if (selectedClass && s.class !== selectedClass) return;
      if (s.subject) names.add(s.subject);
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [videoCatalog, sessionCatalog, selectedClass]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [videos, searchTerm]);

  const filteredSessions = useMemo(() => {
    return liveSessions.filter((session) => {
      const matchesSearch =
        session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        (session.description || '').toLowerCase().includes(sessionSearchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [liveSessions, sessionSearchTerm, filterStatus]);

  const hasGlobalFilters = selectedClass != null || selectedSubject != null;

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

  return (
    <>
      <Navigation />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 bg-white min-h-screen relative">
        {!isMobile && <VidyaAIFloatingAssistant />}

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">EduOTT</h1>
              <p className="text-gray-600">
                Educational videos and live sessions from all your subjects
              </p>
            </div>
          </div>
        </div>

        <EduOTTGlobalFilterBar
          classOptions={globalClassOptions}
          subjectOptions={globalSubjectOptions}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4 lg:space-y-6 mt-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="live-sessions">Live Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-0 pl-10 sm:pl-11 w-full max-w-xl"
              />
            </div>

            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {filteredVideos.length} of {videos.length} videos
              </p>
              {isRefreshingVideos ? (
                <p className="text-xs font-medium text-sky-700">Updating list...</p>
              ) : null}
            </div>

            <div className="min-h-[420px]">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
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
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
                  {videos.length === 0 ? 'No Videos Available' : 'No Videos Found'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {videos.length === 0
                    ? 'No videos have been assigned to your subjects yet.'
                    : hasGlobalFilters || searchTerm
                      ? 'No content available for the selected filters. Try clearing filters or adjusting your search.'
                      : 'Try adjusting your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
                {filteredVideos.map((video) => {
                  const videoId = video._id || video.id || '';
                  return (
                    <EduOTTVideoCard
                      key={videoId}
                      video={video}
                      onPlay={() => setSelectedVideo(video)}
                      subjectBadges={
                        video.subjectName ? (
                          <EduOTTSubjectBadges
                            subjectLabel={
                              video.subject || extractPlainSubjectName(video.subjectName)
                            }
                            classLabel={
                              video.class ||
                              getSubjectClassLabel({
                                name: video.subjectName,
                                classNumber: video.classNumber,
                              }) ||
                              undefined
                            }
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="live-sessions" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
              <div className="flex-1 min-w-0 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  type="text"
                  placeholder="Search live sessions..."
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  className="px-0 pl-10 sm:pl-11 w-full"
                />
              </div>
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-xs text-gray-500">Status</Label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'scheduled', 'live', 'ended', 'cancelled'].map((status) => {
                    const isActive = filterStatus === status;
                    const label =
                      status === 'all'
                        ? 'All'
                        : status.charAt(0).toUpperCase() + status.slice(1);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isActive
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-h-[320px]">
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
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
                  {liveSessions.length === 0
                    ? 'No Live Sessions Available'
                    : 'No Live Sessions Found'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {liveSessions.length === 0
                    ? 'No live sessions have been scheduled for your subjects yet.'
                    : hasGlobalFilters || sessionSearchTerm || filterStatus !== 'all'
                      ? 'No content available for the selected filters. Try clearing filters or adjusting search/status.'
                      : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session._id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-3 sm:p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{session.title}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status.toUpperCase()}
                            </Badge>
                          </div>
                          {session.description && (
                            <p className="text-gray-600 mb-4">{session.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>
                                {session.streamer?.fullName || session.streamer?.email || 'Unknown'}
                              </span>
                            </div>
                            {session.subject ? (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{session.subject}</span>
                              </div>
                            ) : null}
                            {session.class ? (
                              <Badge variant="outline">Class {session.class}</Badge>
                            ) : null}
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{session.viewerCount || 0} viewers</span>
                            </div>
                            {(session.scheduledTime || session.scheduledStartTime) && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>
                                  {new Date(
                                    session.scheduledTime || session.scheduledStartTime || ''
                                  ).toLocaleString()}
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
                            <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Watch Live
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EduOTTVideoPlayerDialog
        video={selectedVideo}
        open={!!selectedVideo}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null);
        }}
      />
    </>
  );
}
