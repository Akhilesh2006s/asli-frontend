import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEmbeddedPdfIframeSrc,
  getPdfContentPreviewProxyUrl,
  normalizeContentFileUrl,
} from '@/lib/api-config';
import { useDigitalBoard } from '@/hooks/use-digital-board';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewPanelProps {
  fileUrl: string;
  title?: string;
  className?: string;
}

export default function PdfPreviewPanel({ fileUrl, title, className = '' }: PdfPreviewPanelProps) {
  const isDigitalBoard = useDigitalBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const absoluteUrl = normalizeContentFileUrl(fileUrl);
  const proxyUrl = getPdfContentPreviewProxyUrl(fileUrl, title);
  const iframeSrc = getEmbeddedPdfIframeSrc(absoluteUrl || fileUrl, title);

  const openInNewTab = useCallback(() => {
    const target = proxyUrl || absoluteUrl;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }, [proxyUrl, absoluteUrl]);

  useEffect(() => {
    if (!isDigitalBoard || !containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setPageWidth(Math.min(w - 24, 1200));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDigitalBoard]);

  if (!absoluteUrl) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">No file URL for preview.</p>
    );
  }

  if (!isDigitalBoard) {
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

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
        <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </Button>
      </div>

      <div
        ref={containerRef}
        className="min-h-[min(70dvh,800px)] flex-1 overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/20 p-3"
      >
        {pdfError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{pdfError}</p>
            <Button type="button" onClick={openInNewTab}>
              Open PDF in new tab
            </Button>
          </div>
        ) : (
          <Document
            file={proxyUrl}
            loading={
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading document…</span>
              </div>
            }
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setPdfError(null);
            }}
            onLoadError={() => {
              setPdfError('Could not load this PDF on the display. Use Open in new tab.');
            }}
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page-${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                className="shadow-md"
                renderTextLayer
                renderAnnotationLayer
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
