import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type TrialQuiz = {
  _id: string;
  title: string;
  description?: string;
  subject?: { name?: string } | string;
};

const SKIP_PREFIXES = ['/auth/', '/iq-rank-boost/quiz/', '/super-admin', '/super_admin', '/admin/'];

/**
 * After login / on app load: prompt individual trial users to take unfinished
 * trial-only quizzes marked promptOnLogin.
 */
export function TrialLoginQuizPrompt() {
  const [location, setLocation] = useLocation();
  const [quiz, setQuiz] = useState<TrialQuiz | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const pathOnly = location.split('?')[0];
      if (SKIP_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(p))) return;
      if (sessionStorage.getItem('trialLoginQuizDismissed') === '1') return;

      try {
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) return;
        const meData = await meRes.json();
        const user = meData.user || meData;
        if (!user?.isIndividualAccount || user.role !== 'student') return;
        if (user.subscriptionStatus === 'active' || user.paymentRequired) return;

        const res = await fetch(`${API_BASE_URL}/api/auth/trial-login-quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const pending: TrialQuiz[] = json.data || [];
        if (cancelled || pending.length === 0) return;
        setQuiz(pending[0]);
        setOpen(true);
      } catch {
        /* ignore */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [location]);

  const dismiss = () => {
    sessionStorage.setItem('trialLoginQuizDismissed', '1');
    setOpen(false);
  };

  const startQuiz = () => {
    if (!quiz?._id) return;
    setOpen(false);
    setLocation(`/iq-rank-boost/quiz/${quiz._id}`);
  };

  const subjectName =
    quiz?.subject && typeof quiz.subject === 'object'
      ? quiz.subject.name
      : typeof quiz?.subject === 'string'
        ? quiz.subject
        : '';

  return (
    <Dialog open={open && !!quiz} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick trial quiz</DialogTitle>
          <DialogDescription>
            Complete this short quiz to continue exploring your trial.
            {subjectName ? ` Subject: ${subjectName}.` : ''}
          </DialogDescription>
        </DialogHeader>
        {quiz && (
          <div className="space-y-1 py-2">
            <p className="font-medium text-slate-900">{quiz.title}</p>
            {quiz.description ? (
              <p className="text-sm text-slate-600 line-clamp-3">{quiz.description}</p>
            ) : null}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={dismiss}>
            Later
          </Button>
          <Button type="button" onClick={startQuiz}>
            Take quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
