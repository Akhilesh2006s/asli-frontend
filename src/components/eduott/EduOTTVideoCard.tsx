import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Play, Video as VideoIcon } from 'lucide-react';
import {
  getEduOTTPlaybackUrl,
  getEduOTTThumbnailUrl,
  resolveContentDurationSeconds,
  formatEduOTTDurationLabel,
  type EduOTTVideoLike,
} from '@/lib/eduott-video-utils';

export type EduOTTVideoCardItem = EduOTTVideoLike & {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  views?: number;
  createdAt?: string;
  /** Length in seconds (preferred). */
  durationSeconds?: number;
  /** Legacy: minutes in DB, or seconds if large — use resolveContentDurationSeconds. */
  duration?: number;
  subjectName?: string;
  subject?: string;
};

type EduOTTVideoCardProps = {
  video: EduOTTVideoCardItem;
  onPlay: () => void;
  /** Optional override; otherwise computed from video + file metadata. */
  durationLabel?: string;
  subjectBadges?: React.ReactNode;
  playAccentClass?: string;
};

export function EduOTTVideoCard({
  video,
  onPlay,
  durationLabel: durationLabelProp,
  subjectBadges,
  playAccentClass = 'text-primary',
}: EduOTTVideoCardProps) {
  const [thumbError, setThumbError] = useState(false);
  const [secondsFromFile, setSecondsFromFile] = useState<number | null>(null);
  const thumbnailSrc = getEduOTTThumbnailUrl(video);
  const { isYouTube, url: playbackUrl } = getEduOTTPlaybackUrl(video);
  const videoKey = video._id || video.id || video.title;

  const dbSeconds = useMemo(() => resolveContentDurationSeconds(video), [video]);

  useEffect(() => {
    setSecondsFromFile(null);
  }, [videoKey, playbackUrl]);

  const displaySeconds = secondsFromFile ?? dbSeconds;
  const durationLabel =
    durationLabelProp?.trim() ||
    formatEduOTTDurationLabel(displaySeconds) ||
    '';

  return (
    <Card
      className="overflow-hidden transition-shadow duration-200 hover:shadow-lg cursor-pointer group"
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="relative bg-white">
        {!isYouTube && playbackUrl && dbSeconds <= 0 ? (
          <video
            className="hidden"
            preload="metadata"
            src={playbackUrl}
            aria-hidden
            tabIndex={-1}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) {
                setSecondsFromFile(Math.round(d));
              }
            }}
          />
        ) : null}
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
        {durationLabel ? (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{durationLabel}</span>
          </div>
        ) : null}
      </div>

      <CardHeader>
        <CardTitle className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
          {video.title}
        </CardTitle>
        {subjectBadges ? <div className="mt-2 flex flex-wrap gap-2">{subjectBadges}</div> : null}
      </CardHeader>

      {video.description ? (
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-gray-600 sm:text-sm">{video.description}</p>
        </CardContent>
      ) : null}
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
