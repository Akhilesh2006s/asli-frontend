/**
 * Student dashboard bootstrap — one API call for initial dashboard data.
 */

import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';

export type ContentTypeCounts = {
  TextBook: number;
  Workbook: number;
  Material: number;
  Audio: number;
  Homework: number;
  Video: number;
};

export type DashboardBootstrapPayload = {
  success: boolean;
  user: Record<string, unknown>;
  subjects: Array<Record<string, unknown>>;
  previewVideos?: Array<Record<string, unknown>>;
  contents: Array<Record<string, unknown>>;
  contentTypeCounts: ContentTypeCounts;
  quizzes: Array<Record<string, unknown>>;
  stats: {
    examCount: number;
    examResultCount: number;
    totalContent: number;
    subjectCount: number;
    quizCount: number;
  };
  studyStreak: { count: number; message?: string } | null;
};

const BOOTSTRAP_CACHE_MS = 60_000;
let cached: DashboardBootstrapPayload | null = null;
let cachedAt = 0;
let inflight: Promise<DashboardBootstrapPayload | null> | null = null;

export function invalidateDashboardBootstrapCache(): void {
  cached = null;
  cachedAt = 0;
  inflight = null;
}

export async function fetchDashboardBootstrap(options: {
  force?: boolean;
} = {}): Promise<DashboardBootstrapPayload | null> {
  const token = getAuthToken();
  if (!token) return null;

  if (!options.force && cached && Date.now() - cachedAt < BOOTSTRAP_CACHE_MS) {
    return cached;
  }
  if (!options.force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/dashboard-bootstrap`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as DashboardBootstrapPayload;
      if (data?.success) {
        cached = data;
        cachedAt = Date.now();
      }
      return data?.success ? data : null;
    } catch {
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
