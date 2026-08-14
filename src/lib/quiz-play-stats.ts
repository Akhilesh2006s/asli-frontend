export type DailyHistoryRow = {
  dateKey: string;
  score: number | null;
  correctCount?: number;
  totalQuestions?: number;
};

export type DailyPlayStatus = {
  today?: {
    dateKey: string;
    completed: boolean;
    score: number | null;
    correctCount?: number;
    totalQuestions?: number;
  };
  history?: DailyHistoryRow[];
  nextUnlockDateKey?: string;
  lockedUntilTomorrow?: boolean;
};

function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive completed daily-quiz days ending today (or yesterday if today is still open). */
export function consecutiveDailyStreak(
  status: DailyPlayStatus | null | undefined,
): number {
  if (!status) return 0;
  const todayKey = status.today?.dateKey;
  if (!todayKey) return 0;

  const completed = new Set(
    (status.history || [])
      .filter((row) => row.score != null || Number(row.correctCount) > 0)
      .map((row) => row.dateKey),
  );
  if (status.today?.completed) completed.add(todayKey);

  let cursor = status.today?.completed ? todayKey : shiftDateKey(todayKey, -1);
  let streak = 0;
  while (completed.has(cursor) && streak < 365) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export type QuizPlayStats = {
  quizzesDone: number;
  quizzesGoal: number;
  accuracy: number;
  streak: number;
  xp: number;
  level: number;
  xpProgress: number;
};

export function computeQuizPlayStats(
  status: DailyPlayStatus | null | undefined,
  extraScores: number[] = [],
): QuizPlayStats {
  const streak = consecutiveDailyStreak(status);
  const todayDone = Boolean(status?.today?.completed);
  const quizzesDone = todayDone ? 1 : 0;
  const quizzesGoal = 1;

  const scores: number[] = [...extraScores];
  if (status?.today?.completed && status.today.score != null) {
    scores.push(Number(status.today.score));
  }
  for (const row of status?.history || []) {
    if (row.score != null) scores.push(Number(row.score));
  }
  const accuracy =
    scores.length > 0
      ? Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length)
      : 0;

  let xp = 0;
  if (status?.today?.completed) {
    xp += 80 + Math.round(Number(status.today.score) || 0);
  }
  for (const row of status?.history || []) {
    xp += 40 + Math.round(Number(row.score) || 0);
  }
  xp += extraScores.reduce((sum, n) => sum + 20 + Math.round(n), 0);
  xp += streak * 25;

  const level = Math.max(1, Math.floor(xp / 400) + 1);
  const xpIntoLevel = xp % 400;
  const xpProgress = Math.min(100, Math.round((xpIntoLevel / 400) * 100));

  return {
    quizzesDone,
    quizzesGoal,
    accuracy,
    streak,
    xp,
    level,
    xpProgress,
  };
}

export function streakCheer(streak: number): string {
  if (streak >= 14) return 'Unstoppable!';
  if (streak >= 7) return 'Amazing streak!';
  if (streak >= 3) return 'Keep it going!';
  if (streak >= 1) return 'Nice start!';
  return 'Start today!';
}

export function accuracyCheer(accuracy: number): string {
  if (accuracy >= 85) return 'Excellent!';
  if (accuracy >= 70) return 'Great job!';
  if (accuracy >= 50) return 'Keep going!';
  if (accuracy > 0) return 'Practice pays off';
  return 'Take a quiz';
}
