import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  Atom,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Facebook,
  GraduationCap,
  Instagram,
  Library,
  Lightbulb,
  LineChart,
  Linkedin,
  Menu,
  MessageSquare,
  Play,
  School,
  SlidersHorizontal,
  Star,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
  { value: "13,000+", label: "Active Students", icon: GraduationCap, color: "text-sky-600", bg: "bg-sky-100" },
  { value: "500+", label: "Expert Educators", icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
  { value: "75+", label: "Partner Schools", icon: School, color: "text-orange-500", bg: "bg-orange-100" },
  { value: "95%", label: "Success Rate", icon: Trophy, color: "text-teal-600", bg: "bg-teal-100" },
];

const FEATURES = [
  {
    n: "01",
    icon: Brain,
    title: "Adaptive Learning",
    body: "AI adapts to each student's pace and understanding. Ensures no student is left behind.",
    titleColor: "text-sky-600",
    iconBg: "bg-sky-500",
  },
  {
    n: "02",
    icon: ClipboardCheck,
    title: "Smart Assessments",
    body: "Auto-generate tests, instant grading & insights. Saves teachers hours every week.",
    titleColor: "text-emerald-600",
    iconBg: "bg-emerald-500",
  },
  {
    n: "03",
    icon: Play,
    title: "Interactive Content",
    body: "Engaging multimedia lessons aligned to curriculum. Keeps students genuinely engaged.",
    titleColor: "text-orange-500",
    iconBg: "bg-orange-500",
  },
  {
    n: "04",
    icon: LineChart,
    title: "Learning Analytics",
    body: "Real-time dashboards for students, teachers & admins. Gives school leadership measurable outcomes.",
    titleColor: "text-teal-600",
    iconBg: "bg-teal-500",
  },
  {
    n: "05",
    icon: MessageSquare,
    title: "Communication Hub",
    body: "Seamless communication between teachers, students & parents in one place.",
    titleColor: "text-blue-600",
    iconBg: "bg-blue-600",
  },
  {
    n: "06",
    icon: Library,
    title: "Resource Library",
    body: "Curated digital resources across subjects & grades. One place for every teacher to find quality material.",
    titleColor: "text-emerald-700",
    iconBg: "bg-emerald-600",
  },
];

const STAKEHOLDERS = [
  {
    title: "For Students",
    photo: "/stakeholder-student.png",
    object: "object-top",
    badgeIcon: GraduationCap,
    badgeBg: "bg-sky-500",
    points: [
      "Personalised learning paths",
      "AI-assisted concept clarity",
      "Track progress & goals",
      "Build confidence & skills",
    ],
  },
  {
    title: "For Teachers",
    photo: "/stakeholder-teacher.png",
    object: "object-top",
    badgeIcon: School,
    badgeBg: "bg-emerald-500",
    points: [
      "AI lesson & worksheet studio",
      "Faster planning and grading",
      "Classroom-ready structured output",
      "Clear visibility into class gaps",
    ],
  },
  {
    title: "For Management",
    photo: "/stakeholder-management.png",
    object: "object-top",
    badgeIcon: BarChart3,
    badgeBg: "bg-orange-500",
    points: [
      "Monitor institutional growth",
      "Real-time performance dashboard",
      "Measure academic excellence",
      "Drive continuous improvement",
    ],
  },
];

const STEPS = [
  {
    n: "1",
    icon: UserPlus,
    title: "Create Account",
    body: "Sign up as a school, teacher or admin in just a few minutes.",
    numColor: "text-sky-200",
    titleColor: "text-sky-600",
    iconBg: "bg-sky-500",
  },
  {
    n: "2",
    icon: SlidersHorizontal,
    title: "Choose Your Path",
    body: "Select your board, classes & subjects. AI creates your custom learning path.",
    numColor: "text-emerald-200",
    titleColor: "text-emerald-600",
    iconBg: "bg-emerald-500",
  },
  {
    n: "3",
    icon: BookOpen,
    title: "Learn & Practice",
    body: "Access videos, notes, tests & AI Tutor. Practice & get smarter every day.",
    numColor: "text-orange-200",
    titleColor: "text-orange-500",
    iconBg: "bg-orange-500",
  },
  {
    n: "4",
    icon: BarChart3,
    title: "Track Progress",
    body: "Monitor performance with smart analytics & achieve your goals faster.",
    numColor: "text-teal-200",
    titleColor: "text-teal-600",
    iconBg: "bg-teal-500",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "AsliLearn finally gives us a walkthrough that principals can follow on Zoom — AI tools look classroom-ready, not cluttered.",
    name: "Dr. Neha Sharma",
    role: "Principal",
    photo: "/avatar-3.png",
    pos: "center",
  },
  {
    quote:
      "Teachers generate worksheets that feel like premium reports. Students engage because the structure is clear.",
    name: "Mr. Amit Verma",
    role: "Vice Principal",
    photo: "/avatar-4.png",
    pos: "center",
  },
  {
    quote:
      "Analytics after mocks tell us where to intervene. Weak chapters and pacing issues are no longer guesswork.",
    name: "Ms. Kavitha Rao",
    role: "Academic Coordinator",
    photo: "/stakeholder-teacher.png",
    pos: "top",
  },
];

const PARTNER_SCHOOLS = [
  { name: "Delhi Public School – Amaravati", initial: "DPS", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { name: "Academic Heights Public School", initial: "AHPS", tone: "bg-sky-50 text-sky-800 border-sky-200" },
  { name: "GMR Chinmaya Vidyalaya", initial: "GCV", tone: "bg-violet-50 text-violet-800 border-violet-200" },
  { name: "IPS International Group of Schools", initial: "IPS", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  { name: "Pallavi Progressive High School", initial: "PPHS", tone: "bg-teal-50 text-teal-800 border-teal-200" },
  { name: "Pearls Infinity International School", initial: "PIIS", tone: "bg-rose-50 text-rose-800 border-rose-200" },
  { name: "MVR Montessori EM Digital School", initial: "MVR", tone: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  { name: "& Many More", initial: "+", tone: "bg-slate-50 text-[#0a1f44] border-slate-200" },
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
    a: "Yes. Custom school plans cover admin console, EduOTT, exams, and rollout support. Book a demo and weâ€™ll tailor access for your campus.",
  },
  {
    q: "Can it be demoed on Teams or Zoom?",
    a: "The UI is designed for screen share: large type, clear hierarchy, and high-contrast panels that stay readable on projectors and remote calls.",
  },
];

const HERO_ICONS = [
  { Icon: GraduationCap, className: "left-[8%] top-[18%] opacity-20" },
  { Icon: Atom, className: "left-[42%] top-[12%] opacity-15" },
  { Icon: BookOpen, className: "left-[18%] top-[58%] opacity-15" },
  { Icon: Lightbulb, className: "left-[48%] top-[48%] opacity-20" },
  { Icon: Brain, className: "right-[48%] top-[28%] opacity-10 lg:right-auto lg:left-[55%]" },
];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`homepage-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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
          : "border-transparent bg-[#050d24]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="AsliLearn AI"
            className="h-9 w-9 rounded-lg object-contain ring-2 ring-white/20 sm:h-10 sm:w-10"
          />
          <span
            className={`font-display text-lg font-extrabold tracking-tight sm:text-xl ${
              scrolled ? "text-[#0a1f44]" : "text-white"
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
              variant="outline"
              className={`h-10 border-2 ${
                scrolled
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
              }`}
            >
              Login
            </Button>
          </Link>
          <Link href="/contact" className="hidden sm:block">
            <Button className="h-10 bg-sky-500 px-4 text-white hover:bg-sky-600">Book a Demo</Button>
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
        <div
          className={`border-t px-4 py-4 xl:hidden ${
            scrolled ? "border-slate-200 bg-white" : "border-white/10 bg-[#050d24]"
          }`}
        >
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
                <Button className="h-11 w-full bg-sky-500 text-white hover:bg-sky-600">Book a Demo</Button>
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
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Navbar scrolled={scrolled} />

      {/* HERO — exact mock: blended photo, aligned head/headline, soft glow */}
      <section className="relative overflow-hidden bg-[#050d24] pb-28 pt-10 sm:pb-32 sm:pt-14 lg:pb-36 lg:pt-16">
        {/* Soft grid / mesh */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 40% 40%, black 20%, transparent 75%)",
          }}
          aria-hidden
        />

        {/* Light-stream curves */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 1440 700"
          fill="none"
          aria-hidden
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M-40 420 C280 280 420 520 720 360 C980 220 1180 300 1500 180"
            stroke="url(#heroStream)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M-20 520 C320 380 500 600 780 440 C1040 300 1220 380 1520 260"
            stroke="url(#heroStream)"
            strokeWidth="1"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="heroStream" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="45%" stopColor="#60a5fa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Decorative education icons */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {HERO_ICONS.map(({ Icon, className }, i) => (
            <Icon key={i} className={`absolute h-12 w-12 text-sky-200/25 sm:h-14 sm:w-14 ${className}`} strokeWidth={1.2} />
          ))}
        </div>

        {/* Full-bleed blended photo (desktop) — head lines up with headline */}
        <div
          className="pointer-events-none absolute bottom-16 right-0 top-10 hidden w-[54%] lg:block xl:w-[56%]"
          aria-hidden
        >
          <img
            src={HERO_PHOTO}
            alt=""
            className="h-full w-full object-cover object-[68%_10%]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050d24] via-[#050d24]/55 to-transparent to-[42%]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#050d24] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050d24]/80 to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[22rem] max-w-7xl items-center gap-10 px-4 sm:px-6 lg:min-h-[28rem] lg:grid-cols-2 lg:gap-8 lg:px-8 xl:min-h-[30rem]">
          {/* Left copy — vertically centered with photo */}
          <div className="relative z-10 max-w-xl">
            <h1
              className="animate-fade-rise font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]"
              style={{ animationDelay: "0ms" }}
            >
              AI-First Learning.
              <br />
              Future-Ready Schools.
            </h1>
            <p
              className="animate-fade-rise mt-5 max-w-lg text-base font-medium leading-relaxed text-white/75 sm:text-lg"
              style={{ animationDelay: "110ms" }}
            >
              AsliLearn.ai empowers schools with intelligent tools to personalise learning, elevate teaching, and
              drive measurable outcomes.
            </p>
            <div
              className="animate-fade-rise mt-8 flex w-full flex-col gap-3 sm:max-w-lg sm:flex-row sm:items-center"
              style={{ animationDelay: "200ms" }}
            >
              <Link href="/contact" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="group h-12 w-full rounded-full bg-sky-500 px-5 pl-6 text-base font-semibold text-white hover:bg-sky-600 sm:w-auto"
                >
                  Book a Demo
                  <span className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/30">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </Link>
              <a href="#platform" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border border-white/55 bg-transparent px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Explore the Platform
                </Button>
              </a>
            </div>
            <div
              className="animate-fade-rise mt-8 flex items-center gap-3"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex -space-x-2.5">
                {["/avatar-1.png", "/avatar-2.png", "/avatar-3.png", "/avatar-4.png"].map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-[#050d24] object-cover"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-white/70 sm:text-base">
                Trusted by <span className="font-bold text-sky-300">500+</span> schools across India
              </p>
            </div>
          </div>

          {/* Mobile / tablet photo (desktop uses blended layer) */}
          <div className="relative z-10 w-full lg:invisible lg:h-[28rem] lg:pointer-events-none">
            <div className="overflow-hidden rounded-3xl shadow-2xl shadow-black/40 lg:hidden">
              <img
                src={HERO_PHOTO}
                alt="Student learning with tablet and notes"
                className="aspect-[5/4] w-full object-cover object-[70%_12%]"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Metrics pill overlapping hero */}
      <section className="relative z-20 -mt-14 px-4 sm:-mt-16 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-slate-100 bg-white px-3 py-5 shadow-[0_24px_60px_-28px_rgba(5,13,36,0.55)] sm:rounded-full sm:px-6 sm:py-5">
            <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {METRICS.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="flex items-center gap-3 px-3 py-3 sm:justify-center sm:px-4 sm:py-1">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${m.bg}`}>
                      <Icon className={`h-5 w-5 ${m.color}`} />
                    </span>
                    <div>
                      <p className={`font-display text-xl font-extrabold leading-none sm:text-2xl ${m.color}`}>
                        {m.value}
                      </p>
                      <p className="mt-1 text-[0.7rem] font-medium text-slate-500 sm:text-xs">{m.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Features — overlapping number badges + dashed snake path (exact mock) */}
      <section id="features" className="relative scroll-mt-24 bg-[#fafbfc] py-16 sm:py-24">
        <div
          className="pointer-events-none absolute left-6 top-10 hidden h-28 w-28 opacity-50 lg:block"
          style={{
            backgroundImage: "radial-gradient(#94a3b8 1.4px, transparent 1.4px)",
            backgroundSize: "11px 11px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-10 right-6 hidden h-28 w-28 opacity-50 lg:block"
          style={{
            backgroundImage: "radial-gradient(#94a3b8 1.4px, transparent 1.4px)",
            backgroundSize: "11px 11px",
          }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#0a1f44] sm:text-4xl lg:text-[2.65rem]">
                Powerful Features.{" "}
                <span className="relative inline-block text-sky-600">
                  Purposeful
                  <span className="absolute -bottom-1 left-0 right-0 mx-auto h-[3px] w-[72%] rounded-full bg-sky-500" />
                </span>{" "}
                <span className="text-sky-600">Impact.</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-14 px-8 sm:mt-16 sm:px-10 lg:px-14">
            {/* Curvy dashed snake — all segments arched like 03↔06 */}
            <svg
              className="pointer-events-none absolute inset-x-4 inset-y-0 z-[1] hidden h-full w-full lg:block sm:inset-x-6 lg:inset-x-10"
              viewBox="0 0 1000 400"
              fill="none"
              aria-hidden
              preserveAspectRatio="none"
            >
              <path
                d="
                  M 55 95
                  C 140 55, 230 135, 333 95
                  C 430 55, 520 135, 667 95
                  C 760 55, 850 120, 905 95
                  C 980 55, 1010 160, 980 200
                  C 950 250, 980 310, 905 305
                  C 820 345, 740 265, 667 305
                  C 560 345, 440 265, 333 305
                  C 240 345, 150 265, 55 305
                  C -10 265, -20 135, 55 95
                "
                stroke="#94a3b8"
                strokeWidth="2.5"
                strokeDasharray="7 9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="relative z-[2] grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-14 lg:grid-cols-3 lg:gap-x-16 lg:gap-y-20">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.n} delay={i * 60} className="h-full">
                    <article className="relative flex h-full min-h-[7.5rem] items-center rounded-2xl border border-slate-100/80 bg-white py-5 pl-11 pr-5 shadow-[0_10px_36px_-18px_rgba(15,23,42,0.35)] sm:min-h-[8.25rem] sm:pl-12 sm:pr-6">
                      <span className="absolute -left-[18px] top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#0a1f44] font-display text-[11px] font-bold text-white shadow-md ring-[5px] ring-[#fafbfc] sm:-left-5 sm:h-10 sm:w-10 sm:text-xs sm:ring-[6px]">
                        {f.n}
                      </span>

                      <div className="flex w-full items-center gap-3.5 sm:gap-4">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm sm:h-12 sm:w-12 ${f.iconBg}`}
                        >
                          <Icon className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-display text-base font-bold leading-tight sm:text-lg ${f.titleColor}`}>
                            {f.title}
                          </h3>
                          <p className="mt-1 text-[0.8125rem] leading-snug text-slate-600 sm:text-sm sm:leading-relaxed">
                            {f.body}
                          </p>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders — portrait cards with connector path */}
      <section id="platform" className="scroll-mt-24 bg-[#f4f7fb] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight text-[#0a1f44] sm:text-4xl">
              Benefits for <span className="text-sky-600">Every Stakeholder</span>
            </h2>
          </Reveal>

          <div className="relative mt-16">
            {/* Dashed connector across cards (desktop) */}
            <div
              className="pointer-events-none absolute left-[16%] right-[16%] top-[4.75rem] hidden items-center lg:flex"
              aria-hidden
            >
              <div className="h-0 flex-1 border-t-2 border-dashed border-slate-300" />
              <span className="mx-1 h-3 w-3 shrink-0 rounded-full bg-sky-500" />
              <div className="h-0 flex-1 border-t-2 border-dashed border-slate-300" />
              <span className="mx-1 h-3 w-3 shrink-0 rounded-full bg-emerald-500" />
              <div className="h-0 flex-1 border-t-2 border-dashed border-slate-300" />
            </div>

            <div className="relative grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {STAKEHOLDERS.map((s, i) => {
                const BadgeIcon = s.badgeIcon;
                return (
                  <Reveal key={s.title} delay={i * 100}>
                  <div className="relative flex flex-col items-center pt-2">
                    {/* Portrait + side badge */}
                    <div className="relative z-10 mb-[-2.75rem] flex items-center">
                      <div className="h-[7.5rem] w-[7.5rem] overflow-hidden rounded-full border-[5px] border-white bg-amber-300 shadow-xl sm:h-32 sm:w-32">
                        <img
                          src={s.photo}
                          alt=""
                          className={`h-full w-full object-cover ${s.object}`}
                          loading="lazy"
                        />
                      </div>
                      <span
                        className={`absolute -right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-white shadow-md sm:-right-4 ${s.badgeBg}`}
                      >
                        <BadgeIcon className="h-5 w-5" />
                      </span>
                    </div>

                    <div className="w-full rounded-2xl bg-[#0a1f44] px-6 pb-7 pt-14 text-left shadow-lg">
                      <h3 className="font-display text-xl font-bold text-white">{s.title}</h3>
                      <ul className="mt-4 space-y-3">
                        {s.points.map((p) => (
                          <li key={p} className="flex gap-2.5 text-sm text-white/85">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {/* How it works */}
      <section id="about" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-extrabold text-[#0a1f44] sm:text-4xl">
              How <span className="relative inline-block">it<span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-sky-500" /></span> Works
            </h2>
          </Reveal>

          <div className="relative mt-14">
            <svg
              className="pointer-events-none absolute left-0 right-0 top-8 hidden h-16 w-full lg:block"
              viewBox="0 0 1000 64"
              fill="none"
              aria-hidden
              preserveAspectRatio="none"
            >
              <path
                d="M80 32 C200 8 280 56 400 32 C520 8 600 56 720 32 C840 8 900 40 920 32"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="6 8"
                strokeLinecap="round"
              />
              <path d="M920 32 L940 28 L940 36 Z" fill="#cbd5e1" />
            </svg>

            <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.n} className="relative text-center">
                    <span
                      className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 select-none font-display text-[7rem] font-extrabold leading-none ${step.numColor}`}
                      aria-hidden
                    >
                      {step.n}
                    </span>
                    <div className="relative z-10 pt-10">
                      <span
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ${step.iconBg}`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className={`mt-5 font-display text-xl font-bold ${step.titleColor}`}>{step.title}</h3>
                      <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials + Partners */}
      <section id="resources" className="scroll-mt-24 bg-[#0a1f44] py-10 text-white sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8">
          <div className="min-w-0">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Loved by Educators. <span className="text-sky-300">Trusted by Schools.</span>
              </h2>
            </Reveal>
            <div className="mt-5 h-[22rem] overflow-hidden">
              <div className="homepage-marquee homepage-marquee-testimonials flex flex-col gap-3">
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, index) => (
                  <article
                    key={`${t.name}-${index}`}
                    className="flex w-full shrink-0 flex-col rounded-xl bg-white p-4 text-slate-900 shadow-md"
                    aria-hidden={index >= TESTIMONIALS.length}
                  >
                    <div className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-3 text-[0.8125rem] italic leading-relaxed text-slate-700">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-[#0a1f44]">{t.name}</p>
                        <p className="text-[0.7rem] text-slate-500">{t.role}</p>
                      </div>
                      <img
                        src={t.photo}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                        style={{ objectPosition: t.pos }}
                        loading="lazy"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <Reveal>
              <h2 className="font-display text-xl font-extrabold sm:text-2xl">Our Partner Schools</h2>
            </Reveal>
            <div className="mt-5 h-[22rem] overflow-hidden">
              <div className="homepage-marquee homepage-marquee-partners flex flex-col gap-3">
                {[...PARTNER_SCHOOLS, ...PARTNER_SCHOOLS].map((school, index) => (
                  <div
                    key={`${school.name}-${index}`}
                    className={`flex h-[4.75rem] w-full shrink-0 items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm ${school.tone}`}
                    aria-hidden={index >= PARTNER_SCHOOLS.length}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 font-display text-xs font-extrabold shadow-sm">
                      {school.initial}
                    </span>
                    <p className="font-display text-sm font-semibold leading-snug">{school.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-extrabold text-[#0a1f44] sm:text-4xl">
              Simple, <span className="text-sky-600">Transparent</span> Pricing
            </h2>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_-24px_rgba(10,31,68,0.35)]">
              <div className="bg-[#0a1f44] px-6 py-5 text-white">
                <h3 className="font-display text-xl font-bold">Student Plan</h3>
                <p className="mt-0.5 text-sm text-white/70">Board + IIT</p>
              </div>
              <div className="px-6 py-6">
                <p className="font-display text-3xl font-extrabold text-sky-600">
                  ₹249 <span className="text-base font-semibold text-slate-500">/ month per child</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Access to all videos & notes",
                    "AI Tutor — 10 queries/day",
                    "Practice tests & quizzes",
                    "Progress reports & analytics",
                    "Community access",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="mt-8 block">
                  <Button className="h-12 w-full rounded-full bg-sky-500 text-base font-semibold text-white hover:bg-sky-600">
                    Start 7-Day Free Trial
                  </Button>
                </Link>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_-24px_rgba(10,31,68,0.35)]">
              <div className="bg-emerald-500 px-6 py-5 text-white">
                <h3 className="font-display text-xl font-bold">Teacher Plan</h3>
                <p className="mt-0.5 text-sm text-white/80">&nbsp;</p>
              </div>
              <div className="px-6 py-6">
                <p className="font-display text-3xl font-extrabold text-emerald-600">
                  ₹3,999 <span className="text-base font-semibold text-slate-500">/ year per teacher</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Unlimited AI Tutor access",
                    "All teaching resources",
                    "AI grading & assessments",
                    "Advanced analytics",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="mt-8 block">
                  <Button className="h-12 w-full rounded-full bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600">
                    Start 7-Day Free Trial
                  </Button>
                </Link>
              </div>
            </article>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            School-wide and customised institutional plans are available on request.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-[#f4f7fb] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-extrabold text-[#0a1f44] sm:text-4xl">FAQ</h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-4 pb-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 rounded-2xl bg-orange-500 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
          <div className="flex items-start gap-3 text-white sm:items-center">
            <CalendarClock className="mt-0.5 h-7 w-7 shrink-0 sm:mt-0" />
            <p className="font-display text-base font-semibold leading-snug sm:text-lg">
              Ready to Build Future-Ready Schools? Join India&apos;s AI-First Learning Platform for Schools.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
            <Link href="/contact" className="w-full sm:w-auto">
              <Button className="h-11 w-full rounded-full bg-white px-5 font-semibold text-sky-600 hover:bg-white/95 sm:w-auto">
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-11 w-full rounded-full border-2 border-white bg-transparent px-5 font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Talk to Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1f44] pt-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="AsliLearn AI" className="h-9 w-9 rounded-lg object-contain" />
              <span className="font-display text-lg font-extrabold tracking-tight">
                ASLILEARN<span className="text-sky-300">.AI</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              AsliLearn AI
              <br />
              Empowering schools with intelligent learning tools across India.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <ul className="space-y-2.5 text-sm text-white/80">
                {[
                  { href: "#features", label: "Features" },
                  { href: "#platform", label: "Platform" },
                  { href: "#pricing", label: "Pricing" },
                  { href: "#resources", label: "Resources" },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ul className="space-y-2.5 text-sm text-white/80">
                {[
                  { href: "#about", label: "About Us" },
                  { href: "#faq", label: "FAQ" },
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Use" },
                ].map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith("#") ? (
                      <a href={l.href} className="hover:text-white">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/90">For enquiries, contact:</p>
            <p className="mt-2 text-sm text-white/75">987 654 3210</p>
            <a href="mailto:hello@aslilearn.ai" className="mt-1 block text-sm text-sky-300 hover:text-sky-200">
              hello@aslilearn.ai
            </a>
            <div className="mt-4 flex gap-2">
              {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <ul className="space-y-3">
              {[
                "Secure Student Data",
                "Role-based Access",
                "School-controlled Accounts",
                "Reliable Cloud Platform",
                "Dedicated Support",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-white/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
          © {new Date().getFullYear()} AsliLearn AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
