import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';
import {
  endSession,
  getLocalIsoDateKey,
  startSession,
  updateStudyTime,
} from '@/utils/studyTimeTracker';

function sessionTimeUrl(): string {
  return `${API_BASE_URL}/api/teacher/session-time`;
}

/** Track teacher foreground time and sync it to the weekly report. */
export function startTeacherPlatformSessionSync(): () => void {
  let cancelled = false;
  let saveInterval: ReturnType<typeof setInterval> | null = null;
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  const persist = async () => {
    const token = getAuthToken();
    if (!token || cancelled) return;
    const { today } = updateStudyTime();
    if (today <= 0) return;
    await fetch(sessionTimeUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: getLocalIsoDateKey(),
        totalMinutes: today,
      }),
    }).catch(() => null);
  };

  const bootstrap = async () => {
    const token = getAuthToken();
    if (token) {
      await fetch(sessionTimeUrl(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => null);
    }
    if (cancelled) return;
    startSession();
    await persist();
  };

  void bootstrap();
  tickInterval = setInterval(() => {
    if (!document.hidden) updateStudyTime();
  }, 60_000);
  saveInterval = setInterval(() => {
    if (!document.hidden) void persist();
  }, 5 * 60 * 1000);

  const onVisibility = () => {
    if (document.hidden) {
      endSession();
      void persist();
    } else {
      startSession();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancelled = true;
    if (saveInterval) clearInterval(saveInterval);
    if (tickInterval) clearInterval(tickInterval);
    document.removeEventListener('visibilitychange', onVisibility);
    endSession();
    void persist();
  };
}
