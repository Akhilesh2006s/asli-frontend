import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api-config';
import { BookOpen, FileText, Package, Video, Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface WeakSubjectContentItem {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  topic?: string;
  subject: { _id: string; name: string };
}

export type WeakSubjectContentMap = {
  Video: WeakSubjectContentItem[];
  TextBook: WeakSubjectContentItem[];
  Workbook: WeakSubjectContentItem[];
  Material: WeakSubjectContentItem[];
};

type TabKey = keyof WeakSubjectContentMap;

function resolveContentHref(fileUrl: string): string {
  if (!fileUrl) return '#';
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('data:')) return fileUrl;
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${API_BASE_URL}${path}`;
}

function isYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

function extractDirectFileUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);

    // If URL is Google gview wrapper, extract the underlying file URL.
    if (parsed.hostname.includes('docs.google.com') && parsed.pathname.includes('/gview')) {
      const target = parsed.searchParams.get('url');
      if (target) return target;
    }

    // Normalize Drive share links to preview endpoint.
    if (parsed.hostname.includes('drive.google.com')) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)\//);
      if (match?.[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;

      const idFromQuery = parsed.searchParams.get('id');
      if (idFromQuery) return `https://drive.google.com/uc?export=download&id=${idFromQuery}`;
    }
  } catch {
    return rawUrl;
  }
  return rawUrl;
}

function isPdfBlob(blob: Blob): Promise<boolean> {
  return blob.slice(0, 5).text().then((prefix) => prefix.startsWith('%PDF-'));
}

const TAB_ORDER: TabKey[] = ['Video', 'TextBook', 'Workbook', 'Material'];

const TAB_LABELS: Record<TabKey, string> = {
  Video: 'Videos',
  TextBook: 'TextBooks',
  Workbook: 'Workbooks',
  Material: 'Materials',
};

function ResourceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
          <Skeleton className="aspect-video w-full rounded-lg mb-3" />
          <Skeleton className="h-4 w-[80%] mb-2" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

export function WeakSubjectResourcesCard({
  loadingContent,
  weakSubjectContent,
}: {
  loadingContent: boolean;
  weakSubjectContent: WeakSubjectContentMap | null;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<WeakSubjectContentItem | null>(null);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [isLoadingPdfPreview, setIsLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  const openPreview = (item: WeakSubjectContentItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  useEffect(() => {
    const loadPdfBlob = async () => {
      if (!isPreviewOpen || !previewItem?.fileUrl) {
        setPdfPreviewBlobUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return null;
        });
        setIsLoadingPdfPreview(false);
        setPdfPreviewError(null);
        setPdfPageCount(0);
        setPdfZoom(1);
        setUseEmbedFallback(false);
        return;
      }

      const resolved = resolveContentHref(previewItem.fileUrl);
      const directUrl = extractDirectFileUrl(resolved);
      const isPdf = directUrl.toLowerCase().endsWith('.pdf') || directUrl.toLowerCase().includes('pdf');
      if (!isPdf) {
        setPdfPreviewBlobUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return null;
        });
        setIsLoadingPdfPreview(false);
        setPdfPreviewError(null);
        setPdfPageCount(0);
        setPdfZoom(1);
        setUseEmbedFallback(false);
        return;
      }

      setIsLoadingPdfPreview(true);
      setPdfPreviewError(null);
      setPdfPageCount(0);
      setPdfZoom(1);
      setUseEmbedFallback(false);
      console.log('WeakSubject PDF source URL:', directUrl);
      try {
        const token = localStorage.getItem('authToken');
        const candidates = Array.from(new Set([directUrl, resolved])).filter(Boolean);

        let loadedBlobUrl: string | null = null;
        let lastError: Error | null = null;

        for (const candidate of candidates) {
          try {
            const previewUrl = `${API_BASE_URL}/api/student/content-preview?url=${encodeURIComponent(candidate)}&filename=${encodeURIComponent(previewItem?.title || 'preview.pdf')}`;
            const response = await fetch(previewUrl, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              }
            });
            const contentType = response.headers.get('content-type') || '';
            console.log('WeakSubject PDF preview response:', {
              candidate,
              status: response.status,
              ok: response.ok,
              contentType
            });
            if (!response.ok) throw new Error(`PDF preview fetch failed: ${response.status}`);
            if (!contentType.toLowerCase().includes('application/pdf') && !contentType.toLowerCase().includes('application/octet-stream')) {
              throw new Error(`Invalid content type for PDF preview: ${contentType || 'unknown'}`);
            }
            const blob = await response.blob();
            const validPdf = await isPdfBlob(blob);
            if (!validPdf) {
              throw new Error('Preview payload is not a valid PDF binary');
            }
            loadedBlobUrl = window.URL.createObjectURL(blob);
            break;
          } catch (candidateError) {
            lastError = candidateError instanceof Error ? candidateError : new Error(String(candidateError));
          }
        }

        if (!loadedBlobUrl) {
          throw lastError || new Error('Unable to load PDF from available sources');
        }

        setPdfPreviewBlobUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return loadedBlobUrl;
        });
      } catch (error) {
        console.error('Weak subjects PDF preview failed:', error);
        setPdfPreviewError('Unable to preview PDF. Click Download instead.');
        setPdfPreviewBlobUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return null;
        });
      } finally {
        setIsLoadingPdfPreview(false);
      }
    };

    loadPdfBlob();
  }, [isPreviewOpen, previewItem]);

  return (
    <>
      <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-white via-purple-50/60 to-pink-50 ring-1 ring-purple-100">
        <div className="h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex flex-col gap-1">
            <span>📚 Study Resources for Weak Subjects</span>
            <span className="text-sm font-normal text-muted-foreground">
              Based on your exam performance, here are platform materials to help you improve
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingContent && <ResourceSkeleton />}
          {!loadingContent && (
            <Tabs defaultValue="Video" className="w-full">
              <TabsList className="mb-4 w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 py-1">
                {TAB_ORDER.map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                    {TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TAB_ORDER.map((key) => {
                const items = weakSubjectContent?.[key] ?? [];
                const label = TAB_LABELS[key];
                return (
                  <TabsContent key={key} value={key} className="mt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center rounded-lg border border-dashed border-purple-200/80 bg-white/60">
                        No {label} available for your weak subjects yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => {
                          const youtube = key === 'Video' && isYoutubeUrl(item.fileUrl);
                          const isVideoTab = key === 'Video';

                          return (
                            <div
                              key={item._id}
                              className="flex flex-col rounded-xl border border-purple-100/90 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                            >
                              {isVideoTab ? (
                                <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-purple-50">
                                  {item.thumbnailUrl ? (
                                    <img
                                      src={
                                        /^https?:\/\//i.test(item.thumbnailUrl) || item.thumbnailUrl.startsWith('data:')
                                          ? item.thumbnailUrl
                                          : `${API_BASE_URL}${item.thumbnailUrl.startsWith('/') ? '' : '/'}${item.thumbnailUrl}`
                                      }
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Video className="h-12 w-12 text-purple-400" aria-hidden />
                                    </div>
                                  )}
                                  {youtube && (
                                    <Badge className="absolute right-2 top-2 gap-1 bg-red-600 hover:bg-red-600 text-[10px]">
                                      <Youtube className="h-3 w-3" aria-hidden />
                                      YouTube
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-100">
                                  {key === 'TextBook' ? (
                                    <BookOpen className="h-10 w-10 text-purple-500" aria-hidden />
                                  ) : key === 'Workbook' ? (
                                    <FileText className="h-10 w-10 text-purple-500" aria-hidden />
                                  ) : (
                                    <Package className="h-10 w-10 text-purple-500" aria-hidden />
                                  )}
                                </div>
                              )}
                              <h4 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">{item.title}</h4>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="capitalize text-xs font-normal">
                                  {plainDisplaySubject(item.subject.name)}
                                </Badge>
                                {item.topic ? (
                                  <span className="text-xs text-muted-foreground line-clamp-1">{item.topic}</span>
                                ) : null}
                              </div>
                              {item.description ? (
                                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                              ) : null}
                              <div className="mt-auto pt-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full border-purple-200 bg-white hover:bg-purple-50"
                                  onClick={() => openPreview(item)}
                                >
                                  {key === 'Video' ? 'Watch' : 'View / Download'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewItem(null);
            setPdfPreviewError(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[96vw] h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{previewItem?.title || 'Preview'}</DialogTitle>
          </DialogHeader>
          {(() => {
            const fileUrl = extractDirectFileUrl(resolveContentHref(previewItem?.fileUrl || ''));
            const lower = fileUrl.toLowerCase();
            const isPdf = lower.endsWith('.pdf') || lower.includes('pdf');
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(lower);
            const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower);
            const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower) || isYoutubeUrl(fileUrl);
            const youtubeEmbed = isYoutubeUrl(fileUrl)
              ? `https://www.youtube.com/embed/${(fileUrl.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/) || [])[2] || ''}`
              : '';

            if (!fileUrl || fileUrl === '#') return <p className="text-sm text-gray-500">No preview URL available.</p>;

            if (isVideo && youtubeEmbed) {
              return <iframe src={youtubeEmbed} className="w-full h-[70vh] border-0 rounded-lg" title={previewItem?.title || 'Video'} allowFullScreen />;
            }
            if (isVideo) {
              return <video src={fileUrl} controls className="w-full max-h-[70vh] rounded-lg bg-black" />;
            }
            if (isPdf) {
              const proxiedDownloadUrl = `${API_BASE_URL}/api/student/content-download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(previewItem?.title || 'preview.pdf')}`;
              return (
                <div className="w-full min-h-[85vh] rounded-lg overflow-y-auto bg-white border border-gray-100 p-2">
                  {isLoadingPdfPreview ? (
                    <div className="w-full min-h-[85vh] flex items-center justify-center text-sm text-gray-600">
                      Loading PDF preview...
                    </div>
                  ) : pdfPreviewBlobUrl ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <span className="text-xs text-muted-foreground">
                          {pdfPageCount > 0 ? `${pdfPageCount} page${pdfPageCount === 1 ? '' : 's'}` : 'Preparing preview'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPdfZoom((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(2))))}
                            disabled={useEmbedFallback}
                          >
                            Zoom -
                          </Button>
                          <span className="text-xs text-muted-foreground min-w-14 text-center">
                            {Math.round(pdfZoom * 100)}%
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPdfZoom((prev) => Math.min(2.2, Number((prev + 0.1).toFixed(2))))}
                            disabled={useEmbedFallback}
                          >
                            Zoom +
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUseEmbedFallback((prev) => !prev)}
                          >
                            {useEmbedFallback ? 'Use Enhanced Viewer' : 'Use Browser Viewer'}
                          </Button>
                        </div>
                      </div>

                      {useEmbedFallback ? (
                        <embed
                          src={pdfPreviewBlobUrl}
                          type="application/pdf"
                          width="100%"
                          height="100%"
                          style={{
                            minHeight: '85vh',
                            borderRadius: '12px',
                            background: '#fff'
                          }}
                        />
                      ) : (
                        <div className="w-full overflow-y-auto" style={{ minHeight: '85vh' }}>
                          <Document
                            file={pdfPreviewBlobUrl}
                            loading={<div className="w-full min-h-[85vh] flex items-center justify-center text-sm text-gray-600">Rendering PDF...</div>}
                            onLoadSuccess={({ numPages }) => {
                              setPdfPageCount(numPages);
                              setPdfPreviewError(null);
                            }}
                            onLoadError={(error) => {
                              console.error('react-pdf render failed:', error);
                              setPdfPreviewError('Preview unavailable. Click Download PDF');
                              setUseEmbedFallback(true);
                            }}
                          >
                            {Array.from({ length: pdfPageCount || 1 }, (_, index) => (
                              <div key={index + 1} className="mb-4 flex justify-center">
                                <Page
                                  pageNumber={index + 1}
                                  scale={pdfZoom}
                                  renderAnnotationLayer={false}
                                  renderTextLayer={false}
                                />
                              </div>
                            ))}
                          </Document>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center text-sm text-gray-600 gap-3 px-4 text-center">
                      <span>{pdfPreviewError || 'Preview unavailable. Click Download PDF'}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(proxiedDownloadUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Download PDF
                      </Button>
                    </div>
                  )}
                </div>
              );
            }
            if (isImage) {
              return <img src={fileUrl} alt={previewItem?.title || 'Preview'} className="w-full max-h-[70vh] object-contain rounded-lg bg-gray-100" />;
            }
            if (isAudio) {
              return <audio src={fileUrl} controls className="w-full" />;
            }
            return <p className="text-sm text-gray-500">Preview is not available for this file type.</p>;
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function plainDisplaySubject(raw: string): string {
  const m = raw.match(/^(.+?)_\d+$/);
  return (m ? m[1] : raw).replace(/_/g, ' ');
}
