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
    <nav className="sticky top-0 z-50 border-b border-white/40 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.jpg"
            alt="AsliLearn AI"
            className="h-11 w-11 rounded-xl object-contain shadow-glow ring-2 ring-teal-green-400/40"
          />
          <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            ASLILEARN<span className="text-teal-green-300"> AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-medium text-white/80 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/auth/login">
            <Button
              variant="outline"
              className="h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
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
      className="w-full rounded-2xl border border-ink/10 bg-white/80 px-6 py-5 text-left shadow-sm transition hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-display text-lg font-semibold text-ink sm:text-xl">{q}</span>
        <ChevronDown
          className={`mt-1 h-6 w-6 shrink-0 text-primary transition ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open ? <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{a}</p> : null}
    </button>
  );
}

export default function Homepage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-white">
      <Navbar />

      {/* Hero: brand first, full-bleed, Zoom-readable */}
      <section className="relative min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 70% 20%, rgba(20,184,166,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 10% 80%, rgba(2,132,199,0.25), transparent 50%), linear-gradient(160deg, #062433 0%, #0b3a45 45%, #0f766e 140%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
          }}
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:py-24">
          <p className="animate-fade-rise mb-5 font-display text-lg font-semibold uppercase tracking-[0.2em] text-teal-green-300">
            AsliLearn AI
          </p>
          <h1 className="animate-fade-rise max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            The AI education platform schools demo with confidence.
          </h1>
          <p className="animate-fade-rise mt-6 max-w-2xl text-xl leading-relaxed text-white/80 sm:text-2xl">
            Premium AI tools for teachers, guided learning for students, and an enterprise console for schools.
            readable on Zoom, Teams, and classroom screens.
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
                className="h-14 w-full border-white/35 bg-white/5 px-8 text-lg text-white hover:bg-white/15 hover:text-white sm:w-auto"
              >
                See the platform
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* AI Demo strip */}
      <section id="demo" className="relative border-y border-white/10 bg-ink-soft py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-base font-semibold uppercase tracking-[0.16em] text-teal-green-300">
                AI in action
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold text-white lg:text-[2.5rem]">
                Generate classroom-ready content in one click.
              </h2>
              <p className="mt-4 text-xl leading-relaxed text-white/70">
                Lesson plans, worksheets, flashcards, and mock tests, structured for teaching instead of dumped as plain text.
              </p>
              <ul className="mt-8 space-y-4">
                {["Board-aligned topics", "Premium structured output", "Teacher & student dashboards"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-lg text-white/90">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-teal-green-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="asli-ai-glow relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-teal-green-700/40 to-indigo-blue-800/50 p-8 backdrop-blur-md">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-green-400/20 text-teal-green-200">
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-white">Worksheet Builder</p>
                  <p className="text-base text-white/60">CBSE · Class 10 · Physics</p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl bg-ink/50 p-5 text-base leading-relaxed text-white/85">
                <p className="font-semibold text-teal-green-200">Section 1: Warm-up</p>
                <p>Define centripetal force and give one real-world example from road travel.</p>
                <p className="font-semibold text-teal-green-200 pt-2">Section 2: Practice</p>
                <p>A 2 kg mass moves in a circle of radius 0.5 m at 4 m/s. Find the centripetal force.</p>
              </div>
              <p className="mt-5 text-center text-base text-white/50">Live preview style. Actual tools open after login.</p>
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
                src="/1765111492896.png"
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
      <section id="pricing" className="border-t border-ink/5 bg-ink py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-base font-semibold uppercase tracking-[0.16em] text-teal-green-300">Pricing</p>
            <h2 className="mt-3 font-display text-4xl font-bold">Simple plans. Serious AI.</h2>
            <p className="mt-4 text-xl text-white/70">
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
                    ? "border-teal-green-400/50 bg-teal-green-500/15 shadow-glow"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-teal-green-200">{plan.price}</p>
                <ul className="mt-6 space-y-3">
                  {plan.points.map((p) => (
                    <li key={p} className="flex gap-2 text-lg text-white/80">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-green-300" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="mt-8 block">
                  <Button
                    className={`h-12 w-full ${plan.featured ? "" : "bg-white/10 text-white hover:bg-white/20"}`}
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
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-green-700 to-indigo-blue-800 py-20 sm:py-24">
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <h2 className="font-display text-4xl font-bold text-white lg:text-5xl">
            Ready to show AI education that wows the room?
          </h2>
          <p className="mt-4 text-xl text-white/80">
            Join AsliLearn AI. Built for Indian classrooms, investor demos, and everyday teaching.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/register">
              <Button size="lg" className="h-14 bg-white px-8 text-lg text-ink hover:bg-mist">
                Create account
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="h-14 border-white/40 bg-transparent px-8 text-lg text-white hover:bg-white/10 hover:text-white"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-ink py-14 text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-display text-2xl font-bold text-white">ASLILEARN AI</p>
            <p className="mt-2 max-w-sm text-base leading-relaxed">
              India’s AI-first learning platform for schools, teachers, and students.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-base">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/auth/login" className="hover:text-white">
              Login
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-7xl px-5 text-sm text-white/40 sm:px-8">
          © {new Date().getFullYear()} AsliLearn AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
