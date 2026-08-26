import { getAuthToken, getUserIdFromAuthToken } from '@/lib/auth-utils';
export type DashboardStatsCache = {
  studyTimeToday: number;
  studyTimeThisWeek: number;
  backendToday: number;
  backendWeek: number;
  totalTodos: number;
  completedTodos: number;
  dateKey?: string;
  weekStartKey?: string;
};

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localWeekStartKey(date = new Date()): string {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return localDateKey(monday);
}

function getCacheKey(): string | null {
  try {
    const userId = getUserIdFromAuthToken();
    if (userId) return `dashboard_stats_${userId}`;
    const token = getAuthToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const id = payload.userId || payload.id || payload._id;
    return id ? `dashboard_stats_${id}` : null;
  } catch {
    return null;
  }
}

export function readDashboardStatsCache(): DashboardStatsCache | null {
  const key = getCacheKey();
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardStatsCache;
    if (
      typeof parsed.studyTimeToday !== 'number' ||
      typeof parsed.studyTimeThisWeek !== 'number'
    ) {
      return null;
    }
    const today = localDateKey();
    const weekStart = localWeekStartKey();
    if (parsed.weekStartKey && parsed.weekStartKey !== weekStart) {
      return {
        ...parsed,
        studyTimeToday: 0,
        studyTimeThisWeek: 0,
        backendToday: 0,
        backendWeek: 0,
        dateKey: today,
        weekStartKey: weekStart,
      };
    }
    if (parsed.dateKey && parsed.dateKey !== today) {
      return {
        ...parsed,
        studyTimeToday: 0,
        backendToday: 0,
        dateKey: today,
        weekStartKey: weekStart,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardStatsCache(
  patch: Partial<DashboardStatsCache>
): void {
  const key = getCacheKey();
  if (!key) return;
  try {
    const existing = readDashboardStatsCache() || {
      studyTimeToday: 0,
      studyTimeThisWeek: 0,
      backendToday: 0,
      backendWeek: 0,
      totalTodos: 0,
      completedTodos: 0,
    };
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...existing,
        ...patch,
        dateKey: localDateKey(),
        weekStartKey: localWeekStartKey(),
      })
    );
  } catch {
    // ignore quota / parse errors
  }
}
