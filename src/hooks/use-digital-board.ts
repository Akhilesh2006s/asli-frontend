import { useEffect, useState } from 'react';

/** Viewport breakpoint (Tailwind `board`). */
const VIEWPORT_BOARD_QUERY = '(min-width: 2560px)';

/**
 * True on large classroom / 4K panels.
 * Uses physical screen size so OS scaling (125–150%) does not shrink the
 * viewport below 2560px and accidentally use the laptop iframe PDF path.
 */
export function detectDigitalBoard(): boolean {
  if (typeof window === 'undefined') return false;

  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;

  if (sw >= 3840 || sh >= 2160) return true;
  if (sw >= 2560 && sh >= 1600) return true;

  return window.matchMedia(VIEWPORT_BOARD_QUERY).matches;
}

export function useDigitalBoard(): boolean {
  const [isDigitalBoard, setIsDigitalBoard] = useState(detectDigitalBoard);

  useEffect(() => {
    const update = () => setIsDigitalBoard(detectDigitalBoard());
    update();

    const mq = window.matchMedia(VIEWPORT_BOARD_QUERY);
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isDigitalBoard;
}
