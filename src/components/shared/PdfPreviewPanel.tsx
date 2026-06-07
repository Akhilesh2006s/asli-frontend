import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEmbeddedPdfIframeSrc,
  getMobilePdfIframePageSrc,
  getPdfContentPreviewProxyUrl,
  getPdfJsFetchUrl,
  isOurBackendPdfUrl,
  normalizeContentFileUrl,
} from '@/lib/api-config';
import { detectDigitalBoard } from '@/hooks/use-digital-board';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewPanelProps {
  fileUrl: string;
  title?: string;
  className?: string;
  /** When true, always show external open link. Default: only when preview fails. */
  showOpenInNewTab?: boolean;
}

function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const h = new Uint8Array(buffer, 0, 5);
  return (
    h[0] === 0x25 &&
    h[1] === 0x50 &&
    h[2] === 0x44 &&
    h[3] === 0x46 &&
    h[4] === 0x2d
  );
}

function toPdfBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer.slice(0));
}

/** Prefer authenticated proxy so pdf.js gets real bytes (NCERT hosts block browser CORS). */
async function fetchPdfBytes(fileUrl: string, title?: string): Promise<Uint8Array> {
  const absolute = normalizeContentFileUrl(fileUrl);
  const jsProxy = getPdfJsFetchUrl(fileUrl, title);
  const legacyProxy = getPdfContentPreviewProxyUrl(fileUrl, title);
  const candidates = [jsProxy, absolute, legacyProxy].filter(Boolean);
  const seen = new Set<string>();
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';

  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);

    const isStaticUpload = /\/uploads\//i.test(url);
    const isApiProxy = /\/api\/student\/content-preview/i.test(url);
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: isStaticUpload ? 'omit' : 'include',
        headers:
          (isApiProxy || (!isStaticUpload && !isOurBackendPdfUrl(url))) && token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (isPdfBuffer(buf)) return toPdfBytes(buf);
    } catch {
      /* try next URL */
    }
  }

  throw new Error('PDF_FETCH_FAILED');
}

async function openPdfDocument(data: Uint8Array): Promise<pdfjs.PDFDocumentProxy> {
  try {
    return await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  } catch {
    return await pdfjs.getDocument({ data, useSystemFonts: true, disableWorker: true }).promise;
  }
}

function getSafeOutputScale(cssScale: number): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cappedDpr = Math.min(dpr, 2);
  const scale = cssScale * cappedDpr;
  // Avoid mobile GPU/memory failures on large textbook pages.
  const maxScale = 2.5;
  return Math.min(scale, maxScale);
}

const COMPACT_VIEWPORT_MAX_PX = 1023;
const TABLET_VIEWPORT_MAX_PX = 1366;

function isIosOrIpadosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ may report as Mac with touch.
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTouchTabletViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  return coarsePointer && touchPoints >= 2 && window.innerWidth <= TABLET_VIEWPORT_MAX_PX;
}

/** Mobile/tablet browsers often show only filename + "Open" inside PDF iframes. */
function shouldUseCanvasPdfPreview(): boolean {
  if (typeof window === 'undefined') return false;
  if (detectDigitalBoard()) return true;
  // UA check catches phones even in "Desktop site" mode (wide layout + FitH iframe).
  if (isMobileUserAgent()) return true;
  if (isIosOrIpadosBrowser()) return true;
  if (isTouchTabletViewport()) return true;
  return window.innerWidth <= COMPACT_VIEWPORT_MAX_PX;
}

function useCanvasPdfPreview(): boolean {
  const [useCanvas, setUseCanvas] = useState(shouldUseCanvasPdfPreview);

  useLayoutEffect(() => {
    const update = () => setUseCanvas(shouldUseCanvasPdfPreview());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const compactMq = window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX_PX}px)`);
    const tabletMq = window.matchMedia(`(max-width: ${TABLET_VIEWPORT_MAX_PX}px)`);
    const coarseMq = window.matchMedia('(pointer: coarse)');
    compactMq.addEventListener('change', update);
    tabletMq.addEventListener('change', update);
    coarseMq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      compactMq.removeEventListener('change', update);
      tabletMq.removeEventListener('change', update);
      coarseMq.removeEventListener('change', update);
    };
  }, []);

  return useCanvas;
}

function measurePreviewViewport(el: HTMLElement): { width: number; height: number } {
  const rect = el.getBoundingClientRect();
  let width = Math.floor(rect.width || el.clientWidth);
  let height = Math.floor(rect.height || el.clientHeight);

  if (typeof window !== 'undefined') {
    if (height < 80) {
      let parent = el.parentElement;
      while (parent && parent.clientHeight < 80) {
        parent = parent.parentElement;
      }
      if (parent && parent.clientHeight >= 80) {
        height = Math.floor(parent.clientHeight);
      } else {
        height = Math.floor(Math.min(window.innerHeight * 0.72, 760));
      }
    }
    if (width < 80) {
      width = Math.floor(Math.min(window.innerWidth * 0.92, el.parentElement?.clientWidth || window.innerWidth));
    }
  }

  return { width, height };
}

/** Fit one page inside the preview area without clipping (mobile single-page view). */
function getFitContainScale(
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
): number {
  const pad = 8;
  const availW = Math.max(0, containerWidth - pad);
  const availH = Math.max(0, containerHeight - pad);
  if (availW <= 0 || availH <= 0 || pageWidth <= 0 || pageHeight <= 0) return 1;
  return Math.min(availW / pageWidth, availH / pageHeight);
}

export default function PdfPreviewPanel({
  fileUrl,
  title,
  className = '',
  showOpenInNewTab = false,
}: PdfPreviewPanelProps) {
  const useCanvasPreview = useCanvasPdfPreview();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [renderingPage, setRenderingPage] = useState(false);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const absoluteUrl = normalizeContentFileUrl(fileUrl);
  const proxyUrl = getPdfContentPreviewProxyUrl(fileUrl, title);
  const iframeSrc = getEmbeddedPdfIframeSrc(absoluteUrl || fileUrl, title);

  const openInNewTab = useCallback(() => {
    const target = proxyUrl || absoluteUrl;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }, [proxyUrl, absoluteUrl]);

  const updateContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const next = measurePreviewViewport(el);
    setContainerSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, []);

  useLayoutEffect(() => {
    if (!useCanvasPreview) return;
    updateContainerSize();
  }, [useCanvasPreview, updateContainerSize, loadingPdf, totalPages]);

  useEffect(() => {
    if (!useCanvasPreview || !containerRef.current) return;
    const el = containerRef.current;
    updateContainerSize();
    const ro = new ResizeObserver(() => updateContainerSize());
    ro.observe(el);
    window.addEventListener('resize', updateContainerSize);
    window.addEventListener('orientationchange', updateContainerSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateContainerSize);
      window.removeEventListener('orientationchange', updateContainerSize);
    };
  }, [useCanvasPreview, updateContainerSize]);

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(0);
    setUseIframeFallback(false);
    setPdfError(null);
  }, [fileUrl, title]);

  useEffect(() => {
    if (!useCanvasPreview) {
      setLoadingPdf(false);
      setPdfError(null);
      setPdfData(null);
      setUseIframeFallback(false);
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      return;
    }

    let cancelled = false;
    setLoadingPdf(true);
    setPdfError(null);
    setPdfData(null);
    setUseIframeFallback(false);
    if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';

    const enableIframeFallback = async (bytes?: Uint8Array) => {
      if (cancelled) return;
      setUseIframeFallback(true);
      setPdfData(null);
      if (bytes) {
        try {
          const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
          try {
            if (!cancelled) setTotalPages(pdf.numPages);
          } finally {
            await pdf.destroy();
          }
          return;
        } catch {
          /* fall through */
        }
      }
      if (!cancelled) setTotalPages(500);
    };

    fetchPdfBytes(fileUrl, title)
      .then(async (bytes) => {
        if (cancelled) return;
        try {
          const pdf = await openPdfDocument(bytes);
          try {
            if (!cancelled) {
              setPdfData(bytes);
              setTotalPages(pdf.numPages);
            }
          } finally {
            await pdf.destroy();
          }
        } catch {
          await enableIframeFallback(bytes);
        }
      })
      .catch(async () => {
        await enableIframeFallback();
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [useCanvasPreview, fileUrl, title]);

  useEffect(() => {
    if (!useCanvasPreview || useIframeFallback || !pdfData || pdfError || !canvasHostRef.current) return;
    if (containerSize.width < 80 || containerSize.height < 80) return;
    if (totalPages < 1) return;

    const pageNum = Math.min(Math.max(currentPage, 1), totalPages);
    let cancelled = false;
    const host = canvasHostRef.current;
    host.innerHTML = '';
    setRenderingPage(true);

    (async () => {
      const pdf = await openPdfDocument(pdfData);
      try {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const cssScale = getFitContainScale(
          containerSize.width,
          containerSize.height,
          base.width,
          base.height,
        );
        const outputScale = getSafeOutputScale(cssScale);
        const viewport = page.getViewport({ scale: outputScale });
        const cssWidth = Math.floor(base.width * cssScale);
        const cssHeight = Math.floor(base.height * cssScale);
        const canvas = document.createElement('canvas');
        canvas.className = 'block max-h-full max-w-full rounded-sm bg-white shadow-md';
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) host.appendChild(canvas);
      } finally {
        await pdf.destroy();
        if (!cancelled) setRenderingPage(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setRenderingPage(false);
        setUseIframeFallback(true);
      }
    });

    return () => {
      cancelled = true;
      host.innerHTML = '';
    };
  }, [useCanvasPreview, useIframeFallback, pdfData, pdfError, containerSize, currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((page) => Math.max(1, page - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }, [totalPages]);

  if (!absoluteUrl) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">No file URL for preview.</p>
    );
  }

  /** Desktop — embedded PDF iframe. */
  if (!useCanvasPreview) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <iframe
          key={iframeSrc}
          title={title || 'PDF Preview'}
          src={iframeSrc}
          className="h-[min(78vh,900px)] w-full border-0 bg-white rounded-lg"
        />
      </div>
    );
  }

  const mobileIframeSrc = getMobilePdfIframePageSrc(fileUrl, title, currentPage);
  const showPageControls = !loadingPdf && totalPages > 0 && !pdfError;

  /** Mobile / tablet — pdf.js canvas, with iframe fallback when pdf.js cannot run. */
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-2 ${className}`}>
      {showOpenInNewTab ? (
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-slate-100">
        <div
          ref={containerRef}
          className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden p-2 sm:p-3"
        >
          {useIframeFallback ? (
            <iframe
              key={`${mobileIframeSrc}-${currentPage}`}
              title={title || 'PDF Preview'}
              src={mobileIframeSrc}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div
              ref={canvasHostRef}
              className="flex h-full w-full max-h-full max-w-full items-center justify-center overflow-hidden"
            />
          )}
          {loadingPdf || (!useIframeFallback && pdfData && totalPages < 1 && !pdfError) ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-100 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading document…</span>
            </div>
          ) : null}
          {pdfError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center">
              <p className="text-sm text-muted-foreground">{pdfError}</p>
              <Button type="button" onClick={openInNewTab}>
                Open PDF externally
              </Button>
            </div>
          ) : null}
          {renderingPage && !loadingPdf && !pdfError && !useIframeFallback ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/60">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </div>

        {showPageControls ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-2 py-2 sm:px-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1 || renderingPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground sm:text-sm">
              Page {currentPage}
              {totalPages > 1 ? ` of ${totalPages}` : ''}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages || renderingPage}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
