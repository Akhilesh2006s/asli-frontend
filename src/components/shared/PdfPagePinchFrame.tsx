import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_EPSILON = 1.02;
const DOUBLE_TAP_MS = 320;

type Props = {
  pageWidth: number;
  pageHeight: number;
  onZoomChange: (zoomed: boolean) => void;
  children: (size: { width: number; height: number }) => ReactNode;
};

function touchDistance(touches: TouchList): number {
  return Math.hypot(
    touches[1].clientX - touches[0].clientX,
    touches[1].clientY - touches[0].clientY,
  );
}

/** Fixed-size viewport; pinch zooms content inside the page box only. */
export default function PdfPagePinchFrame({
  pageWidth,
  pageHeight,
  onZoomChange,
  children,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const scaleRef = useRef(MIN_SCALE);
  const pinchRef = useRef({ startDistance: 0, startScale: MIN_SCALE });
  const lastTapRef = useRef(0);

  const zoomed = scale > ZOOM_EPSILON;
  const contentWidth = Math.max(1, Math.round(pageWidth * scale));
  const contentHeight = Math.max(1, Math.round(pageHeight * scale));

  const applyScale = useCallback((next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    scaleRef.current = clamped;
    setScale(clamped);
    onZoomChange(clamped > ZOOM_EPSILON);
  }, [onZoomChange]);

  const resetZoom = useCallback(() => {
    const frame = frameRef.current;
    applyScale(MIN_SCALE);
    if (frame) {
      frame.scrollLeft = 0;
      frame.scrollTop = 0;
    }
  }, [applyScale]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        pinchRef.current = {
          startDistance: touchDistance(event.touches),
          startScale: scaleRef.current,
        };
        onZoomChange(true);
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2) return;
      event.preventDefault();
      const { startDistance, startScale } = pinchRef.current;
      if (startDistance <= 0) {
        pinchRef.current = {
          startDistance: touchDistance(event.touches),
          startScale: scaleRef.current,
        };
        return;
      }
      const distance = touchDistance(event.touches);
      applyScale(startScale * (distance / startDistance));
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) return;

      if (event.touches.length === 0) {
        if (scaleRef.current <= ZOOM_EPSILON) {
          resetZoom();
        }

        const now = Date.now();
        if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
          resetZoom();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      }
    };

    frame.addEventListener('touchstart', onTouchStart, { passive: false });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd, { passive: true });
    frame.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyScale, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className="pdf-page-pinch-frame shrink-0 overflow-hidden rounded-sm bg-white shadow-md"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        overflow: zoomed ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: zoomed ? 'none' : 'manipulation',
      }}
      aria-label="PDF page — pinch to zoom"
    >
      <div
        className="pdf-page-pinch-content"
        style={{
          width: `${contentWidth}px`,
          height: `${contentHeight}px`,
          minWidth: `${contentWidth}px`,
          minHeight: `${contentHeight}px`,
        }}
      >
        {children({ width: contentWidth, height: contentHeight })}
      </div>
    </div>
  );
}
