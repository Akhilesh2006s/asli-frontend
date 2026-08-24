import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type RefObject,
} from 'react';
import type * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PdfPagePinchFrame, {
  type PdfPagePinchFrameHandle,
} from '@/components/shared/PdfPagePinchFrame';
import { Button } from '@/components/ui/button';

function isIosOrIpadosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function prefersDisableWorker(): boolean {
  return isMobileUserAgent() || isIosOrIpadosBrowser();
}

function capRenderScale(pageWidth: number, pageHeight: number, scale: number): number {
  const mobile = prefersDisableWorker();
  const maxDim = mobile ? 1280 : 4096;
  const maxPixels = mobile ? 1_200_000 : 6_000_000;
  let w = pageWidth * scale;
  let h = pageHeight * scale;
  const dimLimit = maxDim / Math.max(pageWidth, pageHeight, 1);
  if (scale > dimLimit) scale = dimLimit;
  w = pageWidth * scale;
  h = pageHeight * scale;
  const pixelCount = w * h;
  if (pixelCount > maxPixels) {
    scale *= Math.sqrt(maxPixels / pixelCount);
  }
  return scale;
}

function getSafeOutputScale(
  cssScale: number,
  pageWidth: number,
  pageHeight: number,
): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cappedDpr = prefersDisableWorker() ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
  return capRenderScale(pageWidth, pageHeight, cssScale * cappedDpr);
}

function getFitWidthScale(containerWidth: number, pageWidth: number): number {
  const pad = 24;
  const availW = Math.max(0, containerWidth - pad);
  if (availW <= 0 || pageWidth <= 0) return 1;
  return availW / pageWidth;
}

/** Fit page inside width and optional max height (book / fullscreen — no clipping). */
function getPageCssScale(
  containerWidth: number,
  pageWidth: number,
  pageHeight: number,
  maxHeight?: number,
): number {
  const widthScale = getFitWidthScale(containerWidth, pageWidth);
  if (!maxHeight || maxHeight < 80 || pageHeight <= 0) return widthScale;
  const heightScale = maxHeight / pageHeight;
  return Math.min(widthScale, heightScale);
}

export function pdfPageStorageKey(fileUrl: string): string {
  return `asli:pdf-page:${String(fileUrl || '').trim()}`;
}

export function readStoredPdfPage(fileUrl: string): number {
  if (!fileUrl || typeof window === 'undefined') return 1;
  try {
    const stored = Number(window.sessionStorage.getItem(pdfPageStorageKey(fileUrl)));
    return Number.isFinite(stored) && stored >= 1 ? Math.floor(stored) : 1;
  } catch {
    return 1;
  }
}

export function writeStoredPdfPage(fileUrl: string, page: number): void {
  if (!fileUrl || typeof window === 'undefined') return;
  const n = Math.floor(page);
  if (!Number.isFinite(n) || n < 1) return;
  try {
    window.sessionStorage.setItem(pdfPageStorageKey(fileUrl), String(n));
  } catch {
    /* private mode */
  }
}

/** Jump inside the PDF scroller. Avoid scrollIntoView — it moves the dialog, not the pages. */
export function scrollPdfHostToPage(
  host: HTMLElement | null | undefined,
  page: number,
  totalPages: number,
): boolean {
  if (!host) return false;
  const clamped = Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages || 1));
  const slot = host.querySelector(`[data-page="${clamped}"]`) as HTMLElement | null;
  const pageH = Math.max(1, host.clientHeight);
  const top =
    slot && slot.offsetHeight > 8 ? slot.offsetTop : (clamped - 1) * pageH;
  const prevSnap = host.style.scrollSnapType;
  host.style.scrollSnapType = 'none';
  host.scrollTo({ top, left: 0, behavior: 'auto' });
  window.requestAnimationFrame(() => {
    host.style.scrollSnapType = prevSnap;
  });
  return Boolean(slot) || clamped === 1;
}

function getPageViewport(page: pdfjs.PDFPageProxy, scale: number) {
  // Honor embedded page rotation so landscape / sideways pages render upright.
  return page.getViewport({ scale, rotation: page.rotate ?? 0 });
}

async function measurePdfPageCssSize(
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
  containerWidth: number,
  maxHeight?: number,
): Promise<{ cssWidth: number; cssHeight: number } | null> {
  const page = await pdf.getPage(pageNum);
  const base = getPageViewport(page, 1);
  // Small inset so page edges never kiss the frame (premium fit, no clip).
  const fitWidth = Math.max(200, containerWidth - 8);
  const fitHeight = maxHeight != null ? Math.max(120, maxHeight - 8) : undefined;
  const cssScale = getPageCssScale(fitWidth, base.width, base.height, fitHeight);
  const cssWidth = Math.max(1, Math.floor(base.width * cssScale));
  const cssHeight = Math.max(1, Math.floor(base.height * cssScale));
  return { cssWidth, cssHeight };
}

async function renderPdfPageCanvas(
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
  containerWidth: number,
  canvas: HTMLCanvasElement,
  maxHeight?: number,
): Promise<{ cssWidth: number; cssHeight: number } | null> {
  const page = await pdf.getPage(pageNum);
  const base = getPageViewport(page, 1);
  const fitWidth = Math.max(200, containerWidth - 8);
  const fitHeight = maxHeight != null ? Math.max(120, maxHeight - 8) : undefined;
  const cssScale = getPageCssScale(fitWidth, base.width, base.height, fitHeight);
  const cssWidth = Math.max(1, Math.floor(base.width * cssScale));
  const cssHeight = Math.max(1, Math.floor(base.height * cssScale));

  const baseOutputScale = getSafeOutputScale(cssScale, base.width, base.height);
  const scaleAttempts = prefersDisableWorker()
    ? [baseOutputScale, baseOutputScale * 0.75, cssScale, cssScale * 0.65]
    : [baseOutputScale, baseOutputScale * 0.8, cssScale];

  for (const outputScale of scaleAttempts) {
    const viewport = getPageViewport(page, outputScale);
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      return { cssWidth, cssHeight };
    } catch {
      /* retry at lower scale */
    }
  }
  return null;
}

function PdfPageCanvas({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none block max-w-none"
      draggable={false}
      style={{ display: 'block' }}
    />
  );
}

type PdfMobilePageProps = {
  pageNum: number;
  pdf: pdfjs.PDFDocumentProxy;
  containerWidth: number;
  defaultMinHeight: number;
  scrollRoot: RefObject<HTMLDivElement | null>;
  viewportHeight?: number;
  fillViewport?: boolean;
  forceRender?: boolean;
  onZoomChange: (pageNum: number, zoomed: boolean, scale?: number) => void;
  registerZoomHandle?: (pageNum: number, handle: PdfPagePinchFrameHandle | null) => void;
};

function PdfMobilePage({
  pageNum,
  pdf,
  containerWidth,
  defaultMinHeight,
  scrollRoot,
  viewportHeight = 0,
  fillViewport = false,
  forceRender = false,
  onZoomChange,
  registerZoomHandle,
}: PdfMobilePageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinchRef = useRef<PdfPagePinchFrameHandle | null>(null);
  const renderedRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(pageNum === 1 || forceRender);
  const [layoutReady, setLayoutReady] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [pageZoomed, setPageZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const pageHeight = dims.h > 0 ? dims.h : defaultMinHeight;
  const pageWidth = dims.w > 0 ? dims.w : Math.max(containerWidth - 8, 280);
  const baseWidth = dims.w > 0 ? dims.w : pageWidth;
  const baseHeight = dims.h > 0 ? dims.h : pageHeight;
  const maxPageHeight =
    fillViewport && viewportHeight > 0 ? Math.max(120, viewportHeight - 32) : undefined;
  const layoutKey = `${containerWidth}|${maxPageHeight ?? 0}`;

  const handlePageZoom = useCallback(
    (zoomed: boolean, scale?: number) => {
      const nextScale = zoomed ? Math.max(1, scale ?? pinchRef.current?.getScale() ?? 1) : 1;
      setPageZoomed(zoomed);
      setZoomScale(nextScale);
      onZoomChange(pageNum, zoomed, nextScale);
    },
    [onZoomChange, pageNum],
  );

  useEffect(() => {
    if (forceRender) setShouldRender(true);
  }, [forceRender]);

  useEffect(() => {
    const el = slotRef.current;
    const root = scrollRoot.current;
    if (!el || shouldRender || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setShouldRender(true);
        }
      },
      { root, rootMargin: '240px 0px', threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, scrollRoot]);

  useEffect(() => {
    return () => {
      onZoomChange(pageNum, false);
      registerZoomHandle?.(pageNum, null);
    };
  }, [onZoomChange, pageNum, registerZoomHandle]);

  const setPinchRef = useCallback(
    (handle: PdfPagePinchFrameHandle | null) => {
      pinchRef.current = handle;
      registerZoomHandle?.(pageNum, handle);
    },
    [pageNum, registerZoomHandle],
  );
  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;
    renderedRef.current = false;
    setLayoutReady(false);
    void (async () => {
      const measured = await measurePdfPageCssSize(
        pdf,
        pageNum,
        containerWidth,
        maxPageHeight,
      );
      if (cancelled || !measured) return;
      setDims({ w: measured.cssWidth, h: measured.cssHeight });
      setLayoutReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldRender, pdf, pageNum, layoutKey, maxPageHeight]);

  useEffect(() => {
    if (!layoutReady || renderedRef.current) return;

    let cancelled = false;
    let attempts = 0;

    const paint = () => {
      if (cancelled || renderedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        // Canvas mounts one frame after layoutReady — retry briefly.
        if (attempts < 20) {
          attempts += 1;
          window.requestAnimationFrame(paint);
        }
        return;
      }

      void (async () => {
        const result = await renderPdfPageCanvas(
          pdf,
          pageNum,
          containerWidth,
          canvas,
          maxPageHeight,
        );
        if (cancelled || !result) return;
        renderedRef.current = true;
        setDims({ w: result.cssWidth, h: result.cssHeight });
      })();
    };

    paint();

    return () => {
      cancelled = true;
    };
  }, [layoutReady, pdf, pageNum, layoutKey, maxPageHeight, containerWidth]);

  // When zoomed, grow the slot so the page can expand onto the screen (not clip in a fixed box).
  const scaledH = Math.ceil(baseHeight * zoomScale);
  const scaledW = Math.ceil(baseWidth * zoomScale);
  const slotStyle =
    pageZoomed
      ? {
          minHeight: `${Math.max(scaledH + 24, viewportHeight || 0)}px`,
          minWidth: `${Math.max(scaledW + 24, containerWidth)}px`,
        }
      : fillViewport && viewportHeight > 0
        ? { height: `${viewportHeight}px`, minHeight: `${viewportHeight}px` }
        : { minHeight: `${pageHeight + 24}px` };

  return (
    <div
      ref={slotRef}
      data-page={pageNum}
      className={`pdf-page-slot flex shrink-0 snap-start snap-always px-1 py-2 sm:px-2 sm:py-3${
        pageZoomed
          ? ' w-max min-w-full items-start justify-start'
          : ` w-full justify-center${fillViewport ? ' items-center' : ''}`
      }`}
      style={slotStyle}
    >
      {layoutReady ? (
        <PdfPagePinchFrame
          ref={setPinchRef}
          pageWidth={baseWidth}
          pageHeight={baseHeight}
          onZoomChange={handlePageZoom}
        >
          <PdfPageCanvas canvasRef={canvasRef} />
        </PdfPagePinchFrame>
      ) : (
        <div
          className="rounded-sm bg-white shadow-md animate-pulse"
          style={{ width: `${baseWidth}px`, height: `${baseHeight}px` }}
          aria-hidden
        />
      )}
    </div>
  );
}

export type PdfMobileScrollViewerHandle = {
  goToPage: (page: number) => void;
  getPage: () => number;
  /** Scroll inside the textbook canvas (not the page behind the modal). */
  scrollBy: (dx: number, dy: number) => void;
  /** Jump scroll position within the canvas. */
  scrollTo: (opts: { top?: number; left?: number; behavior?: ScrollBehavior }) => void;
  getScrollElement: () => HTMLDivElement | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getZoomScale: () => number;
};

type PdfMobileScrollViewerProps = {
  pdf: pdfjs.PDFDocumentProxy;
  totalPages: number;
  containerWidth: number;
  defaultPageHeight?: number;
  className?: string;
  /** Absolute file URL — used as sessionStorage key for the current page. */
  storageKey?: string;
  /**
   * Floating overlay on the page (legacy). Prefer `false` and render controls
   * outside the page so nothing sits on top of the textbook.
   */
  showPageHud?: boolean;
  /** Fires when the visible page changes (for external page controls). */
  onPageChange?: (page: number, totalPages: number) => void;
  /** Book mode: each page slot fills the reader height so the next page does not peek in. */
  fillViewport?: boolean;
};

const PdfMobileScrollViewer = forwardRef<PdfMobileScrollViewerHandle, PdfMobileScrollViewerProps>(
  function PdfMobileScrollViewer(
    {
      pdf,
      totalPages,
      containerWidth,
      defaultPageHeight = 280,
      className = '',
      storageKey = '',
      showPageHud = false,
      onPageChange,
      fillViewport = false,
    },
    ref,
  ) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomedPagesRef = useRef(new Set<number>());
  const zoomHandlesRef = useRef(new Map<number, PdfPagePinchFrameHandle>());
  const restoredRef = useRef(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [anyZoomed, setAnyZoomed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [currentPage, setCurrentPage] = useState(() =>
    storageKey ? readStoredPdfPage(storageKey) : 1,
  );

  const registerZoomHandle = useCallback(
    (pageNum: number, handle: PdfPagePinchFrameHandle | null) => {
      if (handle) zoomHandlesRef.current.set(pageNum, handle);
      else zoomHandlesRef.current.delete(pageNum);
    },
    [],
  );

  const getActiveZoomHandle = useCallback(() => {
    return (
      zoomHandlesRef.current.get(currentPage) ||
      zoomHandlesRef.current.values().next().value ||
      null
    );
  }, [currentPage]);

  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;
    const update = () => setViewportHeight(host.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, [totalPages, pdf]);

  const handleZoomChange = useCallback((pageNum: number, zoomed: boolean, _scale?: number) => {
    if (zoomed) zoomedPagesRef.current.add(pageNum);
    else zoomedPagesRef.current.delete(pageNum);
    setAnyZoomed(zoomedPagesRef.current.size > 0);
    // Keep parent scroll enabled while zoomed so the enlarged page can fill / pan the screen.
    setScrollLocked(false);
  }, []);

  const persistPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages));
      setCurrentPage(clamped);
      if (storageKey) writeStoredPdfPage(storageKey, clamped);
      onPageChange?.(clamped, totalPages);
    },
    [storageKey, totalPages, onPageChange],
  );

  // Notify parent of initial / restored page once.
  useEffect(() => {
    if (totalPages < 1) return;
    onPageChange?.(currentPage, totalPages);
    // Only when doc/page count changes — avoid loops on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/doc sync
  }, [totalPages, pdf]);

  // Restore scroll position after slots mount (refresh / reopen).
  useEffect(() => {
    if (restoredRef.current || !storageKey || totalPages < 1) return;
    const host = scrollRef.current;
    if (!host) return;
    const targetPage = Math.min(readStoredPdfPage(storageKey), totalPages);
    setCurrentPage(targetPage);
    if (targetPage <= 1) {
      restoredRef.current = true;
      host.scrollTop = 0;
      return;
    }

    let attempts = 0;
    const jump = () => {
      attempts += 1;
      if (scrollPdfHostToPage(host, targetPage, totalPages) || attempts >= 40) {
        restoredRef.current = true;
        return;
      }
      window.setTimeout(jump, 50);
    };
    window.requestAnimationFrame(jump);
  }, [storageKey, totalPages, pdf]);

  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      event.stopPropagation();
      const handle =
        zoomHandlesRef.current.get(currentPage) ||
        zoomHandlesRef.current.values().next().value ||
        null;
      if (!handle) return;
      if (event.deltaY < 0) handle.zoomIn();
      else handle.zoomOut();
    };

    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, [currentPage, totalPages, pdf]);

  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;
    let tick = 0;
    const onScroll = () => {
      window.clearTimeout(tick);
      tick = window.setTimeout(() => {
        const slots = Array.from(host.querySelectorAll<HTMLElement>('[data-page]'));
        if (!slots.length) return;
        const mid = host.scrollTop + host.clientHeight * 0.35;
        let best = 1;
        let bestDist = Number.POSITIVE_INFINITY;
        for (const slot of slots) {
          const page = Number(slot.dataset.page);
          if (!Number.isFinite(page)) continue;
          const center = slot.offsetTop + slot.offsetHeight / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = page;
          }
        }
        persistPage(best);
      }, 120);
    };
    host.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(tick);
      host.removeEventListener('scroll', onScroll);
    };
  }, [persistPage]);

  useEffect(() => {
    const host = scrollRef.current;
    if (!host || !anyZoomed) return;

    const drag = {
      active: false,
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      pointerId: -1,
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      // Let the page frame handle its own drag; still allow gray-area pans.
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('.pdf-page-pinch-frame')) return;
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.left = host.scrollLeft;
      drag.top = host.scrollTop;
      drag.pointerId = event.pointerId;
      host.style.cursor = 'grabbing';
      try {
        host.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      host.scrollLeft = drag.left - (event.clientX - drag.x);
      host.scrollTop = drag.top - (event.clientY - drag.y);
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      drag.active = false;
      host.style.cursor = 'grab';
      try {
        host.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    host.style.cursor = 'grab';
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    return () => {
      host.style.cursor = '';
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
    };
  }, [anyZoomed]);

  const goToPage = useCallback(
    (page: number) => {
      const host = scrollRef.current;
      const clamped = Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages));
      persistPage(clamped);
      if (scrollPdfHostToPage(host, clamped, totalPages)) return;
      let attempts = 0;
      const retry = () => {
        attempts += 1;
        if (scrollPdfHostToPage(scrollRef.current, clamped, totalPages) || attempts >= 20) return;
        window.setTimeout(retry, 50);
      };
      window.requestAnimationFrame(retry);
    },
    [persistPage, totalPages],
  );

  useImperativeHandle(
    ref,
    () => ({
      goToPage,
      getPage: () => currentPage,
      scrollBy: (dx: number, dy: number) => {
        const host = scrollRef.current;
        if (!host) return;
        const zoomHandle = getActiveZoomHandle();
        if (zoomHandle && zoomHandle.getScale() > 1.02) {
          zoomHandle.panBy(dx, dy);
          return;
        }
        host.scrollBy({ left: dx, top: dy, behavior: 'auto' });
      },
      scrollTo: (opts) => {
        const host = scrollRef.current;
        if (!host) return;
        host.scrollTo({
          top: opts.top,
          left: opts.left,
          behavior: opts.behavior ?? 'auto',
        });
      },
      getScrollElement: () => scrollRef.current,
      zoomIn: () => getActiveZoomHandle()?.zoomIn(),
      zoomOut: () => getActiveZoomHandle()?.zoomOut(),
      resetZoom: () => getActiveZoomHandle()?.resetZoom(),
      getZoomScale: () => getActiveZoomHandle()?.getScale() ?? 1,
    }),
    [goToPage, currentPage, getActiveZoomHandle],
  );

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={scrollRef}
        className={`pdf-book-scroll h-full w-full touch-manipulation overscroll-y-contain ${
          scrollLocked
            ? 'overflow-hidden'
            : 'overflow-y-auto overflow-x-auto'
        } ${anyZoomed ? '' : 'hide-scrollbar'}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: scrollLocked || anyZoomed ? undefined : 'y mandatory',
        }}
      >
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNum = index + 1;
          const forceRender =
            pageNum === currentPage ||
            pageNum === currentPage - 1 ||
            pageNum === currentPage + 1;
          return (
            <PdfMobilePage
              key={pageNum}
              pageNum={pageNum}
              pdf={pdf}
              containerWidth={containerWidth}
              defaultMinHeight={defaultPageHeight}
              scrollRoot={scrollRef}
              viewportHeight={viewportHeight}
              fillViewport={fillViewport}
              forceRender={forceRender}
              onZoomChange={handleZoomChange}
              registerZoomHandle={registerZoomHandle}
            />
          );
        })}
      </div>

      {showPageHud && totalPages > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3"
          data-pdf-page-hud=""
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-stone-200/90 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 min-w-10 rounded-xl px-0 sm:h-11 sm:min-w-11"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <p className="min-w-[7.5rem] text-center text-sm font-semibold tabular-nums text-stone-800 sm:min-w-[9rem] sm:text-base">
              Page {currentPage} of {totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 min-w-10 rounded-xl px-0 sm:h-11 sm:min-w-11"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default PdfMobileScrollViewer;
