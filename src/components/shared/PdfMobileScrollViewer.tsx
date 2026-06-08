import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type * as pdfjs from 'pdfjs-dist';
import PdfPagePinchFrame from '@/components/shared/PdfPagePinchFrame';

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
  const pad = 8;
  const availW = Math.max(0, containerWidth - pad);
  if (availW <= 0 || pageWidth <= 0) return 1;
  return availW / pageWidth;
}

async function renderPdfPageCanvas(
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
  containerWidth: number,
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
): Promise<{ cssWidth: number; cssHeight: number } | null> {
  const page = await pdf.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const cssScale = getFitWidthScale(containerWidth, base.width);
  const cssWidth = Math.floor(base.width * cssScale);
  const cssHeight = Math.floor(base.height * cssScale);
  const baseOutputScale = getSafeOutputScale(cssScale, base.width, base.height);
  const scaleAttempts = prefersDisableWorker()
    ? [baseOutputScale, baseOutputScale * 0.75, cssScale, cssScale * 0.65]
    : [baseOutputScale, baseOutputScale * 0.8, cssScale];

  for (const outputScale of scaleAttempts) {
    const viewport = page.getViewport({ scale: outputScale });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
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
    if (!canvas) return;
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
  onZoomChange: (pageNum: number, zoomed: boolean) => void;
};

function PdfMobilePage({
  pageNum,
  pdf,
  containerWidth,
  defaultMinHeight,
  scrollRoot,
  onZoomChange,
}: PdfMobilePageProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(pageNum === 1);
  const [dims, setDims] = useState({ w: 0, h: defaultMinHeight });

  const pageHeight = dims.h > 0 ? dims.h : defaultMinHeight;
  const pageWidth = dims.w > 0 ? dims.w : Math.max(containerWidth - 8, 280);
  const baseWidth = dims.w > 0 ? dims.w : pageWidth;
  const baseHeight = dims.h > 0 ? dims.h : pageHeight;

  const handlePageZoom = useCallback(
    (zoomed: boolean) => onZoomChange(pageNum, zoomed),
    [onZoomChange, pageNum],
  );

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
    const fitW = Math.max(containerWidth - 8, 280);
    void (async () => {
      const result = await renderPdfPageCanvas(
        pdf,
        pageNum,
        containerWidth,
        canvas,
        fitW,
        defaultMinHeight,
      );
      if (cancelled || !result) return;
      renderedRef.current = true;
      setDims({ w: result.cssWidth, h: result.cssHeight });
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldRender, pdf, pageNum, containerWidth, defaultMinHeight]);

  return (
    <div
      ref={slotRef}
      data-page={pageNum}
      className="pdf-page-slot flex w-full shrink-0 justify-center px-1 py-2"
      style={{ minHeight: `${pageHeight + 16}px` }}
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

type PdfMobileScrollViewerProps = {
  pdf: pdfjs.PDFDocumentProxy;
  totalPages: number;
  containerWidth: number;
  defaultPageHeight?: number;
  className?: string;
};

export default function PdfMobileScrollViewer({
  pdf,
  totalPages,
  containerWidth,
  defaultPageHeight = 280,
  className = '',
}: PdfMobileScrollViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomedPagesRef = useRef(new Set<number>());
  const [scrollLocked, setScrollLocked] = useState(false);

  const handleZoomChange = useCallback((pageNum: number, zoomed: boolean) => {
    if (zoomed) zoomedPagesRef.current.add(pageNum);
    else zoomedPagesRef.current.delete(pageNum);
    setScrollLocked(zoomedPagesRef.current.size > 0);
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`h-full w-full touch-manipulation overflow-x-hidden overscroll-y-contain ${scrollLocked ? 'overflow-y-hidden' : 'overflow-y-auto'} ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {Array.from({ length: totalPages }, (_, index) => (
        <PdfMobilePage
          key={index + 1}
          pageNum={index + 1}
          pdf={pdf}
          containerWidth={containerWidth}
          defaultMinHeight={defaultPageHeight}
          scrollRoot={scrollRef}
          onZoomChange={handleZoomChange}
        />
      ))}
    </div>
  );
}
