import { useEffect, useState } from 'react';

/** Large classroom panels / 4K boards (matches Tailwind `board` breakpoint). */
const DIGITAL_BOARD_QUERY = '(min-width: 2560px)';

export function useDigitalBoard(): boolean {
  const [isDigitalBoard, setIsDigitalBoard] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(DIGITAL_BOARD_QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(DIGITAL_BOARD_QUERY);
    const onChange = () => setIsDigitalBoard(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDigitalBoard;
}
