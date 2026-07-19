import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';

const SKIP_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/subscribe',
  '/signin',
  '/',
  '/privacy',
  '/terms',
  '/contact',
  '/#pricing',
];

/**
 * Redirects individual users with an expired trial to the subscribe / paywall page.
 */
export function IndividualTrialGate({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        if (!cancelled) setReady(true);
        return;
      }

      const pathOnly = location.split('?')[0];
      if (SKIP_PATHS.some((p) => pathOnly === p || pathOnly.startsWith('/auth/'))) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = await res.json();
        const user = data.user || data;
        if (user?.isIndividualAccount && user?.paymentRequired) {
          if (pathOnly !== '/auth/subscribe') {
            setLocation('/auth/subscribe');
            return;
          }
        }
      } catch {
        /* ignore network errors for gate */
      }
      if (!cancelled) setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [location, setLocation]);

  if (!ready && localStorage.getItem('authToken')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
