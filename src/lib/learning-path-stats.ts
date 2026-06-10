export type LearningPathDisplayStats = {
  textbooks: number;
  materials: number;
  videos: number;
};

const CONTENT_TYPES = ['Video', 'TextBook', 'Workbook', 'Material', 'Audio', 'Homework'] as const;

function isVideoLike(item: {
  type?: string;
  contentType?: string;
  youtubeUrl?: string;
  fileUrl?: string;
  driveLink?: string;
}): boolean {
  const type = String(item?.type || item?.contentType || '').trim().toLowerCase();
  if (type === 'video' || type === 'youtube' || type === 'lecture') return true;
  if (item.youtubeUrl) return true;
  const url = (item.fileUrl || item.driveLink || '').toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return true;
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return true;
  return false;
}

function canonicalContentType(item: { type?: string; contentType?: string }): string | null {
  const raw = String(item?.type || item?.contentType || '').trim();
  if (!raw) return null;
  const match = CONTENT_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  return match || raw;
}

/** Map catalog content into Textbooks / Materials / Videos tiles (no double-counting). */
export function countLearningPathDisplayStats(
  contents: readonly { type?: string; contentType?: string }[] | null | undefined
): LearningPathDisplayStats {
  let textbooks = 0;
  let materials = 0;
  let videos = 0;

  for (const item of contents || []) {
    const type = canonicalContentType(item);
    if (!type) {
      if (isVideoLike(item)) videos += 1;
      continue;
    }
    switch (type) {
      case 'TextBook':
      case 'Workbook':
        textbooks += 1;
        break;
      case 'Material':
      case 'Homework':
      case 'Audio':
        materials += 1;
        break;
      case 'Video':
        videos += 1;
        break;
      default:
        if (isVideoLike(item)) videos += 1;
        break;
    }
  }

  return { textbooks, materials, videos };
}

export function learningPathStatsTotal(stats: LearningPathDisplayStats): number {
  return stats.textbooks + stats.materials + stats.videos;
}
