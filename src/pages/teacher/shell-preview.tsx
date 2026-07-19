import { ArrowRight, GraduationCap, PlayCircle, Users2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { teacherNav } from "@/lib/app-nav";

/**
 * Preview surface for the new teacher app shell.
 *
 * Content here is static and illustrative — the point is to evaluate the shell
 * (rail, collapse, topbar, search, badges, profile menu) before it is rolled
 * into `pages/teacher/dashboard.tsx`.
 */

const stats = [
  { label: "Total Students", value: "88", caption: "Across all classes", icon: Users2, tone: "indigo" },
  { label: "Active Classes", value: "7", caption: "Currently running", icon: GraduationCap, tone: "sky" },
  { label: "Videos", value: "0", caption: "Content available", icon: PlayCircle, tone: "teal" },
] as const;

const toneStyles: Record<string, string> = {
  indigo: "from-indigo-blue-50 to-indigo-blue-100/60 text-indigo-blue-600",
  sky: "from-sky-50 to-sky-100/60 text-sky-600",
  teal: "from-teal-50 to-teal-100/60 text-teal-600",
};

const classes = [
  { name: "7A", subjects: "English, SL Hindi, SL Telugu, TL Telugu, Social, Physics…", students: 13, room: "Room 7A" },
  { name: "7C", subjects: "English, SL Hindi, SL Telugu, Social, Chemistry, Science", students: 9, room: "Room 7C" },
  { name: "8B", subjects: "English, SL Hindi, SL Telugu, Social, TL Telugu, Science", students: 24, room: "Room 8B" },
  { name: "8A", subjects: "English, SL Hindi, Social, TL Hindi, TL Telugu, Science", students: 19, room: "Room 8A" },
  { name: "9B", subjects: "English, SL Telugu, Social, TL Hindi, TL Telugu, Science", students: 14, room: "Room 9B" },
  { name: "6A", subjects: "English, SL Hindi, SL Telugu, Social, Physics, Chemistry…", students: 1, room: "Room 6A" },
];

export default function TeacherShellPreview() {
  return (
    <AppShell
      nav={teacherNav}
      orgName="Brainfeed High School"
      orgSubtitle="Teacher Portal"
      user={{ name: "Satyaram", role: "Teacher" }}
      showUpgrade
    >
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-blue-600 via-indigo-blue-500 to-violet-500 p-6 text-white sm:p-10">
          <p className="text-sm font-medium text-white/80">Welcome back, Satyaram! 👋</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            Empower learning.
            <br />
            Inspire <span className="text-sky-300">every day.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
            Track progress, manage classes and create impactful learning experiences with AsliLearn AI.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-blue-700 transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Explore Insights
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        {/* Stats */}
        <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(({ label, value, caption, icon: Icon, tone }) => (
            <div
              key={label}
              className={`rounded-2xl border border-border bg-gradient-to-br ${toneStyles[tone]} p-5`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-soft">{label}</p>
                  <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Classes */}
        <section aria-labelledby="my-classes-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5">
            <h2 id="my-classes-heading" className="font-display text-xl font-bold text-ink">
              My Classes
            </h2>
            <p className="text-sm text-muted-foreground">Overview of all your classes and schedules</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => (
              <article key={c.name} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-blue-600 text-sm font-bold text-white">
                    {c.name}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{c.subjects}</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Students</dt>
                    <dd className="font-semibold text-ink tabular-nums">{c.students}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Room</dt>
                    <dd className="font-semibold text-ink">{c.room}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View Students
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
