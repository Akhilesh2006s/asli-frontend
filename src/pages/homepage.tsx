import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Library,
  LineChart,
  Menu,
  MessageSquare,
  Phone,
  School,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const HERO_PHOTO = "/file_000000009ae082079e1d3de4f3bd3a3e.png";
const GROUP_PHOTO = "/file_00000000411c8206be42efa220120ba0.png";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
  { href: "#resources", label: "Resources" },
  { href: "#about", label: "About Us" },
  { href: "#faq", label: "FAQ" },
];

const METRICS = [
  { value: "13,000+", label: "Active Students", icon: GraduationCap, tone: "text-sky-600 bg-sky-50" },
  { value: "500+", label: "Expert Educators", icon: Users, tone: "text-emerald-600 bg-emerald-50" },
  { value: "75+", label: "Partner Schools", icon: School, tone: "text-orange-600 bg-orange-50" },
  { value: "95%", label: "Success Rate", icon: Trophy, tone: "text-teal-600 bg-teal-50" },
];

const FEATURES = [
  {
    n: "01",
    icon: Brain,
    title: "Adaptive Learning",
    body: "AI adapts to each student’s pace with personalised practice and concept paths.",
  },
  {
    n: "02",
    icon: ClipboardCheck,
    title: "Smart Assessments",
    body: "Auto-generate tests, instant grading, and actionable insights after every attempt.",
  },
  {
    n: "03",
    icon: BookOpen,
    title: "Interactive Content",
    body: "Multimedia lessons, EduOTT videos, and notes aligned to board curriculum.",
  },
  {
    n: "04",
    icon: LineChart,
    title: "Learning Analytics",
    body: "Real-time dashboards for students, teachers, and school leadership.",
  },
  {
    n: "05",
    icon: MessageSquare,
    title: "Communication Hub",
    body: "Keep school, teachers, and families aligned with clear progress signals.",
  },
  {
    n: "06",
    icon: Library,
    title: "Resource Library",
    body: "Curated digital resources across subjects, grades, and exam pathways.",
  },
];

const STAKEHOLDERS = [
  {
    title: "For Students",
    photo: HERO_PHOTO,
    object: "object-[72%_20%]",
    points: [
      "Personalised learning paths",
      "Concept clarity with AI Tutor",
      "Track progress after every mock",
      "Build confidence for board & entrance",
    ],
  },
  {
    title: "For Teachers",
    photo: GROUP_PHOTO,
    object: "object-[62%_25%]",
    points: [
      "AI lesson & worksheet studio",
      "Faster planning and grading",
      "Classroom-ready structured output",
      "Clear visibility into class gaps",
    ],
  },
  {
    title: "For Management",
    photo: GROUP_PHOTO,
    object: "object-[28%_30%]",
    points: [
      "Monitor institutional growth",
      "Performance dashboards",
      "Measure excellence across classes",
      "Continuous improvement loops",
    ],
  },
];

const STEPS = [
  {
    n: "1",
    icon: Sparkles,
    title: "Create Account",
    body: "Sign up in minutes for school, teacher, or student access.",
  },
  {
    n: "2",
    icon: FolderOpen,
    title: "Choose Your Path",
    body: "Select board, classes, and subjects — AI shapes the learning path.",
  },
  {
    n: "3",
    icon: BookOpen,
    title: "Learn & Practice",
    body: "Videos, notes, exams, and Vidya AI Tutor in one guided flow.",
  },
  {
    n: "4",
    icon: BarChart3,
    title: "Track Progress",
    body: "Monitor performance with smart analytics and weak-chapter plans.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "AsliLearn finally gives us a walkthrough that principals can follow on Zoom — AI tools look classroom-ready, not cluttered.",
    name: "Dr. Neha Sharma",
    role: "Principal",
  },
  {
    quote:
      "Teachers generate worksheets that feel like premium reports. Students engage because the structure is clear.",
    name: "Mr. Amit Verma",
    role: "Vice Principal",
  },
  {
    quote:
      "Analytics after mocks tell us where to intervene. Weak chapters and pacing issues are no longer guesswork.",
    name: "Ms. Kavitha Rao",
    role: "Academic Coordinator",
  },
];

const PARTNER_NAMES = [
  "Delhi Public School",
  "Narayana",
  "Vibgyor",
  "Podar",
  "Oakridge",
  "Chaitanya",
  "FIITJEE Schools",
  "Many more",
];

const FAQS = [
  {
    q: "Who is AsliLearn AI for?",
    a: "Schools, teachers, and students across CBSE and IIT/NEET pathways, plus individual teachers and learners who want a personal AI study workspace.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Students and teachers can start a 7-day free trial to explore AI tools, practice, and analytics before subscribing.",
  },
  {
    q: "What boards and subjects are covered?",
    a: "CBSE and IIT/NEET pathways with subject, topic, and sub-topic trees managed centrally. Content is aligned for classroom and competitive prep.",
  },
  {
    q: "Do you offer institutional plans?",
    a: "Yes. Custom school plans cover admin console, EduOTT, exams, and rollout support. Book a demo and we’ll tailor access for your campus.",
  },
  {
    q: "Can it be demoed on Teams or Zoom?",
    a: "The UI is designed for screen share: large type, clear hierarchy, and high-contrast panels that stay readable on projectors and remote calls.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-sky-300 sm:px-6 sm:py-5"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-display text-base font-semibold text-slate-900 sm:text-lg">{q}</span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-sky-600 transition ${open ? "rotate-180" : ""}`} />
      </div>
      {open ? <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{a}</p> : null}
    </button>
  );
}

function Navbar({ scrolled }: { scrolled: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled
          ? "border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
          : "border-white/10 bg-[#061a33]/70 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="AsliLearn AI"
            className={`h-9 w-9 rounded-lg object-contain sm:h-10 sm:w-10 ${
              scrolled ? "ring-2 ring-sky-200" : "ring-2 ring-white/25"
            }`}
          />
          <span
            className={`font-display text-lg font-extrabold tracking-tight sm:text-xl ${
              scrolled ? "text-slate-900" : "text-white"
            }`}
          >
            ASLILEARN<span className={scrolled ? "text-sky-600" : "text-sky-300"}>.AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition ${
                scrolled ? "text-slate-600 hover:text-sky-700" : "text-white/85 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/auth/login" className="hidden sm:block">
            <Button
              variant="ghost"
              className={`h-10 ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}
            >
              Login
            </Button>
          </Link>
          <Link href="/contact" className="hidden sm:block">
            <Button className="h-10 bg-sky-600 px-4 text-white hover:bg-sky-700">Book a Demo</Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`xl:hidden ${scrolled ? "text-slate-800" : "text-white hover:bg-white/10"}`}
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={`border-t px-4 py-4 xl:hidden ${scrolled ? "border-slate-200 bg-white" : "border-white/10 bg-[#061a33]"}`}>
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  scrolled ? "text-slate-700 hover:bg-slate-50" : "text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="h-11 w-full border-slate-300 bg-white text-slate-800">
                  Login
                </Button>
              </Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)}>
                <Button className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700">Book a Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f8fc] text-slate-900">
      <Navbar scrolled={scrolled} />

      {/* HERO — full bleed photo, brand first */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#061a33]">
        <img
          src={HERO_PHOTO}
          alt="Student studying with tablet, notes, and sticky notes"
          className="absolute inset-0 h-full w-full object-cover object-[78%_center] sm:object-[70%_center] lg:object-[68%_center]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(105deg, rgba(6,26,51,0.94) 0%, rgba(6,26,51,0.82) 36%, rgba(6,26,51,0.42) 58%, rgba(6,26,51,0.18) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#061a33]/80 to-transparent sm:hidden"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:justify-center sm:px-6 sm:pb-20 lg:px-8 lg:py-24">
          <p className="animate-fade-rise font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            ASLILEARN<span className="text-sky-300">.AI</span>
          </p>
          <h1 className="animate-fade-rise mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:max-w-3xl lg:text-6xl">
            AI-First Learning.
            <br />
            Future-Ready Schools.
          </h1>
          <p className="animate-fade-rise mt-5 max-w-xl text-base font-medium leading-relaxed text-white/85 sm:text-lg lg:max-w-2xl lg:text-xl">
            AsliLearn.ai empowers schools with intelligent tools to personalise learning, elevate teaching, and
            drive measurable outcomes.
          </p>
          <div className="animate-fade-rise mt-8 flex w-full flex-col gap-3 sm:max-w-lg sm:flex-row">
            <Link href="/contact" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full bg-sky-600 px-7 text-base text-white hover:bg-sky-700 sm:h-14 sm:w-auto sm:text-lg">
                Book a Demo
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#platform" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-white/40 bg-white/10 px-7 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:h-14 sm:w-auto sm:text-lg"
              >
                Explore the Platform
              </Button>
            </a>
          </div>
          <div className="animate-fade-rise mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {/* Faces from group study photo — distinct crops only */}
              {[
                { pos: "18% 28%" },
                { pos: "38% 30%" },
                { pos: "58% 28%" },
                { pos: "78% 30%" },
              ].map((face, i) => (
                <img
                  key={i}
                  src={GROUP_PHOTO}
                  alt=""
                  className="h-9 w-9 rounded-full border-2 border-[#061a33] object-cover"
                  style={{ objectPosition: face.pos }}
                  aria-hidden
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white/80 sm:text-base">Trusted by 500+ schools across India</p>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="relative z-10 -mt-8 px-4 sm:-mt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200/90 bg-white px-4 py-5 shadow-lg sm:px-8 sm:py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {METRICS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${m.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-xl font-extrabold text-[#061a33] sm:text-2xl">{m.value}</p>
                    <p className="text-xs font-medium text-slate-500 sm:text-sm">{m.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#061a33] sm:text-4xl lg:text-5xl">
              Powerful Features. Purposeful Impact.
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Everything your school needs to teach, learn, assess, and improve — in one AI-first platform.
            </p>
          </div>
          <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.n}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-sm font-bold text-sky-600">{f.n}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#061a33]">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stakeholders / Platform */}
      <section id="platform" className="scroll-mt-24 border-y border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-[#061a33] sm:text-4xl">
              Benefits for Every Stakeholder
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              One platform that serves students, teachers, and school leadership together.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {STAKEHOLDERS.map((s) => (
              <article
                key={s.title}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm"
              >
                <div className="relative h-44 overflow-hidden sm:h-52">
                  <img
                    src={s.photo}
                    alt=""
                    className={`h-full w-full object-cover ${s.object}`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061a33]/70 to-transparent" />
                  <h3 className="absolute bottom-4 left-5 font-display text-2xl font-bold text-white">{s.title}</h3>
                </div>
                <ul className="space-y-3 p-5 sm:p-6">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-slate-700 sm:text-base">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="about" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-extrabold text-[#061a33] sm:text-4xl">
            How it Works
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#061a33] text-white shadow-md">
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-sky-600">
                    Step {step.n}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-[#061a33]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="resources" className="scroll-mt-24 bg-[#061a33] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Loved by Educators</h2>
              <div className="mt-8 space-y-4">
                {TESTIMONIALS.map((t) => (
                  <blockquote key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <div className="mb-3 flex gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-white/90 sm:text-base">“{t.quote}”</p>
                    <footer className="mt-4">
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="text-sm text-sky-200">{t.role}</p>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Our Partner Schools</h2>
              <p className="mt-3 text-white/70">Schools and networks we support across India.</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
                {PARTNER_NAMES.map((name) => (
                  <div
                    key={name}
                    className="flex min-h-[72px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-4 text-center text-sm font-semibold text-white/90"
                  >
                    {name}
                  </div>
                ))}
              </div>
              <div className="relative mt-8 overflow-hidden rounded-2xl">
                <img
                  src={GROUP_PHOTO}
                  alt="Students collaborating on Physics, Chemistry, and Mathematics"
                  className="h-48 w-full object-cover object-center sm:h-56"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061a33]/80 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white/90">
                  Real classrooms. Board pathways. Measurable outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-[#061a33] sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Start with a 7-day free trial. Custom institutional plans available on request.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-sky-600">Student Plan</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-[#061a33]">Board + IIT</h3>
              <p className="mt-4 font-display text-4xl font-extrabold text-[#061a33]">
                ₹249<span className="text-lg font-semibold text-slate-500"> / month</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">per child</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Videos & notes access",
                  "AI Tutor · 10 queries / day",
                  "Practice tests & mocks",
                  "Progress reports",
                ].map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-slate-700 sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="mt-8 block">
                <Button className="h-12 w-full bg-sky-600 text-white hover:bg-sky-700">
                  Start 7-Day Free Trial
                </Button>
              </Link>
            </article>

            <article className="rounded-2xl border-2 border-sky-500 bg-sky-50/60 p-7 shadow-md sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-sky-700">Teacher Plan</p>
              <h3 className="mt-2 font-display text-2xl font-bold text-[#061a33]">AI Studio</h3>
              <p className="mt-4 font-display text-4xl font-extrabold text-[#061a33]">
                ₹3,999<span className="text-lg font-semibold text-slate-500"> / year</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">per teacher</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Unlimited AI Tutor access",
                  "Lesson plans, worksheets, papers",
                  "AI grading support",
                  "Priority support",
                ].map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-slate-700 sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="mt-8 block">
                <Button className="h-12 w-full bg-[#061a33] text-white hover:bg-[#0a2748]">
                  Start 7-Day Free Trial
                </Button>
              </Link>
            </article>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Need a school-wide rollout?{" "}
            <Link href="/contact" className="font-semibold text-sky-700 underline-offset-2 hover:underline">
              Talk to us about institutional pricing
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold text-[#061a33] sm:text-4xl">FAQ</h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Orange CTA banner */}
      <section className="bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 py-12 sm:py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:flex-row lg:justify-between lg:text-left lg:px-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              Ready to Build Future-Ready Schools?
            </h2>
            <p className="mt-2 text-base text-white/90 sm:text-lg">
              Join India’s AI-first learning platform for schools, teachers, and students.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/contact">
              <Button className="h-12 w-full bg-white px-6 text-[#061a33] hover:bg-orange-50 sm:w-auto">
                Book a Demo
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="h-12 w-full border-white/70 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Talk to Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#041426] py-14 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
          <div>
            <p className="font-display text-xl font-extrabold text-white">
              ASLILEARN<span className="text-sky-400">.AI</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              India’s AI-first learning platform for schools. Hyderabad, Telangana.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-sky-400" />
                <a href="tel:+919876543210" className="hover:text-white">
                  987 654 3210
                </a>
              </p>
              <p>
                <a href="mailto:hello@aslilearn.ai" className="hover:text-white">
                  hello@aslilearn.ai
                </a>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <a href="#features" className="block hover:text-white">
                Features
              </a>
              <a href="#platform" className="block hover:text-white">
                Platform
              </a>
              <a href="#pricing" className="block hover:text-white">
                Pricing
              </a>
              <a href="#resources" className="block hover:text-white">
                Resources
              </a>
            </div>
            <div className="space-y-2">
              <a href="#about" className="block hover:text-white">
                About Us
              </a>
              <a href="#faq" className="block hover:text-white">
                FAQ
              </a>
              <Link href="/privacy" className="block hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block hover:text-white">
                Terms of Use
              </Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-white">Built for schools</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {[
                "Secure student data",
                "Role-based access",
                "School-controlled accounts",
                "Reliable cloud platform",
                "Dedicated support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-7xl px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} AsliLearn AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
