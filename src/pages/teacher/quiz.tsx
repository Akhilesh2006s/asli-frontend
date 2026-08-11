import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Trophy, Clock, BookOpen, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api-config';
import { authJsonHeaders } from '@/lib/auth-utils';

type PlatformQuiz = {
  _id: string;
  title: string;
  description?: string;
  scheduleType?: string;
  difficulty?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  subject?: { name?: string } | string;
};

export default function TeacherPlatformQuizPage() {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<PlatformQuiz[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/teacher/platform-quizzes`, {
          headers: authJsonHeaders(),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setQuizzes(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setQuizzes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quiz</h1>
          <p className="text-sm text-slate-600">
            Daily and weekly quizzes assigned to teachers by AsliLearn
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading quizzes…
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No quizzes are assigned to you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((quiz) => {
            const subjectName =
              typeof quiz.subject === 'object' ? quiz.subject?.name : String(quiz.subject || '');
            return (
              <Card key={quiz._id} className="border-sky-100 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.scheduleType && quiz.scheduleType !== 'once' ? (
                      <Badge className="bg-sky-100 text-sky-800 capitalize">{quiz.scheduleType}</Badge>
                    ) : null}
                  </div>
                  {quiz.description ? (
                    <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    {subjectName ? (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {subjectName}
                      </span>
                    ) : null}
                    {quiz.durationMinutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {quiz.durationMinutes} min
                      </span>
                    ) : null}
                    {quiz.totalQuestions != null ? (
                      <span>{quiz.totalQuestions} questions</span>
                    ) : null}
                    {quiz.difficulty ? (
                      <Badge variant="outline" className="capitalize">
                        {quiz.difficulty}
                      </Badge>
                    ) : null}
                  </div>
                  <Button asChild className="w-full bg-sky-600 hover:bg-sky-700">
                    <Link href={`/teacher/quiz/${quiz._id}`}>Start quiz</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
