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

function prefersDisableWorker(): boolean {
  return isMobileUserAgent() || isIosOrIpadosBrowser();
}

type PdfSource =
  | { mode: 'url'; url: string }
  | { mode: 'data'; bytes: Uint8Array };

function buildPdfDocumentInit(
  source: PdfSource,
): Parameters<typeof pdfjs.getDocument>[0] {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';
  const base: Record<string, unknown> = {
    useSystemFonts: true,
    disableWorker: prefersDisableWorker(),
    isEvalSupported: false,
  };

  if (source.mode === 'url') {
    const isApiProxy = /\/api\/student\/content-preview/i.test(source.url);
    return {
      ...base,
      url: source.url,
      withCredentials: true,
      httpHeaders:
        token && !isApiProxy && !source.url.includes('token=')
          ? { Authorization: `Bearer ${token}` }
          : undefined,
    };
  }

  return { ...base, data: source.bytes };
}

/** Touch browsers: skip the worker entirely (worker .mjs often fails on mobile). */
async function openPdfDocument(source: PdfSource): Promise<pdfjs.PDFDocumentProxy> {
  const init = buildPdfDocumentInit(source);
  if (!prefersDisableWorker()) {
    try {
      return await pdfjs.getDocument({ ...init, disableWorker: false }).promise;
    } catch {
      return pdfjs.getDocument({ ...init, disableWorker: true }).promise;
    }
  }
  return pdfjs.getDocument(init).promise;
}

function capRenderScale(
  pageWidth: number,
  pageHeight: number,
  scale: number,
): number {
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
  const scale = cssScale * cappedDpr;
  return capRenderScale(pageWidth, pageHeight, scale);
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

/** PDF iframes on Android/iOS show only filename + "Open" — never use as inline fallback. */
function canUseInlinePdfIframe(): boolean {
  return !isMobileUserAgent() && !isIosOrIpadosBrowser();
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

/** Fit one page inside the preview area (single full-screen page). */
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
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [renderingPage, setRenderingPage] = useState(false);
  const [pdfSource, setPdfSource] = useState<PdfSource | null>(null);
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

  const destroyPdfDoc = useCallback(async () => {
    if (!pdfDocRef.current) return;
    await pdfDocRef.current.destroy();
    pdfDocRef.current = null;
  }, []);

  useEffect(() => {
    if (!useCanvasPreview) {
      setLoadingPdf(false);
      setPdfError(null);
      setPdfSource(null);
      setUseIframeFallback(false);
      void destroyPdfDoc();
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      return;
    }

    let cancelled = false;
    setLoadingPdf(true);
    setPdfError(null);
    setPdfSource(null);
    setUseIframeFallback(false);
    if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
    void destroyPdfDoc();

    const trySetPdfSource = async (source: PdfSource) => {
      await destroyPdfDoc();
      const pdf = await openPdfDocument(source);
      if (cancelled) {
        await pdf.destroy();
        return;
      }
      pdfDocRef.current = pdf;
      setPdfSource(source);
      setTotalPages(pdf.numPages);
    };

    const enableIframeFallback = async (sources: PdfSource[]) => {
      if (cancelled) return;

      for (const source of sources) {
        try {
          await trySetPdfSource(source);
          return;
        } catch {
          /* try next source */
        }
      }

      if (!canUseInlinePdfIframe()) {
        if (!cancelled) {
          setPdfError('Could not display this PDF on your device. Open it externally to read.');
        }
        return;
      }

      setUseIframeFallback(true);
      setPdfSource(null);
      if (!cancelled) setTotalPages(500);
    };

    const jsUrl = getPdfJsFetchUrl(fileUrl, title);
    const absolute = normalizeContentFileUrl(fileUrl);
    const urlSources: PdfSource[] = [jsUrl, absolute]
      .filter(Boolean)
      .map((url) => ({ mode: 'url' as const, url }));

    (async () => {
      for (const source of urlSources) {
        if (cancelled) return;
        try {
          await trySetPdfSource(source);
          return;
        } catch {
          /* try streamed URL fallback */
        }
      }

      try {
        const bytes = await fetchPdfBytes(fileUrl, title);
        if (cancelled) return;
        await trySetPdfSource({ mode: 'data', bytes });
      } catch {
        await enableIframeFallback(urlSources);
      }
    })()
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
      void destroyPdfDoc();
    };
  }, [useCanvasPreview, fileUrl, title, destroyPdfDoc]);

  useEffect(() => {
    if (!useCanvasPreview || useIframeFallback || !pdfSource || pdfError || !canvasHostRef.current) return;
    if (containerSize.width < 80 || containerSize.height < 80) return;
    if (totalPages < 1 || !pdfDocRef.current) return;

    const pageNum = Math.min(Math.max(currentPage, 1), totalPages);
    const host = canvasHostRef.current;
    const pdf = pdfDocRef.current;
    let cancelled = false;

    host.innerHTML = '';
    setRenderingPage(true);

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const cssScale = getFitContainScale(
          containerSize.width,
          containerSize.height,
          base.width,
          base.height,
        );
        const cssWidth = Math.floor(base.width * cssScale);
        const cssHeight = Math.floor(base.height * cssScale);
        const baseOutputScale = getSafeOutputScale(cssScale, base.width, base.height);
        const scaleAttempts = prefersDisableWorker()
          ? [baseOutputScale, baseOutputScale * 0.75, cssScale, cssScale * 0.65]
          : [baseOutputScale, baseOutputScale * 0.8, cssScale];

        let rendered = false;
        for (const outputScale of scaleAttempts) {
          if (cancelled || rendered) break;
          const viewport = page.getViewport({ scale: outputScale });
          const canvas = document.createElement('canvas');
          canvas.className = 'block max-h-full max-w-full rounded-sm bg-white shadow-md';
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          canvas.style.maxWidth = '100%';
          canvas.style.maxHeight = '100%';
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) continue;
          try {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            if (!cancelled) {
              host.appendChild(canvas);
              rendered = true;
            }
          } catch {
            /* retry at lower scale */
          }
        }

        if (!rendered && !cancelled) {
          throw new Error('PAGE_RENDER_FAILED');
        }
      } finally {
        if (!cancelled) setRenderingPage(false);
      }
    })().catch(() => {
      if (cancelled) return;
      setRenderingPage(false);
      if (canUseInlinePdfIframe()) {
        setUseIframeFallback(true);
        return;
      }
      setPdfError('Could not display this page on your device. Open the PDF externally to read.');
    });

    return () => {
      cancelled = true;
      host.innerHTML = '';
    };
  }, [
    useCanvasPreview,
    useIframeFallback,
    pdfSource,
    pdfError,
    containerSize,
    currentPage,
    totalPages,
  ]);

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

  /** Mobile / tablet — one page at a time, fitted to the screen. */
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
          {loadingPdf || (!useIframeFallback && pdfSource && totalPages < 1 && !pdfError) ? (
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
