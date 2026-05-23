import { API_BASE_URL } from '@/lib/api-config';

export type EduOTTVideoLike = {
  thumbnailUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  youtubeUrl?: string | null;
  isYouTubeVideo?: boolean;
};

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return match[2];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const partialMatch = url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (partialMatch) return partialMatch[1];
  return null;
}

export function resolveYouTubeUrl(video: EduOTTVideoLike): string | null {
  const candidates = [video.youtubeUrl, video.videoUrl, video.fileUrl].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );
  for (const url of candidates) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return url;
  }
  return null;
}

export function isYouTubeVideo(video: EduOTTVideoLike): boolean {
  if (video.isYouTubeVideo) return true;
  return !!resolveYouTubeUrl(video);
}

function normalizeThumbnailUrl(thumbnailUrl: string): string {
  const trimmed = thumbnailUrl.trim();
  if (
    trimmed.startsWith('http') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

/** Thumbnail for grid cards — prefers stored image, then YouTube preview from any video URL. */
export function getEduOTTThumbnailUrl(video: EduOTTVideoLike): string | null {
  if (video.thumbnailUrl?.trim()) {
    return normalizeThumbnailUrl(video.thumbnailUrl);
  }
  const youtubeUrl = resolveYouTubeUrl(video);
  if (youtubeUrl) {
    const id = extractYouTubeId(youtubeUrl);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

export function getEduOTTPlaybackUrl(video: EduOTTVideoLike): {
  isYouTube: boolean;
  url: string | null;
} {
  const youtubeUrl = resolveYouTubeUrl(video);
  if (youtubeUrl) return { isYouTube: true, url: youtubeUrl };
  const file = video.videoUrl || video.fileUrl;
  if (file) return { isYouTube: false, url: file };
  return { isYouTube: false, url: null };
}

type DurationSource = {
  duration?: number | null;
  durationSeconds?: number | null;
};

/**
 * Content.duration is stored in minutes (super-admin). Some rows use seconds or are 0.
 * Prefer explicit durationSeconds when provided.
 */
export function resolveContentDurationSeconds(source: DurationSource): number {
  if (source.durationSeconds != null && Number(source.durationSeconds) > 0) {
    return Math.round(Number(source.durationSeconds));
  }
  const raw = Number(source.duration);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  // Values >= 600 are almost certainly already seconds (10+ hours as minutes is rare).
  if (raw >= 600) return Math.round(raw);
  return Math.round(raw * 60);
}

/** Human-readable length for EduOTT cards (e.g. 8:05, 1h 12m). */
export function formatEduOTTDurationLabel(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec <= 0) return '';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return minutes > 0 || seconds > 0
      ? `${hours}h ${minutes}m`
      : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes} min`;
  }
  return `${seconds}s`;
}
