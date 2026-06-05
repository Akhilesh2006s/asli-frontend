import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExternalLink, Loader2 } from 'lucide-react';
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
/** Minimum CSS width per page on phones — keeps textbook text readable (scroll sideways). */
const MOBILE_MIN_PAGE_CSS_PX = 520;

/** Mobile/tablet browsers often show only filename + "Open" inside PDF iframes. */
function shouldUseCanvasPdfPreview(): boolean {
  if (typeof window === 'undefined') return false;
  if (detectDigitalBoard()) return true;
  return window.innerWidth <= COMPACT_VIEWPORT_MAX_PX;
}

function useCanvasPdfPreview(): boolean {
  const [useCanvas, setUseCanvas] = useState(shouldUseCanvasPdfPreview);

  useEffect(() => {
    const update = () => setUseCanvas(shouldUseCanvasPdfPreview());
    update();
    window.addEventListener('resize', update);
    const mq = window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX_PX}px)`);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq.removeEventListener('change', update);
    };
  }, []);

  return useCanvas;
}

function getTargetPageCssWidth(containerWidth: number, compact: boolean): number {
  const padded = Math.max(0, containerWidth - (compact ? 12 : 24));
  if (!compact) return Math.min(padded, 1400);
  return Math.max(MOBILE_MIN_PAGE_CSS_PX, Math.min(padded, 900));
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
  const [pageWidth, setPageWidth] = useState(720);
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
      if (w > 0) setPageWidth(getTargetPageCssWidth(w, true));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [useCanvasPreview]);

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
    if (!useCanvasPreview || !pdfData || pdfError || !canvasHostRef.current) return;
    if (pageWidth < 80) return;

    let cancelled = false;
    const host = canvasHostRef.current;
    host.innerHTML = '';

    (async () => {
      if (cancelled) return;

      const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
      try {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          const base = page.getViewport({ scale: 1 });
          const cssScale = pageWidth / base.width;
          const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
          const viewport = page.getViewport({ scale: cssScale * outputScale });
          const cssWidth = Math.floor(base.width * cssScale);
          const cssHeight = Math.floor(base.height * cssScale);
          const canvas = document.createElement('canvas');
          canvas.className = 'mb-4 max-w-none shadow-md bg-white';
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          host.appendChild(canvas);
        }
      } finally {
        await pdf.destroy();
      }
    })().catch(() => {
      if (!cancelled) {
        setPdfError('Could not render this PDF. The file may be damaged or unsupported on this display.');
      }
    });

    return () => {
      cancelled = true;
      host.innerHTML = '';
    };
  }, [useCanvasPreview, pdfData, pdfError, pageWidth]);

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

      <div
        ref={containerRef}
        className="min-h-[min(55dvh,720px)] flex-1 overflow-y-auto overflow-x-auto rounded-lg border bg-slate-100 p-2 sm:p-3"
      >
        {loadingPdf ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading document…</span>
          </div>
        ) : pdfError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">{pdfError}</p>
            <Button type="button" onClick={openInNewTab}>
              Open PDF externally
            </Button>
          </div>
        ) : (
          <>
            <div ref={canvasHostRef} className="flex flex-col items-start min-w-min mx-auto" />
            <p className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">
              Pinch or scroll sideways if the page is wider than your screen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
