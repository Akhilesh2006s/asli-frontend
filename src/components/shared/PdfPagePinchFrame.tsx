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
const MAX_SCALE = 3.25;
const ZOOM_EPSILON = 1.02;
const ZOOM_STEP = 0.28;
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
  onZoomChange: (zoomed: boolean, scale?: number) => void;
  children: ReactNode;
};

function touchDistance(touches: TouchList): number {
  return Math.hypot(
    touches[1].clientX - touches[0].clientX,
    touches[1].clientY - touches[0].clientY,
  );
}

/**
 * Page grows on screen when zoomed (frame expands) — immersive, no white card clip.
 * Pinch / Ctrl+wheel / +/- zoom; pan via parent scroll or drag.
 */
const PdfPagePinchFrame = forwardRef<PdfPagePinchFrameHandle, Props>(function PdfPagePinchFrame(
  { pageWidth, pageHeight, onZoomChange, children },
  ref,
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const scaleRef = useRef(MIN_SCALE);
  const pinchRef = useRef({ startDistance: 0, startScale: MIN_SCALE });
  const dragRef = useRef<{ active: boolean; x: number; y: number; scrollEl: HTMLElement | null; left: number; top: number }>({
    active: false,
    x: 0,
    y: 0,
    scrollEl: null,
    left: 0,
    top: 0,
  });
  const lastTapRef = useRef(0);

  const zoomed = scale > ZOOM_EPSILON;
  const frameW = Math.max(1, Math.round(pageWidth * scale));
  const frameH = Math.max(1, Math.round(pageHeight * scale));

  const findScrollParent = useCallback((): HTMLElement | null => {
    let el: HTMLElement | null = frameRef.current?.parentElement ?? null;
    while (el) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (oy === 'auto' || oy === 'scroll' || el.classList.contains('pdf-book-scroll')) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }, []);

  const applyScale = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      const prev = scaleRef.current;
      scaleRef.current = clamped;
      setScale(clamped);
      onZoomChange(clamped > ZOOM_EPSILON, clamped);

      // Keep the page centered in the scroll parent while it grows/shrinks.
      requestAnimationFrame(() => {
        const scrollEl = findScrollParent();
        const frame = frameRef.current;
        if (!scrollEl || !frame || prev <= 0) return;
        const ratio = clamped / prev;
        const viewCX = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
        const viewCY = scrollEl.scrollTop + scrollEl.clientHeight / 2;
        const frameLeft = frame.offsetLeft;
        const frameTop = frame.offsetTop;
        const relX = viewCX - frameLeft;
        const relY = viewCY - frameTop;
        scrollEl.scrollLeft = frameLeft + relX * ratio - scrollEl.clientWidth / 2;
        scrollEl.scrollTop = frameTop + relY * ratio - scrollEl.clientHeight / 2;
      });
    },
    [onZoomChange, findScrollParent],
  );

  const resetZoom = useCallback(() => {
    applyScale(MIN_SCALE);
  }, [applyScale]);

  const zoomIn = useCallback(() => {
    applyScale(scaleRef.current + ZOOM_STEP);
  }, [applyScale]);

  const zoomOut = useCallback(() => {
    const next = scaleRef.current - ZOOM_STEP;
    if (next <= ZOOM_EPSILON) resetZoom();
    else applyScale(next);
  }, [applyScale, resetZoom]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const scrollEl = findScrollParent();
      if (!scrollEl) return;
      scrollEl.scrollBy({ left: -dx, top: -dy, behavior: 'auto' });
    },
    [findScrollParent],
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
  }, [pageWidth, pageHeight]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only on page size change

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
      applyScale(startScale * (touchDistance(event.touches) / startDistance));
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      if (scaleRef.current <= ZOOM_EPSILON) resetZoom();
      const now = Date.now();
      if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
        if (scaleRef.current > ZOOM_EPSILON) resetZoom();
        else applyScale(2);
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    };

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      event.stopPropagation();
      const factor = event.deltaY < 0 ? 1 + ZOOM_STEP * 0.4 : 1 - ZOOM_STEP * 0.4;
      const next = scaleRef.current * factor;
      if (next <= ZOOM_EPSILON) resetZoom();
      else applyScale(next);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (scaleRef.current <= ZOOM_EPSILON) return;
      const scrollEl = findScrollParent();
      frame.setPointerCapture(event.pointerId);
      dragRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        scrollEl,
        left: scrollEl?.scrollLeft ?? 0,
        top: scrollEl?.scrollTop ?? 0,
      };
      frame.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active || event.pointerType === 'touch') return;
      const { scrollEl, x, y, left, top } = dragRef.current;
      if (!scrollEl) return;
      scrollEl.scrollLeft = left - (event.clientX - x);
      scrollEl.scrollTop = top - (event.clientY - y);
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
  }, [applyScale, findScrollParent, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className="pdf-page-pinch-frame shrink-0 select-none overflow-hidden rounded-sm bg-transparent shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] transition-[width,height] duration-150 ease-out"
      data-pdf-zoomed={zoomed ? 'true' : 'false'}
      style={{
        width: `${frameW}px`,
        height: `${frameH}px`,
        touchAction: zoomed ? 'none' : 'pan-y',
        cursor: zoomed ? 'grab' : 'zoom-in',
        zIndex: zoomed ? 5 : 1,
      }}
      aria-label="PDF page — zoom expands on screen"
      title="Ctrl+scroll or +/- to zoom · drag to pan when zoomed"
    >
      <div
        className="will-change-transform"
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default PdfPagePinchFrame;
