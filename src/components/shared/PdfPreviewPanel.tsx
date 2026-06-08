import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEmbeddedPdfIframeSrc,
  getPdfContentPreviewProxyUrl,
  getPdfJsFetchUrl,
  isOurBackendPdfUrl,
  normalizeContentFileUrl,
  shouldFetchDirectly,
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
function buildPdfFetchCandidates(fileUrl: string, title?: string): string[] {
  const absolute = normalizeContentFileUrl(fileUrl);
  const jsProxy = getPdfJsFetchUrl(fileUrl, title);
  const seen = new Set<string>();
  const candidates: string[] = [];

  const push = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push(url);
  };

  // Proxied bytes — required for NCERT and other cross-origin textbooks.
  push(jsProxy);

  if (absolute && /\/uploads\//i.test(absolute)) {
    push(absolute);
  }

  if (absolute && pdfJsCanLoadUrlDirectly(absolute) && !shouldFetchDirectly(absolute)) {
    push(absolute);
  }

  return candidates;
}

function isContentPreviewProxyUrl(url: string): boolean {
  return /\/api\/student\/content-preview/i.test(url);
}

function pdfFetchCredentials(url: string): RequestCredentials {
  if (/\/uploads\//i.test(url)) return 'omit';
  if (isContentPreviewProxyUrl(url)) return 'omit';
  return 'include';
}

function pdfFetchHeaders(url: string, token: string): HeadersInit | undefined {
  if (isContentPreviewProxyUrl(url) && url.includes('token=')) {
    return undefined;
  }
  if (token && (isContentPreviewProxyUrl(url) || !isOurBackendPdfUrl(url))) {
    return { Authorization: `Bearer ${token}` };
  }
  return undefined;
}

async function fetchPdfBytes(fileUrl: string, title?: string): Promise<Uint8Array> {
  const candidates = buildPdfFetchCandidates(fileUrl, title);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: pdfFetchCredentials(url),
        headers: pdfFetchHeaders(url, token),
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

type PdfDocumentInit = {
  url?: string;
  data?: Uint8Array;
  useSystemFonts?: boolean;
  withCredentials?: boolean;
  httpHeaders?: Record<string, string>;
};

function buildPdfDocumentInit(source: PdfSource): PdfDocumentInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';
  const base: PdfDocumentInit = {
    useSystemFonts: true,
  };

  if (source.mode === 'url') {
    const isApiProxy = isContentPreviewProxyUrl(source.url);
    const tokenInQuery = source.url.includes('token=');
    return {
      ...base,
      url: source.url,
      withCredentials: !isApiProxy && !tokenInQuery,
      httpHeaders:
        token && !tokenInQuery && !isApiProxy
          ? { Authorization: `Bearer ${token}` }
          : undefined,
    };
  }

  return { ...base, data: source.bytes };
}

/** Touch browsers: load bytes on the main thread when URL streaming is unreliable. */
async function openPdfDocument(source: PdfSource): Promise<pdfjs.PDFDocumentProxy> {
  const init = buildPdfDocumentInit(source) as Parameters<typeof pdfjs.getDocument>[0];
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

function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  );
}

function isTouchCapableDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator.maxTouchPoints ?? 0) > 0;
}

function isTouchTabletViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const coarsePointer = isCoarsePointerDevice();
  return coarsePointer && touchPoints >= 1 && window.innerWidth <= TABLET_VIEWPORT_MAX_PX;
}

/** PDF iframes on touch browsers show only filename + "Open" — never use inline. */
function canUseInlinePdfIframe(): boolean {
  if (typeof window === 'undefined') return false;
  if (isMobileUserAgent()) return false;
  if (isIosOrIpadosBrowser()) return false;
  if (isTouchTabletViewport()) return false;
  if (isCoarsePointerDevice() && isTouchCapableDevice()) return false;
  return true;
}

/** Mobile/tablet browsers often show only filename + "Open" inside PDF iframes. */
function shouldUseCanvasPdfPreview(): boolean {
  if (typeof window === 'undefined') return false;
  if (detectDigitalBoard()) return true;
  // UA check catches phones even in "Desktop site" mode (wide layout + FitH iframe).
  if (isMobileUserAgent()) return true;
  if (isIosOrIpadosBrowser()) return true;
  if (isTouchTabletViewport()) return true;
  if (isCoarsePointerDevice() && isTouchCapableDevice()) return true;
  return window.innerWidth <= COMPACT_VIEWPORT_MAX_PX;
}

function pdfJsCanLoadUrlDirectly(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
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
    const hoverMq = window.matchMedia('(hover: none)');
    compactMq.addEventListener('change', update);
    tabletMq.addEventListener('change', update);
    coarseMq.addEventListener('change', update);
    hoverMq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      compactMq.removeEventListener('change', update);
      tabletMq.removeEventListener('change', update);
      coarseMq.removeEventListener('change', update);
      hoverMq.removeEventListener('change', update);
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

/** Fit page to container width — used for mobile vertical scroll stacks. */
function getFitWidthScale(containerWidth: number, pageWidth: number): number {
  const pad = 8;
  const availW = Math.max(0, containerWidth - pad);
  if (availW <= 0 || pageWidth <= 0) return 1;
  return availW / pageWidth;
}

type PageLayout = 'viewport' | 'scroll';

const PDF_TOUCH_MIN_SCALE = 1;
const PDF_TOUCH_MAX_SCALE = 4;
const PDF_TOUCH_ZOOMED_EPSILON = 1.02;
const PDF_TOUCH_DOUBLE_TAP_MS = 320;

type PdfTouchZoomTarget = {
  viewport: HTMLElement;
  inner: HTMLElement;
  slot: HTMLElement;
  contentWidth: number;
  contentHeight: number;
  scale: number;
  mode: 'none' | 'pinch';
  pinchStartDistance: number;
  pinchStartScale: number;
  lastTapAt: number;
};

const pdfTouchZoomTargets = new WeakMap<HTMLElement, PdfTouchZoomTarget>();
let pdfTouchZoomDelegationHost: HTMLElement | null = null;
let pdfTouchZoomDelegationCleanup: (() => void) | null = null;
let pdfTouchZoomActiveTarget: PdfTouchZoomTarget | null = null;

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function isPdfTouchScaleZoomed(scale: number): boolean {
  return scale > PDF_TOUCH_ZOOMED_EPSILON;
}

function findPdfTouchZoomTarget(target: EventTarget | null): PdfTouchZoomTarget | null {
  if (!target || !(target instanceof Element)) return null;
  const inner = target.closest('.pdf-zoom-inner') as HTMLElement | null;
  if (!inner) return null;
  return pdfTouchZoomTargets.get(inner) ?? null;
}

function syncPdfHostScrollLock(scrollHost: HTMLElement | null, zoomed: boolean): void {
  if (!scrollHost) return;
  scrollHost.style.overflowY = zoomed ? 'hidden' : '';
}

function applyPdfTouchScale(target: PdfTouchZoomTarget, scrollHost: HTMLElement | null): void {
  const zoomed = isPdfTouchScaleZoomed(target.scale);
  const w = Math.max(1, Math.round(target.contentWidth * target.scale));
  const h = Math.max(1, Math.round(target.contentHeight * target.scale));

  target.inner.style.width = `${w}px`;
  target.inner.style.height = `${h}px`;
  const canvas = target.inner.querySelector('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  target.viewport.style.height = zoomed ? `${target.contentHeight}px` : '';
  target.viewport.style.maxHeight = zoomed ? `${target.contentHeight}px` : '';
  target.viewport.style.overflow = zoomed ? 'auto' : 'hidden';
  target.viewport.style.overflowX = zoomed ? 'auto' : 'hidden';
  target.viewport.style.overflowY = zoomed ? 'auto' : 'hidden';
  target.viewport.style.setProperty('-webkit-overflow-scrolling', 'touch');
  target.viewport.style.touchAction = zoomed ? 'auto' : 'pan-y';
  target.slot.style.minHeight = `${h + 8}px`;
  target.slot.style.overflow = zoomed ? 'visible' : '';

  syncPdfHostScrollLock(scrollHost, zoomed);
}

function resetPdfTouchTarget(target: PdfTouchZoomTarget, scrollHost: HTMLElement | null): void {
  target.scale = PDF_TOUCH_MIN_SCALE;
  target.mode = 'none';
  target.viewport.scrollLeft = 0;
  target.viewport.scrollTop = 0;
  applyPdfTouchScale(target, scrollHost);
}

function registerPdfTouchZoomTarget(
  viewport: HTMLElement,
  inner: HTMLElement,
  slot: HTMLElement,
  contentWidth: number,
  contentHeight: number,
): void {
  const target: PdfTouchZoomTarget = {
    viewport,
    inner,
    slot,
    contentWidth,
    contentHeight,
    scale: PDF_TOUCH_MIN_SCALE,
    mode: 'none',
    pinchStartDistance: 0,
    pinchStartScale: PDF_TOUCH_MIN_SCALE,
    lastTapAt: 0,
  };
  pdfTouchZoomTargets.set(inner, target);
  inner.style.width = `${contentWidth}px`;
  inner.style.height = `${contentHeight}px`;
  viewport.style.width = '100%';
  viewport.style.overflow = 'hidden';
  viewport.style.touchAction = 'pan-y';
  applyPdfTouchScale(target, null);
}

function teardownPdfTouchZoomDelegation(): void {
  pdfTouchZoomDelegationCleanup?.();
  pdfTouchZoomDelegationCleanup = null;
  pdfTouchZoomDelegationHost = null;
  pdfTouchZoomActiveTarget = null;
}

function setupPdfTouchZoomDelegation(scrollHost: HTMLElement): () => void {
  if (pdfTouchZoomDelegationHost === scrollHost && pdfTouchZoomDelegationCleanup) {
    return pdfTouchZoomDelegationCleanup;
  }
  teardownPdfTouchZoomDelegation();
  pdfTouchZoomDelegationHost = scrollHost;

  const onTouchStart = (event: TouchEvent) => {
    const target =
      findPdfTouchZoomTarget(event.target) ??
      (event.touches.length > 0 ? findPdfTouchZoomTarget(event.touches[0].target) : null);
    if (!target) return;
    pdfTouchZoomActiveTarget = target;

    if (event.touches.length >= 2) {
      target.mode = 'pinch';
      target.pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
      target.pinchStartScale = target.scale;
      syncPdfHostScrollLock(scrollHost, true);
      event.preventDefault();
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    const target =
      pdfTouchZoomActiveTarget ??
      findPdfTouchZoomTarget(event.target) ??
      (event.touches.length > 0 ? findPdfTouchZoomTarget(event.touches[0].target) : null);
    if (!target) return;

    if (event.touches.length >= 2) {
      if (target.mode !== 'pinch') {
        target.mode = 'pinch';
        target.pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
        target.pinchStartScale = target.scale;
      }
      event.preventDefault();
      const distance = touchDistance(event.touches[0], event.touches[1]);
      if (target.pinchStartDistance <= 0) return;
      target.scale = Math.min(
        PDF_TOUCH_MAX_SCALE,
        Math.max(
          PDF_TOUCH_MIN_SCALE,
          target.pinchStartScale * (distance / target.pinchStartDistance),
        ),
      );
      applyPdfTouchScale(target, scrollHost);
      return;
    }

    if (target.mode === 'pinch') {
      event.preventDefault();
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    const target =
      pdfTouchZoomActiveTarget ??
      findPdfTouchZoomTarget(event.target) ??
      (event.changedTouches.length > 0
        ? findPdfTouchZoomTarget(event.changedTouches[0].target)
        : null);
    if (!target) return;

    if (event.touches.length >= 2) return;

    if (event.touches.length === 1 && target.mode === 'pinch') {
      target.mode = 'none';
      if (!isPdfTouchScaleZoomed(target.scale)) {
        resetPdfTouchTarget(target, scrollHost);
      } else {
        syncPdfHostScrollLock(scrollHost, true);
      }
      return;
    }

    if (event.touches.length === 0) {
      if (target.mode === 'pinch') {
        target.mode = 'none';
        if (!isPdfTouchScaleZoomed(target.scale)) {
          resetPdfTouchTarget(target, scrollHost);
        } else {
          syncPdfHostScrollLock(scrollHost, true);
        }
        pdfTouchZoomActiveTarget = null;
        return;
      }

      const now = Date.now();
      if (now - target.lastTapAt <= PDF_TOUCH_DOUBLE_TAP_MS) {
        resetPdfTouchTarget(target, scrollHost);
        target.lastTapAt = 0;
        pdfTouchZoomActiveTarget = null;
        return;
      }
      target.lastTapAt = now;

      if (!isPdfTouchScaleZoomed(target.scale)) {
        syncPdfHostScrollLock(scrollHost, false);
      }
      pdfTouchZoomActiveTarget = null;
    }
  };

  const captureOpts = { capture: true } as const;
  scrollHost.addEventListener('touchstart', onTouchStart, { ...captureOpts, passive: false });
  scrollHost.addEventListener('touchmove', onTouchMove, { ...captureOpts, passive: false });
  scrollHost.addEventListener('touchend', onTouchEnd, captureOpts);
  scrollHost.addEventListener('touchcancel', onTouchEnd, captureOpts);

  pdfTouchZoomDelegationCleanup = () => {
    scrollHost.removeEventListener('touchstart', onTouchStart, captureOpts);
    scrollHost.removeEventListener('touchmove', onTouchMove, captureOpts);
    scrollHost.removeEventListener('touchend', onTouchEnd, captureOpts);
    scrollHost.removeEventListener('touchcancel', onTouchEnd, captureOpts);
    syncPdfHostScrollLock(scrollHost, false);
    pdfTouchZoomDelegationHost = null;
    pdfTouchZoomDelegationCleanup = null;
    pdfTouchZoomActiveTarget = null;
  };

  return pdfTouchZoomDelegationCleanup;
}

export default function PdfPreviewPanel({
  fileUrl,
  title,
  className = '',
  showOpenInNewTab = false,
}: PdfPreviewPanelProps) {
  const prefersCanvasPreview = useCanvasPdfPreview();
  const inlineIframeSupported = canUseInlinePdfIframe();
  /** Canvas when touch/tablet, or whenever embedded PDF iframes cannot render inline. */
  const useCanvasRendering = prefersCanvasPreview || !inlineIframeSupported;
  /** Mobile/tablet: vertical scroll stack (no bottom pager bar). */
  const useMobileScrollLayout =
    useCanvasRendering && typeof window !== 'undefined' && !detectDigitalBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const renderingPagesRef = useRef<Set<number>>(new Set());
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [totalPages, setTotalPages] = useState(0);
  const [pdfSource, setPdfSource] = useState<PdfSource | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const absoluteUrl = normalizeContentFileUrl(fileUrl);
  const proxyUrl = getPdfContentPreviewProxyUrl(fileUrl, title);
  const forcedProxyUrl = getPdfJsFetchUrl(fileUrl, title);
  const iframeSrc = getEmbeddedPdfIframeSrc(absoluteUrl || fileUrl, title);

  const openInNewTab = useCallback(() => {
    const target = forcedProxyUrl || proxyUrl || absoluteUrl;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }, [forcedProxyUrl, proxyUrl, absoluteUrl]);

  const updateContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const next = measurePreviewViewport(el);
    setContainerSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, []);

  useLayoutEffect(() => {
    if (!useCanvasRendering) return;
    updateContainerSize();
  }, [useCanvasRendering, updateContainerSize, loadingPdf, totalPages]);

  useEffect(() => {
    if (!useCanvasRendering || !containerRef.current) return;
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
  }, [useCanvasRendering, updateContainerSize]);

  useEffect(() => {
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
    if (!useCanvasRendering) {
      setLoadingPdf(false);
      setPdfError(null);
      setPdfSource(null);
      setUseIframeFallback(false);
      void destroyPdfDoc();
      if (scrollHostRef.current) scrollHostRef.current.innerHTML = '';
      return;
    }

    let cancelled = false;
    setLoadingPdf(true);
    setPdfError(null);
    setPdfSource(null);
    setUseIframeFallback(false);
    renderingPagesRef.current.clear();
    if (scrollHostRef.current) scrollHostRef.current.innerHTML = '';
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
          const isExternalHost =
            shouldFetchDirectly(absoluteUrl) ||
            (Boolean(absoluteUrl) &&
              !isOurBackendPdfUrl(absoluteUrl) &&
              !/\/uploads\//i.test(absoluteUrl));
          setPdfError(
            isExternalHost
              ? 'This textbook link could not be loaded for inline preview (often external NCERT/host links or very large files). Tap below to open it in your browser.'
              : 'Could not display this PDF on your device. Open it externally to read.',
          );
        }
        return;
      }

      setUseIframeFallback(true);
      setPdfSource(null);
      if (!cancelled) setTotalPages(500);
    };

    const jsUrl = getPdfJsFetchUrl(fileUrl, title);
    const absolute = normalizeContentFileUrl(fileUrl);
    const urlSources: PdfSource[] = [];
    const seenUrls = new Set<string>();
    for (const url of [jsUrl, absolute]) {
      if (!url || seenUrls.has(url)) continue;
      if (url === absolute && !pdfJsCanLoadUrlDirectly(url) && !/\/uploads\//i.test(url)) {
        continue;
      }
      if (url === absolute && shouldFetchDirectly(url)) continue;
      seenUrls.add(url);
      urlSources.push({ mode: 'url', url });
    }

    (async () => {
      // Mobile/tablet: load bytes first — URL streaming via pdf.js is less reliable on touch browsers.
      if (prefersDisableWorker()) {
        try {
          const bytes = await fetchPdfBytes(fileUrl, title);
          if (cancelled) return;
          await trySetPdfSource({ mode: 'data', bytes });
          return;
        } catch {
          /* try URL sources, then bytes again below */
        }
      }

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
  }, [useCanvasRendering, fileUrl, title, destroyPdfDoc]);

  const renderPageIntoSlot = useCallback(
    async (
      pageNum: number,
      slot: HTMLElement,
      size: { width: number; height: number },
      signal?: { cancelled: boolean },
      layout: PageLayout = 'viewport',
      touchZoom?: { scrollHost: HTMLElement | null },
    ) => {
      const pdf = pdfDocRef.current;
      if (!pdf || signal?.cancelled) return false;
      if (slot.dataset.rendered === '1' || renderingPagesRef.current.has(pageNum)) return true;
      renderingPagesRef.current.add(pageNum);
      try {
        const page = await pdf.getPage(pageNum);
        if (signal?.cancelled) return false;
        const base = page.getViewport({ scale: 1 });
        const cssScale =
          layout === 'scroll'
            ? getFitWidthScale(size.width, base.width)
            : getFitContainScale(size.width, size.height, base.width, base.height);
        const cssWidth = Math.floor(base.width * cssScale);
        const cssHeight = Math.floor(base.height * cssScale);
        const baseOutputScale = getSafeOutputScale(cssScale, base.width, base.height);
        const scaleAttempts = prefersDisableWorker()
          ? [baseOutputScale, baseOutputScale * 0.75, cssScale, cssScale * 0.65]
          : [baseOutputScale, baseOutputScale * 0.8, cssScale];

        for (const outputScale of scaleAttempts) {
          if (signal?.cancelled) break;
          const viewport = page.getViewport({ scale: outputScale });
          const canvas = document.createElement('canvas');
          canvas.className = touchZoom
            ? 'block rounded-sm bg-white shadow-md'
            : 'block max-w-full rounded-sm bg-white shadow-md';
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) continue;
          try {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            if (!signal?.cancelled) {
              if (touchZoom) {
                const zoomViewport = document.createElement('div');
                zoomViewport.className = 'pdf-zoom-viewport flex w-full justify-center';
                const zoomInner = document.createElement('div');
                zoomInner.className = 'pdf-zoom-inner shrink-0';
                zoomInner.appendChild(canvas);
                zoomViewport.appendChild(zoomInner);
                slot.replaceChildren(zoomViewport);
                registerPdfTouchZoomTarget(zoomViewport, zoomInner, slot, cssWidth, cssHeight);
              } else {
                slot.replaceChildren(canvas);
              }
              slot.dataset.rendered = '1';
              if (layout === 'scroll') {
                slot.style.minHeight = `${cssHeight + 8}px`;
              }
              return true;
            }
          } catch {
            /* retry at lower scale */
          }
        }
      } finally {
        renderingPagesRef.current.delete(pageNum);
      }
      return false;
    },
    [],
  );

  /** Canvas rendering: mobile = vertical scroll stack; boards = full-screen snap pages. */
  useEffect(() => {
    if (!useCanvasRendering || useIframeFallback || !pdfSource || pdfError) return;
    if (!scrollHostRef.current) return;
    if (containerSize.width < 80) return;
    if (!useMobileScrollLayout && containerSize.height < 80) return;
    if (totalPages < 1 || !pdfDocRef.current) return;

    const host = scrollHostRef.current;
    const pdf = pdfDocRef.current;
    const signal = { cancelled: false };
    const isScrollLayout = useMobileScrollLayout;
    let renderObserver: IntersectionObserver | null = null;

    host.innerHTML = '';
    renderingPagesRef.current.clear();

    const touchZoomOpts = isScrollLayout ? { scrollHost: host } : undefined;
    const teardownTouchZoom = isScrollLayout ? setupPdfTouchZoomDelegation(host) : null;

    if (isScrollLayout) {
      host.className =
        'h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain';
      host.style.touchAction = 'pan-y';
    } else {
      host.className =
        'h-full w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y';
    }
    host.style.setProperty('-webkit-overflow-scrolling', 'touch');

    const setup = async () => {
      const slots: HTMLElement[] = [];
      let scrollSlotMinHeight = '280px';

      if (isScrollLayout) {
        try {
          const firstPage = await pdf.getPage(1);
          const base = firstPage.getViewport({ scale: 1 });
          const cssScale = getFitWidthScale(containerSize.width, base.width);
          scrollSlotMinHeight = `${Math.floor(base.height * cssScale) + 8}px`;
        } catch {
          /* use default slot height */
        }
      }

      for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
        if (signal.cancelled) return;
        const slot = document.createElement('div');
        slot.dataset.page = String(pageNum);

        if (isScrollLayout) {
          slot.className =
            'pdf-page-slot flex w-full shrink-0 items-center justify-center px-1 py-2';
          slot.style.minHeight = scrollSlotMinHeight;
        } else {
          slot.className =
            'pdf-page-slot flex w-full shrink-0 snap-start snap-always items-center justify-center';
          slot.style.height = `${containerSize.height}px`;
        }

        host.appendChild(slot);
        slots.push(slot);
      }

      if (signal.cancelled) return;

      renderObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const pageNum = Number((entry.target as HTMLElement).dataset.page);
            if (!Number.isFinite(pageNum)) continue;
            void renderPageIntoSlot(
              pageNum,
              entry.target as HTMLElement,
              containerSize,
              signal,
              isScrollLayout ? 'scroll' : 'viewport',
              touchZoomOpts,
            );
          }
        },
        { root: host, rootMargin: isScrollLayout ? '240px 0px' : '400px 0px', threshold: 0.01 },
      );

      slots.forEach((slot) => {
        renderObserver?.observe(slot);
      });

      if (slots[0]) {
        void renderPageIntoSlot(
          1,
          slots[0],
          containerSize,
          signal,
          isScrollLayout ? 'scroll' : 'viewport',
          touchZoomOpts,
        );
      }
    };

    void setup();

    return () => {
      signal.cancelled = true;
      renderObserver?.disconnect();
      teardownTouchZoom?.();
      host.style.overflowY = '';
      host.style.touchAction = '';
      host.innerHTML = '';
      renderingPagesRef.current.clear();
    };
  }, [
    useCanvasRendering,
    useMobileScrollLayout,
    useIframeFallback,
    pdfSource,
    pdfError,
    containerSize,
    totalPages,
    renderPageIntoSlot,
  ]);

  if (!absoluteUrl) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">No file URL for preview.</p>
    );
  }

  /** Desktop mouse/trackpad — embedded PDF iframe (never on touch tablets). */
  if (!useCanvasRendering && inlineIframeSupported) {
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

  const mobileIframeSrc = getEmbeddedPdfIframeSrc(fileUrl, title);

  /** Touch / tablet — scroll through pages naturally (no pager bar). */
  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col ${className}`}>
      {showOpenInNewTab ? (
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-[min(48dvh,520px)] flex-1 flex-col overflow-hidden rounded-lg border bg-slate-100">
        <div ref={containerRef} className="relative h-full min-h-[min(48dvh,520px)] flex-1 overflow-hidden">
          {useIframeFallback ? (
            <iframe
              key={mobileIframeSrc}
              title={title || 'PDF Preview'}
              src={mobileIframeSrc}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div ref={scrollHostRef} className="h-full w-full" />
          )}
          {loadingPdf || (!useIframeFallback && pdfSource && totalPages < 1 && !pdfError) ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-100/90 text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
}
