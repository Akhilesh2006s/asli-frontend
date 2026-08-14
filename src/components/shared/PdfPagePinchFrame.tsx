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
const MAX_SCALE = 3.5;
const ZOOM_EPSILON = 1.02;
const ZOOM_STEP = 0.25;
const DOUBLE_TAP_MS = 320;

export type PdfPagePinchFrameHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getScale: () => number;
  panBy: (dx: number, dy: number) => void;
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

function clampPan(tx: number, ty: number, scale: number, pageWidth: number, pageHeight: number) {
  const maxX = Math.max(0, (pageWidth * scale - pageWidth) / 2);
  const maxY = Math.max(0, (pageHeight * scale - pageHeight) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, tx)),
    y: Math.min(maxY, Math.max(-maxY, ty)),
  };
}

/**
 * Premium page frame: page always fits the frame at 100%.
 * Zoom uses CSS transform + drag/wheel pan — never native scrollbars (no clipping chrome).
 */
const PdfPagePinchFrame = forwardRef<PdfPagePinchFrameHandle, Props>(function PdfPagePinchFrame(
  { pageWidth, pageHeight, onZoomChange, children },
  ref,
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(MIN_SCALE);
  const panRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef({ startDistance: 0, startScale: MIN_SCALE });
  const dragRef = useRef<{ active: boolean; x: number; y: number; panX: number; panY: number }>({
    active: false,
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const lastTapRef = useRef(0);

  const zoomed = scale > ZOOM_EPSILON;

  const applyScale = useCallback(
    (next: number, keepPan = false) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      scaleRef.current = clamped;
      setScale(clamped);
      const isZoomed = clamped > ZOOM_EPSILON;
      onZoomChange(isZoomed);
      if (!isZoomed) {
        panRef.current = { x: 0, y: 0 };
        setPan({ x: 0, y: 0 });
        return;
      }
      if (!keepPan) {
        const mid = clampPan(panRef.current.x, panRef.current.y, clamped, pageWidth, pageHeight);
        panRef.current = mid;
        setPan(mid);
      }
    },
    [onZoomChange, pageWidth, pageHeight],
  );

  const applyPan = useCallback(
    (nx: number, ny: number) => {
      const next = clampPan(nx, ny, scaleRef.current, pageWidth, pageHeight);
      panRef.current = next;
      setPan(next);
    },
    [pageWidth, pageHeight],
  );

  const resetZoom = useCallback(() => {
    applyScale(MIN_SCALE);
  }, [applyScale]);

  const zoomIn = useCallback(() => {
    applyScale(scaleRef.current + ZOOM_STEP, true);
  }, [applyScale]);

  const zoomOut = useCallback(() => {
    const next = scaleRef.current - ZOOM_STEP;
    if (next <= ZOOM_EPSILON) resetZoom();
    else applyScale(next, true);
  }, [applyScale, resetZoom]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      if (scaleRef.current <= ZOOM_EPSILON) return;
      applyPan(panRef.current.x + dx, panRef.current.y + dy);
    },
    [applyPan],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      resetZoom,
      getScale: () => scaleRef.current,
      panBy,
    }),
    [zoomIn, zoomOut, resetZoom, panBy],
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
        return;
      }
      if (event.touches.length === 1 && scaleRef.current > ZOOM_EPSILON) {
        const t = event.touches[0];
        dragRef.current = {
          active: true,
          x: t.clientX,
          y: t.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
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
        applyScale(startScale * (distance / startDistance), true);
        return;
      }
      if (event.touches.length === 1 && dragRef.current.active) {
        event.preventDefault();
        const t = event.touches[0];
        const dx = t.clientX - dragRef.current.x;
        const dy = t.clientY - dragRef.current.y;
        applyPan(dragRef.current.panX + dx, dragRef.current.panY + dy);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        dragRef.current.active = false;
        if (scaleRef.current <= ZOOM_EPSILON) {
          resetZoom();
        }
        const now = Date.now();
        if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
          if (scaleRef.current > ZOOM_EPSILON) resetZoom();
          else applyScale(2);
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const factor = event.deltaY < 0 ? 1 + ZOOM_STEP * 0.45 : 1 - ZOOM_STEP * 0.45;
        const next = scaleRef.current * factor;
        if (next <= ZOOM_EPSILON) resetZoom();
        else applyScale(next, true);
        return;
      }
      if (scaleRef.current > ZOOM_EPSILON) {
        event.preventDefault();
        event.stopPropagation();
        applyPan(panRef.current.x - event.deltaX, panRef.current.y - event.deltaY);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (scaleRef.current <= ZOOM_EPSILON) return;
      if (event.button !== 0) return;
      frame.setPointerCapture(event.pointerId);
      dragRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      frame.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active || event.pointerType === 'touch') return;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      applyPan(dragRef.current.panX + dx, dragRef.current.panY + dy);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      dragRef.current.active = false;
      try {
        frame.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      frame.style.cursor = scaleRef.current > ZOOM_EPSILON ? 'grab' : 'zoom-in';
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
    frame.addEventListener('pointerdown', onPointerDown);
    frame.addEventListener('pointermove', onPointerMove);
    frame.addEventListener('pointerup', onPointerUp);
    frame.addEventListener('pointercancel', onPointerUp);
    frame.addEventListener('dblclick', onDblClick);

    return () => {
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchEnd);
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', onPointerUp);
      frame.removeEventListener('pointercancel', onPointerUp);
      frame.removeEventListener('dblclick', onDblClick);
    };
  }, [applyScale, applyPan, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className="pdf-page-pinch-frame shrink-0 select-none overflow-hidden rounded-md bg-white shadow-[0_12px_40px_-18px_rgba(15,23,42,0.45)] ring-1 ring-black/5"
      data-pdf-zoomed={zoomed ? 'true' : 'false'}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        touchAction: zoomed ? 'none' : 'pan-y',
        cursor: zoomed ? 'grab' : 'zoom-in',
      }}
      aria-label="PDF page — drag to pan when zoomed"
      title="Ctrl+scroll or +/- to zoom · drag to pan"
    >
      <div
        className="pdf-page-pinch-content will-change-transform"
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default PdfPagePinchFrame;
