import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { usePageSeo } from "@/components/marketing/seo";

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
    title: "Pricing | Board, Board + IIT and Teacher Plans — AsliLearn.ai",
    description:
      "AsliLearn.ai pricing: Board Learning ₹99/month, Board + IIT Foundation ₹249/month, Teacher Plan ₹3,999/year. Institutional plans on request.",
    path: "/pricing",
  });
  const plans = [
    {
      name: "Board Learning",
      price: "₹99/month",
      per: "per child",
      items: ["Board-aligned videos and notes", "Concept explanations", "Practice and assessments", "Progress tracking"],
    },
    {
      name: "Board + IIT Foundation",
      price: "₹249/month",
      per: "per child",
      items: [
        "Everything in Board Learning",
        "IIT Foundation concepts",
        "Higher-order practice",
        "Foundation assessments",
      ],
    },
    {
      name: "Teacher Plan",
      price: "₹3,999/year",
      per: "per teacher",
      items: ["AI Tutor", "Teaching resources", "Assessment creation", "AI-assisted grading", "Class analytics", "Priority support"],
    },
  ];
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Clear plans for learners and teachers"
        subtitle="Customised institutional and school-wide plans are available on request."
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {plans.map((p) => (
          <article key={p.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-slate-900">{p.name}</h2>
            <p className="mt-2 font-display text-3xl font-extrabold text-sky-700">{p.price}</p>
            <p className="text-sm text-slate-500">{p.per}</p>
            <ul className="mt-5 flex-1 space-y-2">
              {p.items.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {i}
                </li>
              ))}
            </ul>
            <Link href="/book-a-demo" className="mt-6">
              <Button className="w-full rounded-full bg-sky-500 text-white hover:bg-sky-600">Get Started</Button>
            </Link>
          </article>
        ))}
      </section>
    </MarketingShell>
  );
}

export function ResourcesPage() {
  usePageSeo({
    title: "Resources | AsliLearn.ai Educational Content",
    description:
      "Public educational resources from AsliLearn.ai — Board learning, IIT Foundation orientation and school enablement materials.",
    path: "/resources",
  });
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Resources"
        title="Learning resources for schools and families"
        subtitle="Explore how Board learning and IIT Foundation programmes work on AsliLearn.ai. Book a demo for a live walkthrough."
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Coming soon</h2>
          <p className="mt-2 text-slate-600">
            Public resource articles and sample materials will appear here. For curriculum-aligned demos and sample
            content, request a walkthrough.
          </p>
          <Link href="/book-a-demo" className="mt-6 inline-block">
            <Button className="rounded-full bg-sky-500 text-white hover:bg-sky-600">Book a Demo</Button>
          </Link>
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
