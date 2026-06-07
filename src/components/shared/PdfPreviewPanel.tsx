import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEmbeddedPdfIframeSrc,
  getPdfContentPreviewProxyUrl,
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

/** Same fetch strategy as working PDF thumbnails in subject-content-management. */
async function fetchPdfBytes(fileUrl: string, title?: string): Promise<ArrayBuffer> {
  const absolute = normalizeContentFileUrl(fileUrl);
  const proxy = getPdfContentPreviewProxyUrl(fileUrl, title);
  const candidates = [absolute, proxy].filter(Boolean);
  const seen = new Set<string>();
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';

  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);

    const isStaticUpload = /\/uploads\//i.test(url);
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: isStaticUpload ? 'omit' : 'include',
        headers:
          !isStaticUpload && token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (isPdfBuffer(buf)) return buf;
    } catch {
      /* try next URL */
    }
  }

  throw new Error('PDF_FETCH_FAILED');
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
  if (isIosOrIpadosBrowser()) return true;
  if (isTouchTabletViewport()) return true;
  return window.innerWidth <= COMPACT_VIEWPORT_MAX_PX;
}

function useCanvasPdfPreview(): boolean {
  const [useCanvas, setUseCanvas] = useState(shouldUseCanvasPdfPreview);

  useEffect(() => {
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
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const absoluteUrl = normalizeContentFileUrl(fileUrl);
  const proxyUrl = getPdfContentPreviewProxyUrl(fileUrl, title);
  const iframeSrc = getEmbeddedPdfIframeSrc(absoluteUrl || fileUrl, title);

  const openInNewTab = useCallback(() => {
    const target = proxyUrl || absoluteUrl;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }, [proxyUrl, absoluteUrl]);

  useEffect(() => {
    if (!useCanvasPreview || !containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [useCanvasPreview]);

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(0);
  }, [fileUrl, title]);

  useEffect(() => {
    if (!useCanvasPreview) {
      setLoadingPdf(false);
      setPdfError(null);
      setPdfData(null);
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      return;
    }

    let cancelled = false;
    setLoadingPdf(true);
    setPdfError(null);
    setPdfData(null);
    if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';

    fetchPdfBytes(fileUrl, title)
      .then((buf) => {
        if (!cancelled) setPdfData(buf);
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError('Could not load this PDF here. Try opening it externally or check your connection.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [useCanvasPreview, fileUrl, title]);

  useEffect(() => {
    if (!useCanvasPreview || !pdfData || pdfError) return;

    let cancelled = false;
    pdfjs
      .getDocument({ data: pdfData })
      .promise.then((pdf) => {
        if (!cancelled) setTotalPages(pdf.numPages);
        pdf.destroy();
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError('Could not render this PDF. The file may be damaged or unsupported on this display.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [useCanvasPreview, pdfData, pdfError]);

  useEffect(() => {
    if (!useCanvasPreview || !pdfData || pdfError || !canvasHostRef.current) return;
    if (containerSize.width < 80 || containerSize.height < 80) return;
    if (totalPages < 1) return;

    const pageNum = Math.min(Math.max(currentPage, 1), totalPages);
    let cancelled = false;
    const host = canvasHostRef.current;
    host.innerHTML = '';
    setRenderingPage(true);

    (async () => {
      const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
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
        const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const viewport = page.getViewport({ scale: cssScale * outputScale });
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
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) host.appendChild(canvas);
      } finally {
        await pdf.destroy();
        if (!cancelled) setRenderingPage(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setRenderingPage(false);
        setPdfError('Could not render this PDF. The file may be damaged or unsupported on this display.');
      }
    });

    return () => {
      cancelled = true;
      host.innerHTML = '';
    };
  }, [useCanvasPreview, pdfData, pdfError, containerSize, currentPage, totalPages]);

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

  /** Mobile / tablet — pdf.js canvas (native PDF iframes often show only “Open” on touch browsers). */
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
          className="relative flex min-h-[min(52dvh,680px)] flex-1 items-center justify-center overflow-hidden p-2 sm:p-3"
        >
          {loadingPdf ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading document…</span>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm text-muted-foreground">{pdfError}</p>
              <Button type="button" onClick={openInNewTab}>
                Open PDF externally
              </Button>
            </div>
          ) : (
            <>
              <div
                ref={canvasHostRef}
                className="flex h-full w-full max-w-full items-center justify-center"
              />
              {renderingPage ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/60">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}
            </>
          )}
        </div>

        {!loadingPdf && !pdfError && totalPages > 0 ? (
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
              Page {currentPage} of {totalPages}
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
