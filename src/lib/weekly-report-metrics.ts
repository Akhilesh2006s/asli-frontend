export type WeeklyReportTile = {
  label: string;
  value: string;
  hint?: string;
};

function n(v: unknown, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

/** Display teacher engagement status (stored as active | occasional | inactive). */
export function formatTeacherStatus(status: unknown): string {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "active") return "Active";
  if (raw === "occasional") return "Occasional";
  if (raw === "inactive") return "Inactive";
  if (!raw || raw === "—" || raw === "-") return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function teacherActivityTiles(m: Record<string, unknown>): WeeklyReportTile[] {
  return [
    { label: "Logins this week", value: String(n(m.loginCount)), hint: "Days you opened the app" },
    { label: "Sessions", value: String(n(m.sessions)), hint: "Times you started using it" },
    {
      label: "Time on platform",
      value: String(m.totalTimeLabel || `${n(m.minutes)} min`),
      hint: "Total time spent this week",
    },
    { label: "Last active", value: String(m.lastActiveDate || "—"), hint: "Your most recent visit" },
    {
      label: "Status (last 14 days)",
      value: formatTeacherStatus(m.status),
      hint: "Active if used on 3 or more of the last 14 days",
    },
    {
      label: "Active days (last 14 days)",
      value: String(n(m.activeDays)),
      hint: "Days used in the last 2 weeks",
    },
    { label: "Classes assigned", value: String(n(m.classesAssigned)), hint: "Classes you teach" },
    {
      label: "Students in classes",
      value: String(n(m.studentsInClasses)),
      hint: "Learners across your classes",
    },
  ];
}

export function teacherAiTiles(m: Record<string, unknown>): WeeklyReportTile[] {
  return [
    {
      label: "AI resources created",
      value: String(n(m.generationsCreated)),
      hint: "Worksheets, notes and more you made",
    },
    { label: "Vidya AI asks", value: String(n(m.aiDoubts)), hint: "Questions you asked Vidya AI" },
    { label: "Tool opens", value: String(n(m.aiToolUses)), hint: "Times you opened an AI tool" },
  ];
}

export function teacherSchoolTiles(m: Record<string, unknown>): WeeklyReportTile[] {
  return [
    {
      label: "Students accessed",
      value: String(n(m.schoolStudentsAccessed)),
      hint: "Students who used the app",
    },
    {
      label: "School sessions",
      value: String(n(m.schoolSessions)),
      hint: "Total sessions across your school",
    },
    {
      label: "Teachers active",
      value: String(n(m.schoolTeachersActive)),
      hint: "Colleagues active this week",
    },
  ];
}

/** Compact preview — same wording as the PDF, no truncated labels. */
export function teacherPreviewTiles(m: Record<string, unknown>): WeeklyReportTile[] {
  const activity = teacherActivityTiles(m);
  const ai = teacherAiTiles(m);
  const school = teacherSchoolTiles(m);
  return [
    activity[0],
    activity[1],
    activity[2],
    ai[0],
    ai[1],
    activity[4],
    school[0],
    school[1],
  ];
}

export function studentPreviewTiles(m: Record<string, unknown>): WeeklyReportTile[] {
  return [
    { label: "Logins this week", value: String(n(m.loginCount)) },
    { label: "Learning sessions", value: String(n(m.sessions)) },
    { label: "Total time", value: String(m.totalTimeLabel || `${n(m.minutes)} min`) },
    { label: "Exams written", value: String(n(m.examAttempts)) },
    { label: "Average exam score", value: n(m.examAttempts) > 0 ? `${n(m.avgExamPct)}%` : "—" },
    { label: "Offline tests", value: String(n(m.omrAttempts)) },
    { label: "AI uses", value: String(n(m.aiExplanations)) },
    { label: "Current streak", value: n(m.streak) > 0 ? `${n(m.streak)} days` : "0" },
  ];
}
