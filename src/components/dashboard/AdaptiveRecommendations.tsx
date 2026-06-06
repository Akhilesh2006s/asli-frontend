import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  Sparkles,
  Video,
  FileText,
  ClipboardList,
  ChevronRight,
  BookOpen,
  Headphones,
  FileBadge,
  GraduationCap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import PdfPreviewPanel from '@/components/shared/PdfPreviewPanel';

/** Optional legacy props (dashboard may still pass them; recommendations come from API). */
export interface AdaptiveRecommendationsProps {
  subjectProgress?: unknown[];
  examResults?: unknown[];
  quizzes?: unknown[];
  subjects?: unknown[];
  videos?: unknown[];
  content?: unknown[];
}

interface RecommendedItem {
  kind: string;
  _id: string;
  title: string;
  displayType: string;
  nativeType?: string;
  topicHint?: string;
  fileUrl?: string;
  navigatePath?: string;
  examId?: string;
  openMode?: string;
}

interface AdaptiveCard {
  subjectId: string;
  subjectName: string;
  progressPercent: number;
  examScorePercent?: number;
  weakTopicCount: number;
  priority: 'High' | 'Medium' | 'Low';
  gapsWithoutContent: string[];
  usesLibraryFallback?: boolean;
  recommendedContent: RecommendedItem[];
}

interface AdaptiveApiPayload {
  cards: AdaptiveCard[];
  meta?: {
    generatedAt?: string;
    reason?: string;
    examResultsAnalyzed?: number;
    libraryItemsLoaded?: number;
  };
}

function parseAdaptivePayload(json: Record<string, unknown>): AdaptiveApiPayload {
  const root = json as { success?: boolean; data?: unknown };
  let payload = root.data ?? json;
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    const nested = (payload as { data?: AdaptiveApiPayload }).data;
    if (nested && typeof nested === 'object' && Array.isArray((nested as AdaptiveApiPayload).cards)) {
      payload = nested;
    }
  }
  const cards = Array.isArray((payload as AdaptiveApiPayload)?.cards)
    ? (payload as AdaptiveApiPayload).cards
    : [];
  const meta =
    payload && typeof payload === 'object' && 'meta' in payload
      ? (payload as AdaptiveApiPayload).meta
      : undefined;
  return { cards, meta };
}

function getSubjectIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('math')) return '∑';
  if (n.includes('physics')) return 'Φ';
  if (n.includes('chemistry')) return '⚗';
  if (n.includes('bio')) return '🧬';
  return (name || 'Su').substring(0, 2).toUpperCase();
}

function priorityBadgeClass(priority: string) {
  if (priority === 'High') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (priority === 'Medium') return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function typeBadgeClass(displayType: string) {
  const d = displayType.toLowerCase();
  if (d === 'video') return 'bg-violet-100 text-violet-800';
  if (d === 'pdf') return 'bg-red-50 text-red-800';
  if (d === 'practice') return 'bg-orange-100 text-orange-900';
  if (d === 'assignment') return 'bg-teal-100 text-teal-900';
  if (d === 'audio') return 'bg-blue-100 text-blue-900';
  if (d.includes('previous') || d.includes('paper')) return 'bg-indigo-100 text-indigo-900';
  return 'bg-gray-100 text-gray-800';
}

function getTypeIcon(displayType: string) {
  const d = displayType.toLowerCase();
  if (d === 'video') return Video;
  if (d === 'pdf') return FileBadge;
  if (d === 'practice') return ClipboardList;
  if (d === 'assignment') return GraduationCap;
  if (d === 'audio') return Headphones;
  if (d.includes('previous') || d.includes('paper')) return FileText;
  return BookOpen;
}

function resolveFileUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

const EMPTY_REASON_MESSAGES: Record<string, string> = {
  student_not_found: 'Your student profile could not be loaded. Try signing out and back in.',
  no_subjects: 'No subjects are assigned to your class yet. Ask your teacher or admin to assign subjects.',
};

export default function AdaptiveRecommendations(_props: AdaptiveRecommendationsProps) {
  const [, setLocation] = useLocation();
  const [cards, setCards] = useState<AdaptiveCard[]>([]);
  const [meta, setMeta] = useState<AdaptiveApiPayload['meta']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<RecommendedItem | null>(null);

  const fetchAdaptive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setCards([]);
        setError('Sign in to load adaptive recommendations.');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/student/adaptive-learning`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load adaptive learning');
      }
      const json = await response.json();
      const payload = parseAdaptivePayload(json);
      setCards(payload.cards);
      setMeta(payload.meta);
    } catch (e) {
      console.error('Adaptive learning fetch failed:', e);
      setError(e instanceof Error ? e.message : 'Could not load recommendations');
      setCards([]);
      setMeta(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdaptive();
  }, [fetchAdaptive]);

  const openResource = (item: RecommendedItem) => {
    const mode = item.openMode || 'url';
    if (mode === 'navigate' && item.navigatePath) {
      if (item.examId) {
        try {
          sessionStorage.setItem('adaptiveJumpExamId', item.examId);
        } catch {
          /* ignore */
        }
      }
      setLocation(item.navigatePath);
      return;
    }
    const url = item.fileUrl;
    if (!url) return;

    const fullUrl = resolveFileUrl(url);
    const isPdf =
      item.displayType?.toLowerCase() === 'pdf' ||
      fullUrl.toLowerCase().includes('.pdf') ||
      mode === 'preview';

    if (isPdf) {
      setPreviewItem({ ...item, fileUrl: fullUrl });
      return;
    }

    if (item.displayType?.toLowerCase() === 'video' || fullUrl.includes('youtube') || fullUrl.includes('youtu.be')) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setPreviewItem({ ...item, fileUrl: fullUrl });
  };

  const headerBlock = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
        </div>
        <div>
          <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-xl sm:text-2xl">
            Adaptive Learning
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-600">
            Personalized resources from your performance — only content available in your library
          </p>
        </div>
      </div>
      <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md w-fit shrink-0">
        <Sparkles className="w-3 h-3 mr-1" />
        AI Powered
      </Badge>
    </div>
  );

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
        <CardHeader>{headerBlock}</CardHeader>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-gray-600">
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 animate-spin text-purple-600" />
          <span>Analyzing your weak topics and matching library content…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
        <CardHeader>{headerBlock}</CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-white/90 p-4 text-red-800">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              <button
                type="button"
                onClick={fetchAdaptive}
                className="mt-2 text-xs sm:text-sm text-purple-700 underline underline-offset-2 hover:text-purple-900"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cards.length === 0) {
    const reasonKey = meta?.reason ? String(meta.reason) : '';
    const reasonMessage = reasonKey ? EMPTY_REASON_MESSAGES[reasonKey] : null;
    const analyzed = meta?.examResultsAnalyzed ?? 0;
    const libraryItems = meta?.libraryItemsLoaded ?? 0;

    return (
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
        <CardHeader>{headerBlock}</CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 lg:p-6 border border-purple-100 text-center">
            <p className="text-gray-600 mb-2">
              {reasonMessage || 'No adaptive recommendations yet.'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              {reasonMessage
                ? 'Once subjects and library content are set up, recommendations will appear here.'
                : 'Attempt exams so we can infer weak chapters and topics, then map them to notes, videos, quizzes, and papers in your class library.'}
            </p>
            {!reasonMessage && (analyzed > 0 || libraryItems > 0) ? (
              <p className="text-[11px] text-gray-400 mt-2">
                Analyzed {analyzed} exam attempt{analyzed === 1 ? '' : 's'} · {libraryItems} library
                item{libraryItems === 1 ? '' : 's'} loaded
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
        <CardHeader>{headerBlock}</CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
          {cards.map((rec) => {
            const hasContent = rec.recommendedContent?.length > 0;
            const examScore = rec.examScorePercent ?? rec.progressPercent;
            return (
              <div
                key={rec.subjectId}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold bg-gradient-to-r from-purple-500 to-blue-500 shrink-0">
                    {getSubjectIcon(rec.subjectName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{rec.subjectName}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>Exam score {Math.round(examScore)}%</span>
                      <span aria-hidden className="text-gray-300">
                        ·
                      </span>
                      <span>Weak topics: {rec.weakTopicCount}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wide ${priorityBadgeClass(rec.priority)}`}
                      >
                        Priority: {rec.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {hasContent ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {rec.usesLibraryFallback
                        ? 'Recommended from your library'
                        : 'Recommended for your weak areas'}
                    </p>
                    <ul className="space-y-1.5 divide-y divide-gray-100/80 rounded-lg border border-gray-100 overflow-hidden bg-white/60">
                      {rec.recommendedContent.map((item) => {
                        const Icon = getTypeIcon(item.displayType);
                        const isPdf = item.displayType?.toLowerCase() === 'pdf';
                        const actionLabel =
                          item.kind === 'quiz' || item.kind === 'exam'
                            ? 'Open'
                            : isPdf
                              ? 'View only'
                              : item.displayType?.toLowerCase() === 'video'
                                ? 'Watch'
                                : 'View';
                        return (
                          <li key={`${item.kind}-${item._id}`} className="first:rounded-t-lg last:rounded-b-lg">
                            <button
                              type="button"
                              onClick={() => openResource(item)}
                              className="flex items-center gap-2 text-xs sm:text-sm text-left w-full px-3 py-2.5 hover:bg-purple-50/80 text-gray-800 transition-colors"
                            >
                              <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className="truncate w-full text-left">{item.title}</span>
                                {item.topicHint && item.topicHint !== 'From your library' ? (
                                  <span className="text-[11px] text-gray-500 truncate w-full text-left">
                                    Focus: {item.topicHint}
                                  </span>
                                ) : null}
                              </div>
                              <Badge
                                className={`shrink-0 text-[10px] font-semibold ${typeBadgeClass(item.displayType)}`}
                              >
                                {item.displayType}
                              </Badge>
                              <span className="shrink-0 text-[10px] font-medium text-purple-700">
                                {actionLabel}
                              </span>
                              {item.navigatePath || item.fileUrl ? (
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {rec.gapsWithoutContent?.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 space-y-1">
                    <p className="font-semibold uppercase tracking-wide text-[10px] text-amber-900/90">
                      No matching library items
                    </p>
                    {rec.gapsWithoutContent.slice(0, 6).map((topic) => (
                      <p key={topic} className="text-amber-900/85">
                        No recommended content available for this topic:{' '}
                        <span className="font-medium">{topic}</span>
                      </p>
                    ))}
                  </div>
                ) : null}

                {!hasContent && !rec.gapsWithoutContent?.length ? (
                  <p className="text-xs sm:text-sm text-gray-500 italic mt-1">
                    No library content is available for this subject yet. Check back after your teacher
                    adds materials.
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="w-[95vw] max-w-4xl h-[92dvh] max-h-[92dvh] flex flex-col overflow-hidden p-4 sm:p-6">
          {previewItem ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-base sm:text-lg pr-6">{previewItem.title}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Scroll down to read each page. The full page fits your screen width.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-white">
                {previewItem.displayType?.toLowerCase() === 'pdf' ||
                previewItem.fileUrl?.toLowerCase().includes('.pdf') ? (
                  <PdfPreviewPanel
                    fileUrl={previewItem.fileUrl || ''}
                    title={previewItem.title}
                    className="h-full w-full min-h-[min(50dvh,640px)]"
                  />
                ) : previewItem.displayType?.toLowerCase() === 'video' ? (
                  <video src={previewItem.fileUrl} controls className="h-full w-full" />
                ) : (
                  <iframe
                    title={previewItem.title}
                    src={previewItem.fileUrl}
                    className="h-full w-full border-0"
                  />
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
