import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  FileText,
  Flame,
  Link2,
  PlayCircle,
  School,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { usePageSeo } from "@/components/marketing/seo";
import { IndividualPlanCheckout } from "@/components/b2c/IndividualPlanCheckout";
import {
  CLASS_TRACK_MATRIX,
  IIT_TOOLS_LINKED_TO_BOOKS,
  IIT_TRACK_SPECS,
} from "@/lib/iit-track-specs";

export default function FeaturesPage() {
  usePageSeo({
    title: "Features | AsliLearn.ai AI-Powered Learning Platform",
    description:
      "Explore AsliLearn.ai features: adaptive learning, smart assessments, interactive content, analytics, teacher tools and school visibility.",
    path: "/features",
  });

  const items = [
    {
      title: "Adaptive Learning",
      body: "Personalised pathways that adjust to each student’s pace across Board and IIT Foundation programmes.",
    },
    {
      title: "Smart Assessments",
      body: "Generate practice and tests, grade faster, and surface clear insights for teachers and school leaders.",
    },
    {
      title: "Interactive Content",
      body: "Videos, notes and practice aligned to curriculum — ready for classroom and homework use.",
    },
    {
      title: "Learning Analytics",
      body: "Real-time progress for students, class dashboards for teachers, and school-level visibility for admins.",
    },
    {
      title: "Teacher Tools",
      body: "AI-assisted lesson support, assessment creation, grading help and priority academic support on Teacher Plan.",
    },
    {
      title: "School Operations",
      body: "Multi-class coverage for Classes 6–10 with board alignment and institutional reporting.",
    },
  ];

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Platform Features"
        title="Everything schools need to personalise learning"
        subtitle="Board-aligned resources, IIT Foundation support and AI-assisted teaching tools in one platform."
      >
        <Link href="/book-a-demo">
          <Button className="h-11 rounded-full bg-sky-500 px-6 font-semibold text-white hover:bg-sky-600">
            Book a Demo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </MarketingPageHero>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {items.map((f) => (
          <article key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-slate-900">{f.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </article>
        ))}
      </section>
    </MarketingShell>
  );
}

export function PlatformPage() {
  usePageSeo({
    title: "Platform | How AsliLearn.ai Supports Schools",
    description:
      "See how AsliLearn.ai supports students, teachers and school leadership with Board learning, IIT Foundation and measurable academic visibility.",
    path: "/platform",
  });
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="The Platform"
        title="One platform for students, teachers and schools"
        subtitle="AsliLearn.ai connects personalised student learning, powerful teacher workflows and school-level academic visibility."
      />
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-14 sm:px-6 lg:px-8">
        {[
          {
            h: "For students",
            p: "Board-aligned videos, notes, practice and progress tracking — with optional IIT Foundation depth.",
          },
          {
            h: "For teachers",
            p: "Teaching resources, assessment creation, AI-assisted grading support and class analytics.",
          },
          {
            h: "For schools",
            p: "Multi-class coverage, board alignment and leadership dashboards for measurable academic decisions.",
          },
        ].map((b) => (
          <div key={b.h} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="font-display text-2xl font-bold text-slate-900">{b.h}</h2>
            <p className="mt-2 text-slate-600">{b.p}</p>
          </div>
        ))}
        <Link href="/book-a-demo">
          <Button className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700">
            Request a school demo
          </Button>
        </Link>
      </section>
    </MarketingShell>
  );
}

export function PricingPage() {
  usePageSeo({
    title: "Pricing | Board, Board + IIT Alpha/Beta/Gamma — AsliLearn.ai",
    description:
      "AsliLearn.ai pricing: Board Learning ₹99/month, IIT Foundation ₹249/month with Asli Prep Alpha, Beta or Gamma books by class. Teacher Plan ₹3,999/year.",
    path: "/pricing",
  });
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Pick your class, then pick the IIT book"
        subtitle="Board learning at ₹99/month, or IIT Foundation at ₹249/month with Asli Prep Alpha, Beta or Gamma — class-wise, so quizzes and AI tools follow that material."
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <IndividualPlanCheckout variant="card" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Class-wise IIT materials</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          You choose one Asli Prep book for the child’s class. Vidya, daily quizzes, worksheets and practice
          exams all pull from that same book.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Recommended book</th>
                <th className="px-4 py-3">Also available</th>
              </tr>
            </thead>
            <tbody>
              {CLASS_TRACK_MATRIX.map((row) => {
                const rec = IIT_TRACK_SPECS.find((t) => t.code === row.recommended);
                const also = row.also
                  .map((code) => IIT_TRACK_SPECS.find((t) => t.code === code)?.book)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <tr key={row.classNumber} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">Class {row.classNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{rec?.book}</td>
                    <td className="px-4 py-3 text-slate-600">{also || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Teacher Plan is ₹3,999/year. School-wide plans are quoted separately —{' '}
          <Link href="/book-a-demo" className="font-semibold text-sky-700 hover:underline">
            book a demo
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}

export function ResourcesPage() {
  usePageSeo({
    title: "Resources | Asli Prep Alpha & Beta on AsliLearn.ai",
    description:
      "Explore Asli Prep Alpha and Beta learning tracks, Board and IIT Foundation packages, AI tutoring, quizzes, mock tests and chapter-linked resources.",
    path: "/resources",
  });

  const tools = [
    {
      icon: Brain,
      title: "Vidya — Your AI Tutor",
      body: "Ask doubts anytime and get chapter-linked explanations with clear, step-by-step solutions.",
      color: "bg-violet-100 text-violet-700",
    },
    {
      icon: ClipboardList,
      title: "Daily Quiz & Question Bank",
      body: "Fresh practice mapped to your class, learning track and current chapters.",
      color: "bg-sky-100 text-sky-700",
    },
    {
      icon: Target,
      title: "Adaptive Practice",
      body: "Practice responds to performance, reinforcing weaker topics while strong topics move faster.",
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      icon: BarChart3,
      title: "Mock Tests & Exams",
      body: "Board-pattern and competitive-style tests with automatic scoring and instant analysis.",
      color: "bg-orange-100 text-orange-700",
    },
    {
      icon: BookOpen,
      title: "Board Content",
      body: "Notes, revision and practice for Board preparation alongside Foundation learning.",
      color: "bg-blue-100 text-blue-700",
    },
    {
      icon: PlayCircle,
      title: "Video Lessons",
      body: "Short, concept-first videos aligned to the chapters students are studying.",
      color: "bg-rose-100 text-rose-700",
    },
    {
      icon: FileText,
      title: "Formula Sheets & Revision",
      body: "Quick, printable-style summaries for focused revision before tests.",
      color: "bg-cyan-100 text-cyan-700",
    },
    {
      icon: Trophy,
      title: "PYQs",
      body: "Previous-year questions for JEE, NEET and major Olympiads, organised by topic.",
      color: "bg-amber-100 text-amber-700",
    },
    {
      icon: Flame,
      title: "Streaks, XP & Leaderboards",
      body: "Motivating progress features that help students build a consistent learning habit.",
      color: "bg-red-100 text-red-700",
    },
    {
      icon: Zap,
      title: "Progress Analytics",
      body: "Chapter-wise strengths and gaps for students, with class insight for teachers and schools.",
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  const faqs = [
    {
      q: "Do I need to buy a book to use AsliLearn.ai?",
      a: "No. AsliLearn.ai runs on a monthly subscription. The Board Package provides board-syllabus learning, while the IIT Foundation Package adds digital Alpha/Beta books and competitive-exam preparation.",
    },
    {
      q: "What is the difference between the two packages?",
      a: "The ₹99/month Board Package focuses on Board content, quizzes and practice exams. The ₹249/month IIT Foundation Package includes everything in Board, plus the digital Asli Prep Alpha, Beta or Gamma book for that class, with every IIT tool linked to that book.",
    },
    {
      q: "What IIT materials does AsliLearn.ai use?",
      a: "We use Asli Prep Alpha (Classes 6–8), Asli Prep Beta (Classes 6–10) and Asli Prep Gamma (Classes 8–10). Vidya, daily quizzes, worksheets and practice exams are generated from the same chapter in the book you select — they are not a separate IIT syllabus.",
    },
    {
      q: "Does AsliLearn.ai cover Board exams too?",
      a: "Yes. Students can prepare for their Board syllabus and competitive-exam foundations in one connected learning environment.",
    },
    {
      q: "How often are new questions added?",
      a: "The question bank is refreshed regularly across supported classes, subjects and learning tracks.",
    },
  ];

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Asli Prep × AsliLearn.ai"
        title="Every Asli Prep Book Comes Alive on AsliLearn.ai"
        subtitle="Alpha, Beta and Gamma are the Asli Prep IIT books we use. Quizzes, Vidya, worksheets and practice exams all follow the same chapter in that book."
      >
        <a href="#learning-tracks">
          <Button className="h-11 rounded-full bg-sky-500 px-6 font-semibold text-white hover:bg-sky-600">
            Explore Resources <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
        <Link href="/pricing">
          <Button
            variant="outline"
            className="h-11 rounded-full border-white/50 bg-transparent px-6 font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            View Packages
          </Button>
        </Link>
      </MarketingPageHero>

      <section className="border-b border-sky-100 bg-sky-50/70 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">How it works</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-4xl">
              Choose your package. Learn with AI every day.
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Pick the package that matches your goal. Your chapters, quizzes and AI lessons then follow your
              class and Asli Prep learning track automatically.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-sky-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Board Package</p>
              <p className="mt-3 font-display text-4xl font-extrabold text-slate-950">
                ₹99<span className="text-base font-medium text-slate-500">/month</span>
              </p>
              <p className="mt-4 text-slate-600">
                Full Board-syllabus content, quizzes and practice for focused school learning.
              </p>
              <ul className="mt-5 space-y-2">
                {["Board-aligned learning", "Quizzes and practice", "Progress tracking"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="relative overflow-hidden rounded-3xl border border-violet-200 bg-[#071b43] p-6 text-white shadow-xl sm:p-8">
              <span className="absolute right-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">
                Complete access
              </span>
              <p className="text-sm font-bold uppercase tracking-wide text-violet-200">IIT Foundation Package</p>
              <p className="mt-3 font-display text-4xl font-extrabold">
                ₹249<span className="text-base font-medium text-white/60">/month</span>
              </p>
              <p className="mt-4 text-white/75">
                Everything in Board, plus the digital Asli Prep Alpha / Beta / Gamma book for the child's class.
              </p>
              <ul className="mt-5 space-y-2">
                {["Digital Asli Prep Alpha / Beta / Gamma books", "IIT tools tied to that book chapter", "JEE, NEET & Olympiad practice exams"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-white/90">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Pick your package", "Choose Board or IIT Foundation for your learning goal."],
              ["02", "Subscribe online", "Your syllabus loads based on your class and package."],
              ["03", "Learn with AI", "Vidya, quizzes and mock tests follow your chapters."],
            ].map(([number, title, body]) => (
              <div key={number} className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="font-display text-3xl font-extrabold text-sky-200">{number}</span>
                <h3 className="mt-2 font-display text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="learning-tracks" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Your learning tracks</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-4xl">
              A clear pathway from strong fundamentals to advanced preparation
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {IIT_TRACK_SPECS.map((spec) => (
              <article key={spec.code} className={`rounded-3xl border p-6 sm:p-8 ${spec.tone.border} ${spec.tone.bg}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${spec.tone.icon}`}>
                  <BookOpen className="h-6 w-6" />
                </div>
                <p className={`mt-5 text-xs font-bold uppercase tracking-wide ${spec.tone.badge}`}>{spec.classes}</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-slate-950">{spec.book}</h3>
                <p className="mt-2 font-medium text-slate-800">{spec.headline}</p>
                <p className="mt-4 leading-relaxed text-slate-600">{spec.body}</p>
                <p className="mt-3 text-sm text-slate-500">{spec.forWhom}</p>
                <ul className="mt-6 space-y-3">
                  {spec.points.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
            <strong>Class-wise pick:</strong> Class 6–7 usually start with Alpha. Class 8 can take Alpha, Beta or
            Gamma. Classes 9–10 use Beta or Gamma. The IIT tools on AsliLearn.ai (Vidya, quizzes, notes, mock tests)
            always read from the book you choose — they are not a separate syllabus.
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">IIT tools ↔ IIT books</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-4xl">
              Every IIT tool is connected to the Asli Prep material
            </h2>
            <p className="mt-4 text-slate-600">
              We do not mix random question banks into an Alpha or Beta student. If the child is on Asli Prep Beta
              Class 8 Chemistry Chapter 2, Vidya, the daily quiz, worksheets and the practice exam all use that
              chapter.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {IIT_TOOLS_LINKED_TO_BOOKS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Link2 className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Everything included</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-4xl">
              One platform. Every tool you need.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map(({ icon: Icon, title, body, color }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#071b43] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <School className="h-5 w-5 text-sky-300" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Built for schools and teachers too</h2>
            <p className="mt-3 leading-relaxed text-white/70">
              If your school uses Brainfeed or Asli Prep Foundation books, AsliLearn.ai extends the classroom
              digitally with chapter-matched quizzes, class performance tracking and targeted student support.
            </p>
          </div>
          <Link href="/book-a-demo">
            <Button className="h-12 shrink-0 rounded-full bg-sky-500 px-6 font-semibold text-white hover:bg-sky-600">
              Get AsliLearn.ai for Your School <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <CircleHelp className="mx-auto h-9 w-9 text-sky-600" />
          <h2 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="mt-9 space-y-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
              <summary className="cursor-pointer list-none pr-6 font-semibold text-slate-900">{q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 p-7 text-center text-white sm:p-10">
          <Sparkles className="mx-auto h-8 w-8 text-sky-200" />
          <h2 className="mt-3 font-display text-2xl font-bold">Ready to see learning come alive?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            Explore the right package for your family or request a personalised walkthrough for your school.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/pricing">
              <Button className="rounded-full bg-white px-6 font-semibold text-sky-800 hover:bg-sky-50">
                View Pricing
              </Button>
            </Link>
            <Link href="/book-a-demo">
              <Button variant="outline" className="rounded-full border-white/50 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export function FaqPage() {
  usePageSeo({
    title: "FAQ | AsliLearn.ai",
    description:
      "Frequently asked questions about AsliLearn.ai plans, boards, classes, teacher tools and school demos.",
    path: "/faq",
  });
  const faqs = [
    {
      q: "Which classes does AsliLearn.ai support?",
      a: "AsliLearn.ai is designed for Classes 6, 7, 8, 9 and 10.",
    },
    {
      q: "Which boards are supported?",
      a: "We support CBSE, CISCE/ICSE, State Board/SSC and other boards on request through institutional plans.",
    },
    {
      q: "What is the difference between Board Learning and Board + IIT Foundation?",
      a: "Board Learning focuses on board-aligned videos, notes, practice and assessments. Board + IIT Foundation adds foundation concepts, higher-order practice and foundation assessments.",
    },
    {
      q: "How do I book a demo?",
      a: "Visit the Book a Demo page, choose School Admin, Teacher or Student/Parent, and submit the form. Our team will contact you to schedule a personalised walkthrough.",
    },
  ];
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Short, factual answers about AsliLearn.ai for schools, teachers and families."
      />
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-14 sm:px-6">
        {faqs.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-5 open:shadow-sm">
            <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </section>
    </MarketingShell>
  );
}
