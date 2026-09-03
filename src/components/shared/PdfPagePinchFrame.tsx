import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 3.25;
const ZOOM_EPSILON = 1.02;
const ZOOM_STEP = 0.28;
const DOUBLE_TAP_MS = 320;

function clampScale(next: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
}

export type PdfPagePinchFrameHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number, clientX?: number, clientY?: number) => void;
  resetZoom: () => void;
  getScale: () => number;
  panBy: (dx: number, dy: number) => void;
};

type ZoomOrigin = { clientX: number; clientY: number };

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
  const innerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ pageWidth, pageHeight });
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
  const clickZoomTimerRef = useRef<number | null>(null);
  sizeRef.current = { pageWidth, pageHeight };

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

  const viewportOrigin = useCallback((): ZoomOrigin | undefined => {
    const scrollEl = findScrollParent();
    if (!scrollEl) return undefined;
    const rect = scrollEl.getBoundingClientRect();
    return {
      clientX: rect.left + scrollEl.clientWidth / 2,
      clientY: rect.top + scrollEl.clientHeight / 2,
    };
  }, [findScrollParent]);

  const paintScale = useCallback((clamped: number) => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    const { pageWidth: pw, pageHeight: ph } = sizeRef.current;
    if (!frame || !inner) return;
    const zooming = clamped > ZOOM_EPSILON;
    frame.style.width = `${Math.max(1, Math.round(pw * clamped))}px`;
    frame.style.height = `${Math.max(1, Math.round(ph * clamped))}px`;
    frame.style.overflow = zooming ? 'visible' : 'hidden';
    frame.style.cursor = zooming ? 'grab' : 'zoom-in';
    frame.style.zIndex = zooming ? '5' : '1';
    frame.style.touchAction = zooming ? 'none' : 'pan-y';
    frame.dataset.pdfZoomed = zooming ? 'true' : 'false';
    inner.style.transform = `scale(${clamped})`;
  }, []);

  const applyScale = useCallback(
    (next: number, origin?: ZoomOrigin) => {
      const clamped = clampScale(next);
      const prev = scaleRef.current;
      if (Math.abs(clamped - prev) < 0.0008) return;

      const scrollEl = findScrollParent();
      const frame = frameRef.current;
      const point = origin ?? viewportOrigin();
      let localX = 0;
      let localY = 0;
      if (frame && prev > 0 && point) {
        const frameRect = frame.getBoundingClientRect();
        localX = (point.clientX - frameRect.left) / prev;
        localY = (point.clientY - frameRect.top) / prev;
      }

      scaleRef.current = clamped;
      paintScale(clamped);

      if (scrollEl && frame && point && prev > 0) {
        const frameRect = frame.getBoundingClientRect();
        scrollEl.scrollLeft += frameRect.left + localX * clamped - point.clientX;
        scrollEl.scrollTop += frameRect.top + localY * clamped - point.clientY;
      }

      onZoomChange(clamped > ZOOM_EPSILON, clamped);
    },
    [onZoomChange, findScrollParent, viewportOrigin, paintScale],
  );

  useLayoutEffect(() => {
    paintScale(scaleRef.current);
  }, [pageWidth, pageHeight, paintScale]);

  const resetZoom = useCallback(() => {
    applyScale(MIN_SCALE, viewportOrigin());
  }, [applyScale, viewportOrigin]);

  const zoomIn = useCallback(() => {
    applyScale(scaleRef.current + ZOOM_STEP, viewportOrigin());
  }, [applyScale, viewportOrigin]);

  const zoomOut = useCallback(() => {
    const next = scaleRef.current - ZOOM_STEP;
    if (next <= ZOOM_EPSILON) resetZoom();
    else applyScale(next, viewportOrigin());
  }, [applyScale, resetZoom, viewportOrigin]);

  const zoomTo = useCallback(
    (next: number, clientX?: number, clientY?: number) => {
      const origin =
        clientX != null && clientY != null ? { clientX, clientY } : viewportOrigin();
      if (next <= ZOOM_EPSILON) applyScale(MIN_SCALE, origin);
      else applyScale(next, origin);
    },
    [applyScale, viewportOrigin],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const scrollEl = findScrollParent();
      if (!scrollEl) return;
      scrollEl.scrollBy({ left: dx, top: dy, behavior: 'auto' });
    },
    [findScrollParent],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      zoomTo,
      resetZoom,
      getScale: () => scaleRef.current,
      panBy,
    }),
    [zoomIn, zoomOut, zoomTo, resetZoom, panBy],
  );

  // Keep the user's zoom when the fitted page size updates (dialog layout /
  // fullscreen). Resetting here made +/- look broken: zoom jumped back to 100%.

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
        const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        applyScale(startScale * (touchDistance(event.touches) / startDistance), {
          clientX: midX,
          clientY: midY,
        });
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
        else applyScale(2, { clientX: event.changedTouches[0]?.clientX ?? 0, clientY: event.changedTouches[0]?.clientY ?? 0 });
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
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
      if (clickZoomTimerRef.current != null) {
        window.clearTimeout(clickZoomTimerRef.current);
        clickZoomTimerRef.current = null;
      }
      if (scaleRef.current > ZOOM_EPSILON) resetZoom();
      else applyScale(2, { clientX: event.clientX, clientY: event.clientY });
    };

    const onClick = (event: MouseEvent) => {
      // The page advertises a zoom-in cursor at fit size, so a normal click
      // should zoom. Double-click remains the quick zoom/reset gesture.
      if (scaleRef.current > ZOOM_EPSILON || event.detail > 1) return;
      event.preventDefault();
      if (clickZoomTimerRef.current != null) window.clearTimeout(clickZoomTimerRef.current);
      clickZoomTimerRef.current = window.setTimeout(() => {
        clickZoomTimerRef.current = null;
        if (scaleRef.current <= ZOOM_EPSILON) {
          applyScale(1 + ZOOM_STEP, { clientX: event.clientX, clientY: event.clientY });
        }
      }, DOUBLE_TAP_MS);
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    frame.addEventListener('touchstart', onTouchStart, { passive: false });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd, { passive: true });
    frame.addEventListener('touchcancel', onTouchEnd, { passive: true });
    frame.addEventListener('pointerdown', onPointerDown);
    frame.addEventListener('pointermove', onPointerMove);
    frame.addEventListener('pointerup', onPointerUp);
    frame.addEventListener('pointercancel', onPointerUp);
    frame.addEventListener('lostpointercapture', onPointerUp);
    frame.addEventListener('dblclick', onDblClick);
    frame.addEventListener('click', onClick);
    frame.addEventListener('dragstart', onDragStart);

    return () => {
      if (clickZoomTimerRef.current != null) {
        window.clearTimeout(clickZoomTimerRef.current);
        clickZoomTimerRef.current = null;
      }
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchEnd);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', onPointerUp);
      frame.removeEventListener('pointercancel', onPointerUp);
      frame.removeEventListener('lostpointercapture', onPointerUp);
      frame.removeEventListener('dblclick', onDblClick);
      frame.removeEventListener('click', onClick);
      frame.removeEventListener('dragstart', onDragStart);
    };
  }, [applyScale, findScrollParent, onZoomChange, resetZoom]);

  useEffect(() => () => onZoomChange(false), [onZoomChange]);

  return (
    <div
      ref={frameRef}
      className="pdf-page-pinch-frame shrink-0 select-none overflow-hidden rounded-sm bg-transparent shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)]"
      data-pdf-zoomed="false"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      aria-label="PDF page — pinch or Ctrl+scroll to zoom, drag to pan"
      title="Ctrl+scroll or +/- to zoom · drag to pan when zoomed"
    >
      <div
        ref={innerRef}
        className="will-change-transform"
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default PdfPagePinchFrame;
