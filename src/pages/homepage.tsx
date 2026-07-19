import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  School,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Vidya AI Tutor",
    body: "Personal AI that explains concepts like a top teacher. Get instant doubt clearing, adaptive practice, and board-aligned answers.",
  },
  {
    icon: Sparkles,
    title: "Teacher AI Studio",
    body: "Generate lesson plans, worksheets, flashcards, and question papers in minutes with premium structured output.",
  },
  {
    icon: BookOpen,
    title: "EduOTT Classroom",
    body: "Curated video learning mapped to CBSE and IIT/NEET pathways. Watch, practice, and track mastery in one flow.",
  },
  {
    icon: GraduationCap,
    title: "Exams & Rank Boost",
    body: "Mock tests, IQ Rank Boost activities, and analytics that help schools and students measure real progress.",
  },
];

const AUDIENCES = [
  {
    icon: School,
    title: "Schools",
    body: "Enterprise console for boards, content, exams, live EduOTT, and AI tooling. Built for demos and institutional rollout.",
  },
  {
    icon: Users,
    title: "Teachers",
    body: "Plan, generate, and assign in one workspace. Less paperwork, more teaching. Every tool is Zoom-readable.",
  },
  {
    icon: GraduationCap,
    title: "Students",
    body: "Clear learning paths, AI tutoring, practice, and flashcards that feel modern, calm, and easy to start.",
  },
];

const FAQS = [
  {
    q: "Who is AsliLearn AI for?",
    a: "Schools, teachers, and students across CBSE and IIT/NEET pathways, plus individual teachers and learners who want a personal AI study workspace.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Teachers and students can start with a simple signup and explore AI tools during the free trial period before purchasing a subscription.",
  },
  {
    q: "What boards and subjects are covered?",
    a: "CBSE and IIT/NEET pathways with subject, topic, and sub-topic trees managed centrally. Content is aligned for classroom and competitive prep.",
  },
  {
    q: "Can it be demoed on Teams or Zoom?",
    a: "The UI is designed for screen share: large type, clear hierarchy, and high-contrast panels that stay readable on projectors and remote calls.",
  },
];

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.jpg"
            alt="AsliLearn AI"
            className="h-11 w-11 rounded-xl object-contain shadow-glow ring-2 ring-teal-green-400/40"
          />
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            ASLILEARN<span className="text-indigo-blue-600"> AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-semibold text-slate-600 transition hover:text-indigo-blue-700"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="h-11 border-slate-300 bg-white text-slate-700 hover:bg-indigo-blue-50 hover:text-indigo-blue-700"
            >
              Login
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="h-11 shadow-glow">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      aria-controls={`faq-${q.replace(/\W+/g, "-").toLowerCase()}`}
      className="w-full rounded-2xl border border-ink/10 bg-white/80 px-6 py-5 text-left shadow-sm transition hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-display text-lg font-semibold text-ink sm:text-xl">{q}</span>
        <ChevronDown
          className={`mt-1 h-6 w-6 shrink-0 text-primary transition ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open ? <p id={`faq-${q.replace(/\W+/g, "-").toLowerCase()}`} className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{a}</p> : null}
    </button>
  );
}

export default function Homepage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900">
      <Navbar />

      {/* Hero: brand first, full-bleed, Zoom-readable */}
      <section className="relative min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 78% 12%, rgba(99,102,241,0.20), transparent 58%), radial-gradient(ellipse 60% 50% at 8% 82%, rgba(249,115,22,0.12), transparent 54%), linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #fff7ed 140%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(71,85,105,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
          }}
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:py-24">
          <p className="animate-fade-rise mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-blue-200 bg-white/80 px-4 py-2 font-display text-base font-bold uppercase tracking-[0.16em] text-indigo-blue-700 shadow-sm">
            <Sparkles className="h-5 w-5" /> AsliLearn AI
          </p>
          <h1 className="animate-fade-rise max-w-5xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Teach smarter. Learn faster. Run your school with AI.
          </h1>
          <p className="animate-fade-rise mt-6 max-w-3xl text-xl font-medium leading-relaxed text-slate-600 sm:text-2xl">
            One clear platform for school leaders, teachers, and students, with classroom-ready AI tools,
            guided learning, exams, analytics, and EduOTT.
          </p>
          <div className="animate-fade-rise mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/auth/register">
              <Button size="lg" className="h-14 w-full px-8 text-lg shadow-glow-lg sm:w-auto">
                Start free trial
                <ArrowRight className="h-6 w-6" />
              </Button>
            </Link>
            <a href="#platform">
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-full border-indigo-blue-200 bg-white px-8 text-lg text-indigo-blue-700 hover:bg-indigo-blue-50 hover:text-indigo-blue-800 sm:w-auto"
              >
                See the platform
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* AI Demo strip */}
      <section id="demo" className="relative border-y border-indigo-blue-100 bg-gradient-to-br from-indigo-blue-50 via-white to-sky-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-base font-bold uppercase tracking-[0.16em] text-indigo-blue-600">
                AI in action
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold text-slate-900 lg:text-[2.5rem]">
                Generate classroom-ready content in one click.
              </h2>
              <p className="mt-4 text-xl leading-relaxed text-slate-600">
                Lesson plans, worksheets, flashcards, and mock tests, structured for teaching instead of dumped as plain text.
              </p>
              <ul className="mt-8 space-y-4">
                {["Board-aligned topics", "Premium structured output", "Teacher & student dashboards"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-lg font-medium text-slate-700">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-indigo-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="asli-ai-glow relative overflow-hidden rounded-3xl border border-indigo-blue-100 bg-white p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-blue-100 text-indigo-blue-600">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-slate-900">Worksheet Builder</p>
                  <p className="text-base text-slate-500">CBSE · Class 10 · Physics</p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base leading-relaxed text-slate-700">
                <p className="font-bold text-indigo-blue-700">Section 1: Warm-up</p>
                <p>Define centripetal force and give one real-world example from road travel.</p>
                <p className="pt-2 font-bold text-indigo-blue-700">Section 2: Practice</p>
                <p>A 2 kg mass moves in a circle of radius 0.5 m at 4 m/s. Find the centripetal force.</p>
              </div>
              <p className="mt-5 text-center text-base text-slate-500">Live preview style. Actual tools open after login.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="asli-app-bg py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-base font-semibold uppercase tracking-[0.16em] text-primary">Features</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink lg:text-[2.5rem]">
              Why schools choose AsliLearn
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              One AI-first platform spanning teaching, learning, content, and institutional control.
            </p>
          </div>
          <div className="mt-14 grid gap-7 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="asli-card-premium p-8">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-ink">{f.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform overview / audiences */}
      <section id="platform" className="border-t border-ink/5 bg-white/60 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-base font-semibold uppercase tracking-[0.16em] text-primary">Platform</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-ink lg:text-[2.5rem]">
              Built for schools, teachers, and students.
            </h2>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <article key={a.title} className="rounded-3xl border border-ink/10 bg-mist p-8 shadow-elevated">
                  <Icon className="mb-5 h-10 w-10 text-primary" />
                  <h3 className="font-display text-2xl font-semibold text-ink">{a.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{a.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="asli-app-bg py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-stretch gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-[360px] overflow-hidden rounded-3xl shadow-elevated">
              <img
                src="/campus-learning.jpg"
                alt="Students learning together on a school campus"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#062433]/90 via-[#062433]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-9">
                <p className="text-[0.9375rem] font-bold uppercase tracking-[0.16em] text-teal-green-200">
                  Designed for real classrooms
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Clear in a classroom. Impressive in a demo.
                </h2>
              </div>
            </div>

            <div>
              <h2 className="font-display text-4xl font-bold text-[#0b1f2a]">
                Trusted in classroom demos
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-[#4b6470]">
                Feedback themes we consistently design around for schools and teachers.
              </p>
              <div className="mt-7 grid gap-5">
                {[
                  {
                    quote:
                      "On Zoom the old UI looked tiny. AsliLearn’s hierarchy finally lets principals see AI tools clearly in a walkthrough.",
                    name: "School Academic Head",
                    initials: "AH",
                  },
                  {
                    quote:
                      "Teachers generate worksheets that look like premium reports, not a wall of text. Students actually engage.",
                    name: "Senior Science Teacher",
                    initials: "ST",
                  },
                ].map((t, index) => (
                  <blockquote
                    key={t.name}
                    className="rounded-3xl border border-[#d5e8ec] bg-white p-7 shadow-elevated"
                  >
                    <p className="text-xl font-medium leading-relaxed text-[#0b1f2a]">
                      “{t.quote}”
                    </p>
                    <footer className="mt-6 flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white ${
                          index === 0
                            ? "bg-gradient-to-br from-teal-green-500 to-indigo-blue-600"
                            : "bg-gradient-to-br from-amber-400 to-orange-500"
                        }`}
                      >
                        {t.initials}
                      </span>
                      <span className="text-base font-bold text-[#0f766e]">{t.name}</span>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-200 bg-gradient-to-br from-slate-100 via-white to-indigo-blue-50 py-20 text-slate-900 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-base font-bold uppercase tracking-[0.16em] text-indigo-blue-600">Pricing</p>
            <h2 className="mt-3 font-display text-4xl font-bold">Simple plans. Serious AI.</h2>
            <p className="mt-4 text-xl text-slate-600">
              Start with a free trial. Upgrade when your school or individual workspace is ready.
            </p>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {[
              {
                name: "Free Trial",
                price: "7 days",
                points: ["AI tools preview", "Student study basics", "No card required to explore"],
              },
              {
                name: "Teacher",
                price: "Subscription",
                points: ["Full AI studio", "Lesson & worksheet suite", "Downloads & usage insights"],
                featured: true,
              },
              {
                name: "Institution",
                price: "Custom",
                points: ["School admin console", "EduOTT & exams", "Board rollout support"],
              },
            ].map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl border p-8 ${
                  plan.featured
                    ? "border-indigo-blue-300 bg-indigo-blue-50 shadow-elevated"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-indigo-blue-700">{plan.price}</p>
                <ul className="mt-6 space-y-3">
                  {plan.points.map((p) => (
                    <li key={p} className="flex gap-2 text-lg text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-blue-600" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="mt-8 block">
                  <Button
                    className={`h-12 w-full ${plan.featured ? "" : "bg-white text-slate-800 hover:bg-indigo-blue-50"}`}
                    variant={plan.featured ? "default" : "outline"}
                  >
                    Get started
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="asli-app-bg py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-center font-display text-4xl font-bold text-ink">FAQ</h2>
          <div className="mt-10 space-y-4">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-y border-indigo-blue-100 bg-gradient-to-br from-indigo-blue-50 via-white to-orange-50 py-20 sm:py-24">
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <h2 className="font-display text-4xl font-bold text-slate-950 lg:text-5xl">
            Ready to show AI education that wows the room?
          </h2>
          <p className="mt-4 text-xl text-slate-600">
            Join AsliLearn AI. Built for Indian classrooms, investor demos, and everyday teaching.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/register">
              <Button size="lg" className="h-14 px-8 text-lg">
                Create account
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="h-14 border-indigo-blue-200 bg-white px-8 text-lg text-indigo-blue-700 hover:bg-indigo-blue-50 hover:text-indigo-blue-800"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-14 text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-display text-2xl font-bold text-slate-900">ASLILEARN AI</p>
            <p className="mt-2 max-w-sm text-base leading-relaxed">
              India’s AI-first learning platform for schools, teachers, and students.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-base">
            <Link href="/privacy" className="hover:text-indigo-blue-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-indigo-blue-700">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-indigo-blue-700">
              Contact
            </Link>
            <Link href="/auth/login" className="hover:text-indigo-blue-700">
              Login
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-7xl px-5 text-base text-slate-gray-600 sm:px-8">
          © {new Date().getFullYear()} AsliLearn AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
