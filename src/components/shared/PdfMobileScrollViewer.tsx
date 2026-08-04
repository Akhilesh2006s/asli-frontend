import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  type RefObject,
} from 'react';
import type * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PdfPagePinchFrame from '@/components/shared/PdfPagePinchFrame';
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

async function renderPdfPageCanvas(
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
  containerWidth: number,
  canvas: HTMLCanvasElement,
): Promise<{ cssWidth: number; cssHeight: number } | null> {
  const page = await pdf.getPage(pageNum);
  // Use the page's own rotation once (do not pass rotation again — that double-flips).
  const base = page.getViewport({ scale: 1 });
  const cssScale = getFitWidthScale(containerWidth, base.width);
  const cssWidth = Math.floor(base.width * cssScale);
  const cssHeight = Math.floor(base.height * cssScale);
  if (cssWidth < 1 || cssHeight < 1) return null;

  const baseOutputScale = getSafeOutputScale(cssScale, base.width, base.height);
  const scaleAttempts = prefersDisableWorker()
    ? [baseOutputScale, baseOutputScale * 0.75, cssScale, cssScale * 0.65]
    : [baseOutputScale, baseOutputScale * 0.8, cssScale];

  for (const outputScale of scaleAttempts) {
    const viewport = page.getViewport({ scale: outputScale });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    // Match CSS box to the true page aspect immediately — avoids a squashed/“flipped”
    // first paint while waiting for React state to catch up.
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) continue;
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
  width,
  height,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
}) {
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [canvasRef, width, height]);

  return <canvas ref={canvasRef} className="block" style={{ display: 'block' }} />;
}

type PdfMobilePageProps = {
  pageNum: number;
  pdf: pdfjs.PDFDocumentProxy;
  containerWidth: number;
  defaultMinHeight: number;
  scrollRoot: RefObject<HTMLDivElement | null>;
  forceRender?: boolean;
  onZoomChange: (pageNum: number, zoomed: boolean) => void;
};

function PdfMobilePage({
  pageNum,
  pdf,
  containerWidth,
  defaultMinHeight,
  scrollRoot,
  forceRender = false,
  onZoomChange,
}: PdfMobilePageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(pageNum === 1 || forceRender);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const pageHeight = dims.h > 0 ? dims.h : defaultMinHeight;
  const pageWidth = dims.w > 0 ? dims.w : Math.max(containerWidth - 8, 280);
  const baseWidth = dims.w > 0 ? dims.w : pageWidth;
  const baseHeight = dims.h > 0 ? dims.h : pageHeight;

  const handlePageZoom = useCallback(
    (zoomed: boolean) => onZoomChange(pageNum, zoomed),
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
    };
  }, [onZoomChange, pageNum]);

  useEffect(() => {
    if (!shouldRender || renderedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    void (async () => {
      const result = await renderPdfPageCanvas(pdf, pageNum, containerWidth, canvas);
      if (cancelled || !result) return;
      renderedRef.current = true;
      setDims({ w: result.cssWidth, h: result.cssHeight });
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldRender, pdf, pageNum, containerWidth]);

  return (
    <div
      ref={slotRef}
      data-page={pageNum}
      className="pdf-page-slot flex w-full shrink-0 justify-center px-3 py-3 sm:px-4 sm:py-4"
      style={{ minHeight: `${pageHeight + 24}px` }}
    >
      <PdfPagePinchFrame
        pageWidth={baseWidth}
        pageHeight={baseHeight}
        onZoomChange={handlePageZoom}
      >
        {({ width, height }) => (
          <PdfPageCanvas canvasRef={canvasRef} width={width} height={height} />
        )}
      </PdfPagePinchFrame>
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
    },
    ref,
  ) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomedPagesRef = useRef(new Set<number>());
  const restoredRef = useRef(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [currentPage, setCurrentPage] = useState(() =>
    storageKey ? readStoredPdfPage(storageKey) : 1,
  );

  const handleZoomChange = useCallback((pageNum: number, zoomed: boolean) => {
    if (zoomed) zoomedPagesRef.current.add(pageNum);
    else zoomedPagesRef.current.delete(pageNum);
    setScrollLocked(zoomedPagesRef.current.size > 0);
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
      const slot = host.querySelector(`[data-page="${targetPage}"]`) as HTMLElement | null;
      if (slot) {
        slot.scrollIntoView({ block: 'start', behavior: 'auto' });
        restoredRef.current = true;
        return;
      }
      if (attempts < 40) {
        window.setTimeout(jump, 50);
      } else {
        restoredRef.current = true;
      }
    };
    // Wait a frame so page 1 layout exists, then jump.
    window.requestAnimationFrame(jump);
  }, [storageKey, totalPages, pdf]);

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

  const goToPage = useCallback(
    (page: number) => {
      const host = scrollRef.current;
      const clamped = Math.min(Math.max(1, page), Math.max(1, totalPages));
      persistPage(clamped);
      const slot = host?.querySelector(`[data-page="${clamped}"]`) as HTMLElement | null;
      slot?.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
        // When a page is pinch-zoomed, prefer scrolling that page's frame.
        const zoomedFrame = host.querySelector(
          '.pdf-page-pinch-frame[data-pdf-zoomed="true"]',
        ) as HTMLElement | null;
        const target =
          zoomedFrame &&
          (zoomedFrame.scrollHeight > zoomedFrame.clientHeight + 1 ||
            zoomedFrame.scrollWidth > zoomedFrame.clientWidth + 1)
            ? zoomedFrame
            : host;
        target.scrollBy({ left: dx, top: dy, behavior: 'auto' });
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
    }),
    [goToPage, currentPage],
  );

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={scrollRef}
        className={`h-full w-full touch-manipulation overscroll-y-contain ${
          scrollLocked
            ? 'overflow-y-hidden overflow-x-hidden'
            : 'overflow-y-auto overflow-x-auto'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
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
              forceRender={forceRender}
              onZoomChange={handleZoomChange}
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
