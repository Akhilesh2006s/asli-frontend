import { useEffect } from 'react';

/** Runs when the browser tab becomes visible again (app/window refocused). */
export function useResetOnTabVisible(onVisible: () => void) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        onVisible();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [onVisible]);
}
