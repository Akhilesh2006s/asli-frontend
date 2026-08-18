import { useMemo } from 'react';
import { useSearch } from 'wouter';
import PdfPreviewPanel from '@/components/shared/PdfPreviewPanel';
import { isAllowedPdfReaderFileUrl } from '@/lib/api-config';

/**
 * Full-window textbook reader. Opened instead of the raw /uploads PDF URL so
 * Chrome's built-in viewer (Download / Print) never appears.
 */
export default function PdfReaderPage() {
  const search = useSearch();
  const { fileUrl, title, context } = useMemo(() => {
    const q = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(q);
    return {
      fileUrl: String(params.get('file') || '').trim(),
      title: String(params.get('title') || 'Textbook').trim() || 'Textbook',
      context: String(params.get('context') || '').trim(),
    };
  }, [search]);

  if (!isAllowedPdfReaderFileUrl(fileUrl)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone-100 px-6 text-center">
        <p className="max-w-md text-sm text-stone-600">This file cannot be opened in the reader.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#d6d3d1]">
      <PdfPreviewPanel
        fileUrl={fileUrl}
        title={title}
        variant="book"
        allowFullscreen
        showOpenInNewTab={false}
        contextLabel={context}
        className="h-full min-h-0 w-full"
      />
    </div>
  );
}
