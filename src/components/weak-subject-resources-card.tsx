import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api-config';
import { BookOpen, FileText, Package, Video, Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';

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
      if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  } catch {
    return rawUrl;
  }
  return rawUrl;
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
  const [pdfRenderMode, setPdfRenderMode] = useState<'iframe' | 'embed' | 'object'>('iframe');

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
        setPdfRenderMode('iframe');
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
        setPdfRenderMode('iframe');
        return;
      }

      setIsLoadingPdfPreview(true);
      setPdfPreviewError(null);
      setPdfRenderMode('iframe');
      console.log('WeakSubject PDF source URL:', directUrl);
      try {
        const token = localStorage.getItem('authToken');
        const previewUrl = `${API_BASE_URL}/api/student/content-download?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(previewItem?.title || 'preview.pdf')}`;
        const response = await fetch(previewUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const contentType = response.headers.get('content-type') || '';
        console.log('WeakSubject PDF preview response:', {
          status: response.status,
          ok: response.ok,
          contentType
        });
        if (!response.ok) throw new Error(`PDF preview fetch failed: ${response.status}`);
        if (!contentType.toLowerCase().includes('application/pdf') && !contentType.toLowerCase().includes('application/octet-stream')) {
          throw new Error(`Invalid content type for PDF preview: ${contentType || 'unknown'}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        setPdfPreviewBlobUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return blobUrl;
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
            setPdfRenderMode('iframe');
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw]">
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
              return (
                <div className="w-full min-h-[80vh] rounded-lg overflow-auto bg-white border border-gray-100">
                  {isLoadingPdfPreview ? (
                    <div className="w-full min-h-[80vh] flex items-center justify-center text-sm text-gray-600">
                      Loading PDF preview...
                    </div>
                  ) : pdfPreviewBlobUrl ? (
                    <>
                      {pdfRenderMode === 'iframe' && (
                        <iframe
                          src={`${pdfPreviewBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          width="100%"
                          height="80vh"
                          style={{ border: 'none', borderRadius: '12px', minHeight: '80vh', background: '#fff' }}
                          title={previewItem?.title || 'PDF Preview'}
                          onLoad={() => console.log('PDF iframe loaded:', pdfPreviewBlobUrl)}
                          onError={() => {
                            console.warn('PDF iframe failed, switching to embed:', pdfPreviewBlobUrl);
                            setPdfRenderMode('embed');
                          }}
                        />
                      )}
                      {pdfRenderMode === 'embed' && (
                        <embed
                          src={`${pdfPreviewBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          type="application/pdf"
                          width="100%"
                          height="80vh"
                          className="rounded-lg"
                          onLoad={() => console.log('PDF embed loaded:', pdfPreviewBlobUrl)}
                        />
                      )}
                      {pdfRenderMode === 'object' && (
                        <object
                          data={`${pdfPreviewBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          type="application/pdf"
                          className="w-full min-h-[80vh] rounded-lg"
                        />
                      )}
                      {pdfRenderMode === 'embed' && (
                        <div className="px-2 pb-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setPdfRenderMode('object')}>
                            Use alternate viewer
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center text-sm text-gray-600 gap-3 px-4 text-center">
                      <span>{pdfPreviewError || 'Unable to preview PDF. Click Download instead.'}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Download
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
