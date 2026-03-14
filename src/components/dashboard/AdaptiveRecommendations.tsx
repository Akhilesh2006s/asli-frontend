import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Sparkles,
  Video,
  FileText,
  ClipboardList,
  Play,
  ExternalLink,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import {
  generateAdaptiveRecommendations,
  type SubjectProgressItem,
  type ExamResultItem,
  type QuizItem,
  type SubjectItem,
  type VideoItem,
  type ContentItem,
  type AdaptiveRecommendation,
} from '@/utils/adaptiveLearning';
import { API_BASE_URL } from '@/lib/api-config';

export interface AdaptiveRecommendationsProps {
  subjectProgress: SubjectProgressItem[];
  examResults: ExamResultItem[];
  quizzes: QuizItem[];
  subjects: SubjectItem[];
  videos?: VideoItem[];
  content: ContentItem[];
}

function getSubjectIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('math')) return '∑';
  if (n.includes('physics')) return 'Φ';
  if (n.includes('chemistry')) return '⚗';
  if (n.includes('biology')) return '🧬';
  return name.substring(0, 2).toUpperCase();
}

export default function AdaptiveRecommendations({
  subjectProgress,
  examResults,
  quizzes,
  subjects,
  videos = [],
  content,
}: AdaptiveRecommendationsProps) {
  const [, setLocation] = useLocation();

  const recommendations = useMemo(
    () =>
      generateAdaptiveRecommendations({
        subjectProgress,
        examResults,
        quizzes,
        subjects,
        videos,
        content,
      }),
    [subjectProgress, examResults, quizzes, subjects, videos, content]
  );

  const handleOpenContent = (item: ContentItem) => {
    const url = item.fileUrl;
    if (!url) return;
    const fullUrl =
      url.startsWith('http') || url.startsWith('//')
        ? url
        : url.startsWith('/')
          ? `${API_BASE_URL}${url}`
          : `${API_BASE_URL}/${url}`;
    window.open(fullUrl, '_blank');
  };

  const handleOpenVideo = (video: VideoItem) => {
    const url = video.youtubeUrl || video.videoUrl;
    if (url) {
      const fullUrl = url.startsWith('http') || url.startsWith('//') ? url : url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
      window.open(fullUrl, '_blank');
    } else {
      setLocation(`/subject/${(video as VideoItem & { subjectId?: string }).subjectId || ''}`);
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-2xl">
                  Adaptive Learning
                </CardTitle>
                <p className="text-sm text-gray-600">AI-powered personalized recommendations</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-purple-100 text-center">
            <p className="text-gray-600 mb-2">No weak topics right now.</p>
            <p className="text-sm text-gray-500">
              Complete exams and quizzes to get personalized video, notes, and quiz recommendations for topics that need more practice.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-200 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-2xl">
                Adaptive Learning
              </CardTitle>
              <p className="text-sm text-gray-600">Personalized recommendations for your weak topics</p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {recommendations.map((rec: AdaptiveRecommendation) => (
          <div
            key={rec.subjectId || rec.subject}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold ${
                    rec.color || 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}
                >
                  {getSubjectIcon(rec.subject)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{rec.subject}</h3>
                  <p className="text-xs text-gray-500">Progress {rec.progress}%</p>
                </div>
              </div>
              <div className="w-24">
                <Progress value={rec.progress} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {rec.recommendations.videos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    Recommended Videos
                  </p>
                  <ul className="space-y-1.5">
                    {rec.recommendations.videos.map((v) => (
                      <li key={v._id}>
                        <button
                          type="button"
                          onClick={() => handleOpenVideo(v)}
                          className="flex items-center gap-2 text-sm text-left w-full rounded-md px-2 py-1.5 hover:bg-purple-50 text-gray-800"
                        >
                          <Play className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span className="truncate flex-1">{v.title || 'Untitled Video'}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rec.recommendations.notes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Recommended Notes
                  </p>
                  <ul className="space-y-1.5">
                    {rec.recommendations.notes.map((n) => (
                      <li key={n._id}>
                        <button
                          type="button"
                          onClick={() => handleOpenContent(n)}
                          className="flex items-center gap-2 text-sm text-left w-full rounded-md px-2 py-1.5 hover:bg-blue-50 text-gray-800"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="truncate flex-1">{n.title || 'Untitled'}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rec.recommendations.quizzes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Practice Quiz
                  </p>
                  {rec.recommendations.quizzes.map((q) => (
                    <Button
                      key={q._id}
                      onClick={() => setLocation(`/quiz/${q._id}`)}
                      className="w-full justify-between bg-gradient-to-r from-orange-500 to-teal-500 hover:from-orange-600 hover:to-teal-600 text-white shadow-md"
                    >
                      <span className="truncate mr-2">{q.title || 'Start Quiz'}</span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              )}

              {rec.recommendations.videos.length === 0 &&
                rec.recommendations.notes.length === 0 &&
                rec.recommendations.quizzes.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No content available for this subject yet.</p>
                )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
