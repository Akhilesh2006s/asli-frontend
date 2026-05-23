export type DashboardStatsCache = {
  studyTimeToday: number;
  studyTimeThisWeek: number;
  backendToday: number;
  backendWeek: number;
  totalTodos: number;
  completedTodos: number;
};

function getCacheKey(): string | null {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.userId || payload.id || payload._id;
    return userId ? `dashboard_stats_${userId}` : null;
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
      JSON.stringify({ ...existing, ...patch })
    );
  } catch {
    // ignore quota / parse errors
  }
}
