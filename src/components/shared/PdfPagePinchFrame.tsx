import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_EPSILON = 1.02;
const ZOOM_STEP = 0.2;
const DOUBLE_TAP_MS = 320;

export type PdfPagePinchFrameHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getScale: () => number;
};

type Props = {
  pageWidth: number;
  pageHeight: number;
  onZoomChange: (zoomed: boolean) => void;
  children: ReactNode;
};

function touchDistance(touches: TouchList): number {
  return Math.hypot(
    touches[1].clientX - touches[0].clientX,
    touches[1].clientY - touches[0].clientY,
  );
}

/** Fixed-size viewport; pinch / Ctrl+wheel / buttons zoom content with CSS transform. */
const PdfPagePinchFrame = forwardRef<PdfPagePinchFrameHandle, Props>(function PdfPagePinchFrame(
  { pageWidth, pageHeight, onZoomChange, children },
  ref,
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const scaleRef = useRef(MIN_SCALE);
  const pinchRef = useRef({ startDistance: 0, startScale: MIN_SCALE });
  const lastTapRef = useRef(0);

  const zoomed = scale > ZOOM_EPSILON;
  const scaledWidth = Math.max(1, Math.round(pageWidth * scale));
  const scaledHeight = Math.max(1, Math.round(pageHeight * scale));

  const applyScale = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      scaleRef.current = clamped;
      setScale(clamped);
      onZoomChange(clamped > ZOOM_EPSILON);
    },
    [onZoomChange],
  );

  const resetZoom = useCallback(() => {
    const frame = frameRef.current;
    applyScale(MIN_SCALE);
    if (frame) {
      frame.scrollLeft = 0;
      frame.scrollTop = 0;
    }
  }, [applyScale]);

  const zoomIn = useCallback(() => {
    applyScale(scaleRef.current + ZOOM_STEP);
  }, [applyScale]);

  const zoomOut = useCallback(() => {
    const next = scaleRef.current - ZOOM_STEP;
    if (next <= ZOOM_EPSILON) resetZoom();
    else applyScale(next);
  }, [applyScale, resetZoom]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      resetZoom,
      getScale: () => scaleRef.current,
    }),
    [zoomIn, zoomOut, resetZoom],
  );

  useEffect(() => {
    applyScale(MIN_SCALE);
  }, [applyScale, pageWidth, pageHeight]);

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

    /** Desktop: Ctrl/Cmd + scroll (also trackpad pinch in Chromium). */
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = -event.deltaY;
      const factor = delta > 0 ? 1 + ZOOM_STEP * 0.5 : 1 - ZOOM_STEP * 0.5;
      const next = scaleRef.current * factor;
      if (next <= ZOOM_EPSILON) resetZoom();
      else applyScale(next);
    };

    const onDblClick = (event: MouseEvent) => {
      event.preventDefault();
      if (scaleRef.current > ZOOM_EPSILON) resetZoom();
      else applyScale(2);
    };

    frame.addEventListener('touchstart', onTouchStart, { passive: false });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd, { passive: true });
    frame.addEventListener('touchcancel', onTouchEnd, { passive: true });
    frame.addEventListener('wheel', onWheel, { passive: false });
    frame.addEventListener('dblclick', onDblClick);

    return () => {
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchEnd);
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('dblclick', onDblClick);
    };
  }, [applyScale, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className="pdf-page-pinch-frame shrink-0 overflow-hidden rounded-sm bg-white shadow-md"
      data-pdf-zoomed={zoomed ? 'true' : 'false'}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        overflow: zoomed ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: zoomed ? 'none' : 'manipulation',
        cursor: zoomed ? 'grab' : 'zoom-in',
      }}
      aria-label="PDF page — pinch or Ctrl+scroll to zoom"
      title="Ctrl+scroll or double-click to zoom · pinch on touch"
    >
      <div
        className="pdf-page-pinch-content"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          minWidth: `${scaledWidth}px`,
          minHeight: `${scaledHeight}px`,
        }}
      >
        <div
          style={{
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            transform: scale > ZOOM_EPSILON ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

export default PdfPagePinchFrame;
