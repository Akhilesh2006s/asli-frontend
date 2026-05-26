import { useEffect, useState } from 'react';

/** Viewport breakpoint (Tailwind `board`). */
const VIEWPORT_BOARD_QUERY = '(min-width: 2560px)';

/** Manual override on the panel browser console: localStorage.setItem('aslilearn_digital_board', '1') */
const STORAGE_KEY = 'aslilearn_digital_board';

/**
 * True on large classroom / 4K panels — not normal laptops.
 * Uses physical pixels (DPR), touch + large display, and optional localStorage override.
 */
export function detectDigitalBoard(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return true;
  } catch {
    /* ignore */
  }

  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;
  const dpr = window.devicePixelRatio || 1;
  const physicalW = Math.round(sw * dpr);
  const physicalH = Math.round(sh * dpr);

  // Native 4K reporting
  if (sw >= 3840 || sh >= 2160) return true;
  if (sw >= 2560 && sh >= 1600) return true;

  // 4K panel with 125–200% Windows scaling (CSS size 1920–2560, DPR 1.5–2)
  if (physicalW >= 3600 || physicalH >= 2000) return true;

  // Interactive flat panel: often reports 1920×1080 to Windows; iframe PDF shows only "Open"
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const classroomTouchDisplay =
    coarsePointer && touchPoints >= 2 && sw >= 1920 && sh >= 1000;

  if (classroomTouchDisplay && (physicalW >= 2800 || touchPoints >= 5)) {
    return true;
  }

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
