import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE_URL } from '@/lib/api-config';
import { BookOpen, FileText, Package, Video, Youtube } from 'lucide-react';

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
  return (
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
                        const href = resolveContentHref(item.fileUrl);
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
                                asChild
                              >
                                <a href={href} target="_blank" rel="noreferrer">
                                  {key === 'Video' ? 'Watch' : 'View / Download'}
                                </a>
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
  );
}

function plainDisplaySubject(raw: string): string {
  const m = raw.match(/^(.+?)_\d+$/);
  return (m ? m[1] : raw).replace(/_/g, ' ');
}
