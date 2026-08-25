import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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
  /** Preferred scroll host for pan (avoids fragile parent walk). */
  scrollParentRef?: RefObject<HTMLElement | null>;
};

function touchDistance(touches: TouchList): number {
  return Math.hypot(
    touches[1].clientX - touches[0].clientX,
    touches[1].clientY - touches[0].clientY,
  );
}

/**
 * Page grows on screen when zoomed. Pinch / Ctrl+wheel / +/- zoom;
 * pan via the scroll parent (mouse drag + one-finger touch) in all directions.
 */
const PdfPagePinchFrame = forwardRef<PdfPagePinchFrameHandle, Props>(function PdfPagePinchFrame(
  { pageWidth, pageHeight, onZoomChange, children, scrollParentRef },
  ref,
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const scaleRef = useRef(MIN_SCALE);
  const pinchRef = useRef({ startDistance: 0, startScale: MIN_SCALE, pinching: false });
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    x: number;
    y: number;
    scrollEl: HTMLElement | null;
    left: number;
    top: number;
  }>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    scrollEl: null,
    left: 0,
    top: 0,
  });
  const touchPanRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    scrollEl: HTMLElement | null;
    left: number;
    top: number;
  }>({
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
    const preferred = scrollParentRef?.current ?? null;
    if (preferred) return preferred;

    let el: HTMLElement | null = frameRef.current?.parentElement ?? null;
    while (el) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      const ox = style.overflowX;
      if (
        oy === 'auto' ||
        oy === 'scroll' ||
        ox === 'auto' ||
        ox === 'scroll' ||
        el.classList.contains('pdf-book-scroll')
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }, [scrollParentRef]);

  const applyScale = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
      const prev = scaleRef.current;
      scaleRef.current = clamped;
      setScale(clamped);
      onZoomChange(clamped > ZOOM_EPSILON, clamped);

      // Keep the focal point centered in the scroll parent while the page grows/shrinks.
      requestAnimationFrame(() => {
        const scrollEl = findScrollParent();
        const frame = frameRef.current;
        if (!scrollEl || !frame || prev <= 0) return;
        const ratio = clamped / prev;
        const frameRect = frame.getBoundingClientRect();
        const scrollRect = scrollEl.getBoundingClientRect();
        const viewCX = scrollEl.scrollLeft + scrollEl.clientWidth / 2;
        const viewCY = scrollEl.scrollTop + scrollEl.clientHeight / 2;
        const frameLeft = frameRect.left - scrollRect.left + scrollEl.scrollLeft;
        const frameTop = frameRect.top - scrollRect.top + scrollEl.scrollTop;
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

    const beginScrollDrag = (clientX: number, clientY: number) => {
      const scrollEl = findScrollParent();
      if (!scrollEl || scaleRef.current <= ZOOM_EPSILON) return false;
      dragRef.current = {
        active: true,
        pointerId: null,
        x: clientX,
        y: clientY,
        scrollEl,
        left: scrollEl.scrollLeft,
        top: scrollEl.scrollTop,
      };
      frame.style.cursor = 'grabbing';
      return true;
    };

    const moveScrollDrag = (clientX: number, clientY: number) => {
      const { active, scrollEl, x, y, left, top } = dragRef.current;
      if (!active || !scrollEl) return;
      scrollEl.scrollLeft = left - (clientX - x);
      scrollEl.scrollTop = top - (clientY - y);
    };

    const endScrollDrag = () => {
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      frame.style.cursor = scaleRef.current > ZOOM_EPSILON ? 'grab' : 'zoom-in';
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
        pinchRef.current = {
          startDistance: touchDistance(event.touches),
          startScale: scaleRef.current,
          pinching: true,
        };
        touchPanRef.current.active = false;
        onZoomChange(true);
        return;
      }
      if (event.touches.length === 1 && scaleRef.current > ZOOM_EPSILON) {
        const t = event.touches[0];
        const scrollEl = findScrollParent();
        if (!scrollEl) return;
        // Own the gesture so the browser does not steal vertical page-snap scroll.
        event.preventDefault();
        touchPanRef.current = {
          active: true,
          x: t.clientX,
          y: t.clientY,
          scrollEl,
          left: scrollEl.scrollLeft,
          top: scrollEl.scrollTop,
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
            pinching: true,
          };
          return;
        }
        applyScale(startScale * (touchDistance(event.touches) / startDistance));
        return;
      }

      if (
        event.touches.length === 1 &&
        touchPanRef.current.active &&
        scaleRef.current > ZOOM_EPSILON &&
        !pinchRef.current.pinching
      ) {
        event.preventDefault();
        const t = event.touches[0];
        const { scrollEl, x, y, left, top } = touchPanRef.current;
        if (!scrollEl) return;
        scrollEl.scrollLeft = left - (t.clientX - x);
        scrollEl.scrollTop = top - (t.clientY - y);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        if (event.touches.length === 1) {
          pinchRef.current.pinching = false;
        }
        return;
      }
      pinchRef.current.pinching = false;
      touchPanRef.current.active = false;
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
      event.preventDefault();
      if (!beginScrollDrag(event.clientX, event.clientY)) return;
      dragRef.current.pointerId = event.pointerId;
      try {
        frame.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active || event.pointerType === 'touch') return;
      if (
        dragRef.current.pointerId != null &&
        event.pointerId !== dragRef.current.pointerId
      ) {
        return;
      }
      event.preventDefault();
      moveScrollDrag(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (
        dragRef.current.pointerId != null &&
        event.pointerId !== dragRef.current.pointerId
      ) {
        return;
      }
      try {
        if (dragRef.current.pointerId != null) {
          frame.releasePointerCapture(dragRef.current.pointerId);
        }
      } catch {
        /* ignore */
      }
      endScrollDrag();
    };

    const onDblClick = (event: MouseEvent) => {
      event.preventDefault();
      if (scaleRef.current > ZOOM_EPSILON) resetZoom();
      else applyScale(2);
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
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
    frame.addEventListener('lostpointercapture', onPointerUp);
    frame.addEventListener('dblclick', onDblClick);
    frame.addEventListener('dragstart', onDragStart);

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
      frame.removeEventListener('lostpointercapture', onPointerUp);
      frame.removeEventListener('dblclick', onDblClick);
      frame.removeEventListener('dragstart', onDragStart);
    };
  }, [applyScale, findScrollParent, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className={`pdf-page-pinch-frame shrink-0 select-none rounded-sm bg-transparent shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] transition-[width,height] duration-150 ease-out ${zoomed ? 'overflow-visible' : 'overflow-hidden'}`}
      data-pdf-zoomed={zoomed ? 'true' : 'false'}
      style={{
        width: `${frameW}px`,
        height: `${frameH}px`,
        // When zoomed, own all gestures so 2D pan is not stolen by page snap / parents.
        touchAction: zoomed ? 'none' : 'pan-y',
        cursor: zoomed ? 'grab' : 'zoom-in',
        zIndex: zoomed ? 5 : 1,
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      aria-label="PDF page — pinch or Ctrl+scroll to zoom, drag to pan"
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
