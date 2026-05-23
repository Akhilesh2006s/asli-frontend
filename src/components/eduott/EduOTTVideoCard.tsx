import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Play, Video as VideoIcon, X } from 'lucide-react';
import YouTubePlayer from '@/components/youtube-player';
import {
  getEduOTTPlaybackUrl,
  getEduOTTThumbnailUrl,
  type EduOTTVideoLike,
} from '@/lib/eduott-video-utils';

export type EduOTTVideoCardItem = EduOTTVideoLike & {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  views?: number;
  createdAt?: string;
  subjectName?: string;
  subject?: string;
};

type EduOTTVideoCardProps = {
  video: EduOTTVideoCardItem;
  isExpanded: boolean;
  onToggle: () => void;
  durationLabel: string;
  subjectBadges?: React.ReactNode;
  playAccentClass?: string;
};

export function EduOTTVideoCard({
  video,
  isExpanded,
  onToggle,
  durationLabel,
  subjectBadges,
  playAccentClass = 'text-primary',
}: EduOTTVideoCardProps) {
  const [thumbError, setThumbError] = useState(false);
  const thumbnailSrc = getEduOTTThumbnailUrl(video);
  const { isYouTube, url: playbackUrl } = getEduOTTPlaybackUrl(video);
  const videoKey = video._id || video.id || video.title;

  return (
    <Card
      className={`overflow-hidden transition-shadow duration-200 ${
        isExpanded ? 'ring-2 ring-sky-400 shadow-lg' : 'hover:shadow-lg cursor-pointer group'
      }`}
      onClick={isExpanded ? undefined : onToggle}
    >
      <div className="relative bg-white">
        {isExpanded ? (
          <div className="relative bg-black" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onToggle}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              aria-label="Close video"
            >
              <X className="w-4 h-4" />
            </button>
            {isYouTube && playbackUrl ? (
              <YouTubePlayer videoUrl={playbackUrl} title={video.title} className="w-full" />
            ) : playbackUrl ? (
              <video
                key={videoKey}
                src={playbackUrl}
                controls
                autoPlay
                className="w-full aspect-video object-contain bg-black"
                playsInline
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-gray-100 text-gray-600">
                Video not available
              </div>
            )}
          </div>
        ) : (
          <>
            {thumbnailSrc && !thumbError ? (
              <img
                src={thumbnailSrc}
                alt={video.title}
                className="w-full h-48 object-cover bg-white"
                onError={() => setThumbError(true)}
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-gray-100">
                <VideoIcon className="h-14 w-14 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                <Play className={`h-7 w-7 ml-0.5 ${playAccentClass}`} fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
              <Clock className="h-3 w-3" />
              {durationLabel}
            </div>
          </>
        )}
      </div>

      <CardHeader className={isExpanded ? 'pt-3' : undefined}>
        <CardTitle className="line-clamp-2 text-base font-semibold text-gray-900 sm:text-lg">
          {video.title}
        </CardTitle>
        {subjectBadges ? <div className="mt-2 flex flex-wrap gap-2">{subjectBadges}</div> : null}
      </CardHeader>

      {(video.description || video.views != null || video.createdAt) && (
        <CardContent className="pt-0">
          {video.description && (
            <p className="mb-3 line-clamp-2 text-xs text-gray-600 sm:text-sm">{video.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <VideoIcon className="h-3 w-3" />
              {video.views ?? 0} views
            </span>
            {video.createdAt && (
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function EduOTTSubjectBadges({
  subjectLabel,
  classLabel,
}: {
  subjectLabel?: string;
  classLabel?: string;
}) {
  if (!subjectLabel && !classLabel) return null;
  return (
    <>
      {subjectLabel ? (
        <Badge variant="outline" className="w-fit">
          <BookOpen className="mr-1 h-3 w-3" />
          {subjectLabel}
        </Badge>
      ) : null}
      {classLabel ? (
        <Badge className="w-fit border-0 bg-sky-100 text-sky-800">Class {classLabel}</Badge>
      ) : null}
    </>
  );
}
