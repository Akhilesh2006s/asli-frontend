import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
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
import StudentShell from "@/components/layout/StudentShell";
import TeacherShell from "@/components/layout/TeacherShell";
import { API_BASE_URL } from '@/lib/api-config';
import { getUser } from '@/lib/auth-utils';
import { EduOTTVideoCard, EduOTTSubjectBadges } from '@/components/eduott/EduOTTVideoCard';
import type { EduOTTVideoCardItem } from '@/components/eduott/EduOTTVideoCard';
import { EduOTTVideoPlayerDialog } from '@/components/eduott/EduOTTVideoPlayerDialog';
import { EduOTTLiveSessionDialog } from '@/components/eduott/EduOTTLiveSessionDialog';
import { EduOTTJoinSessionButton } from '@/components/eduott/EduOTTJoinSessionButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  extractPlainSubjectName,
  getSubjectClassLabel,
} from '@/lib/subject-names';
import { normalizeVideoLike, normalizeSessionLike } from '@/lib/eduott-normalize';
import { resolveContentDurationSeconds } from '@/lib/eduott-video-utils';
import { getVideoDisplayTitle } from '@/lib/video-chapter-schedule';
import { useEduOTTFilters } from '@/contexts/edu-ott-filter-context';
import { EduOTTGlobalFilterBar } from '@/components/eduott/EduOTTGlobalFilterBar';
import { EduOTTTabsList, eduOttTabTriggerClass } from '@/components/eduott/EduOTTTabsList';
import { EduOTTStage } from '@/components/eduott/EduOTTStage';
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
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
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
    title: getVideoDisplayTitle({ ...content, type: 'Video' }),
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

function isTeacherPortalUser(): boolean {
  const user = getUser();
  const role = String(user?.role || localStorage.getItem('userRole') || '').toLowerCase();
  return role.includes('teacher');
}

function apiRoot(): '/api/teacher' | '/api/student' {
  return isTeacherPortalUser() ? '/api/teacher' : '/api/student';
}

function buildVideosUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams({ type: 'Video' });
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  return `${API_BASE_URL}${apiRoot()}/asli-prep-content?${params.toString()}`;
}

function buildStreamsUrl(
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams();
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  const q = params.toString();
  return `${API_BASE_URL}${apiRoot()}/streams${q ? `?${q}` : ''}`;
}

export default function EduOTT() {
  const isMobile = useIsMobile();
  const isTeacher = isTeacherPortalUser();
  const Shell = isTeacher ? TeacherShell : StudentShell;
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
  const [selectedLiveSession, setSelectedLiveSession] = useState<LiveSession | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  /** Unfiltered catalog for global class/subject dropdown options */
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const [vRes, sRes] = await Promise.all([
          fetch(`${API_BASE_URL}${apiRoot()}/asli-prep-content?type=Video`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE_URL}${apiRoot()}/streams`, { headers: authHeaders() }),
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
        return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      case 'scheduled':
        return 'bg-teal-green-50 text-teal-green-800 ring-1 ring-teal-green-200';
      case 'ended':
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
      case 'cancelled':
        return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    }
  };

  return (
    <Shell>
      <div className="asli-app-bg relative min-h-screen w-full overflow-x-hidden px-4 pb-10 sm:px-6  lg:px-8">
        <div className="mx-auto max-w-7xl">
        {!isMobile && !isTeacher && <VidyaAIFloatingAssistant />}

        <EduOTTStage
          subtitle="Access high-quality educational videos and join live classes to make learning interactive and impactful."
          stats={[
            {
              value: globalSubjectOptions.length,
              label: globalSubjectOptions.length === 1 ? 'Subject' : 'Subjects',
              icon: <BookOpen className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />,
            },
            {
              value: videos.length,
              label: videos.length === 1 ? 'Video' : 'Videos',
              icon: <VideoIcon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />,
            },
          ]}
        >
        <EduOTTGlobalFilterBar
          classOptions={globalClassOptions}
          subjectOptions={globalSubjectOptions}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 space-y-6">
          <EduOTTTabsList>
            <TabsTrigger value="videos" className={eduOttTabTriggerClass}>
              Videos
            </TabsTrigger>
            <TabsTrigger value="live-sessions" className={eduOttTabTriggerClass}>
              Live Sessions
            </TabsTrigger>
          </EduOTTTabsList>

          <TabsContent value="videos" className="space-y-6">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-green-300" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 border-ink/10 bg-white pl-11 text-base text-ink placeholder:text-muted-foreground"
              />
            </div>

            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-base text-muted-foreground">
                Showing {filteredVideos.length} of {videos.length} videos
              </p>
              {isRefreshingVideos ? (
                <p className="text-[0.9375rem] font-medium text-teal-green-700">Updating list...</p>
              ) : null}
            </div>

            <div className="min-h-[240px] sm:min-h-[420px]">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    <Skeleton className="aspect-video w-full bg-mist-deep" />
                    <div className="space-y-3 p-5">
                      <Skeleton className="mb-2 h-6 w-3/4 bg-mist-deep" />
                      <Skeleton className="h-4 w-1/2 bg-mist-deep" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink/15 bg-mist py-16 text-center">
                <VideoIcon className="mx-auto mb-4 h-16 w-16 text-ink/25" />
                <h3 className="mb-2 font-display text-xl font-semibold text-ink">
                  {videos.length === 0 ? 'No Videos Available' : 'No Videos Found'}
                </h3>
                <p className="mx-auto max-w-md text-lg text-muted-foreground">
                  {videos.length === 0
                    ? 'No videos have been assigned to your subjects yet.'
                    : hasGlobalFilters || searchTerm
                      ? 'No content available for the selected filters. Try clearing filters or adjusting your search.'
                      : 'Try adjusting your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

          <TabsContent value="live-sessions" className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-mist/80 p-4 md:flex-row md:flex-wrap md:items-end sm:p-5">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-green-300" />
                <Input
                  type="text"
                  placeholder="Search live sessions..."
                  value={sessionSearchTerm}
                  onChange={(e) => setSessionSearchTerm(e.target.value)}
                  className="h-12 border-ink/10 bg-white pl-11 text-base text-ink placeholder:text-muted-foreground"
                />
              </div>
              <div className="w-full space-y-2 sm:w-auto">
                <Label className="text-base text-muted-foreground">Status</Label>
                <div className="flex flex-wrap gap-2">
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
                        className={`rounded-full border px-4 py-2 text-[0.9375rem] font-semibold transition-colors ${
                          isActive
                            ? 'border-teal-green-500 bg-gradient-to-r from-teal-green-500 to-indigo-blue-600 text-white shadow-glow'
                            : 'border-ink/15 bg-white text-ink/70 hover:border-teal-green-400/50 hover:bg-mist'
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
                  <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    <Skeleton className="h-32 w-full bg-mist-deep" />
                  </div>
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink/15 bg-mist py-16 text-center">
                <Radio className="mx-auto mb-4 h-16 w-16 text-ink/25" />
                <h3 className="mb-2 font-display text-xl font-semibold text-ink">
                  {liveSessions.length === 0
                    ? 'No Live Sessions Available'
                    : 'No Live Sessions Found'}
                </h3>
                <p className="mx-auto max-w-md text-lg text-muted-foreground">
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
                  <div
                    key={session._id}
                    className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:border-teal-green-400/40 hover:shadow-elevated sm:p-6"
                  >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-3">
                            <h3 className="font-display text-xl font-semibold text-ink">{session.title}</h3>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status.toUpperCase()}
                            </Badge>
                          </div>
                          {session.description && (
                            <p className="mb-4 text-base text-muted-foreground">{session.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-base text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-5 w-5" />
                              <span>
                                {session.streamer?.fullName || session.streamer?.email || 'Unknown'}
                              </span>
                            </div>
                            {session.subject ? (
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="h-5 w-5" />
                                <span>{session.subject}</span>
                              </div>
                            ) : null}
                            {session.class ? (
                              <span className="rounded-full border border-ink/10 bg-mist px-3 py-1 text-[0.9375rem] text-ink">
                                Class {session.class}
                              </span>
                            ) : null}
                            <div className="flex items-center gap-1.5">
                              <Eye className="h-5 w-5" />
                              <span>{session.viewerCount || 0} viewers</span>
                            </div>
                            {(session.scheduledTime || session.scheduledStartTime) && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-5 w-5" />
                                <span>
                                  {new Date(
                                    session.scheduledTime || session.scheduledStartTime || ''
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <EduOTTJoinSessionButton
                          session={session}
                          onJoin={setSelectedLiveSession}
                          className="h-12 shrink-0 bg-red-600 text-base text-white hover:bg-red-700"
                        />
                      </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </TabsContent>
        </Tabs>
        </EduOTTStage>
        </div>
      </div>

      <EduOTTVideoPlayerDialog
        video={selectedVideo}
        open={!!selectedVideo}
        onOpenChange={(open) => {
          if (!open) setSelectedVideo(null);
        }}
      />
      <EduOTTLiveSessionDialog
        session={selectedLiveSession}
        open={!!selectedLiveSession}
        onOpenChange={(open) => {
          if (!open) setSelectedLiveSession(null);
        }}
      />
    </Shell>  );
}
