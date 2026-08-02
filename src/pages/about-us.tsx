import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { usePageSeo } from "@/components/marketing/seo";

const PROCESS = [
  "AI-assisted content ideation and drafting using Gemini",
  "Experienced subject matter experts for every subject",
  "Academic review, correction and refinement",
  "Alignment with school-board learning and IIT Foundation requirements",
  "Continuous feedback from teachers, schools and academic teams",
];

const OFFERINGS = [
  "Board-aligned learning resources",
  "IIT Foundation preparation",
  "AI-assisted concept support",
  "Videos, notes and practice material",
  "Smart assessments and grading support",
  "Student and class progress tracking",
  "Teacher resources and academic analytics",
  "School-level performance visibility",
];

export default function AboutUsPage() {
  usePageSeo({
    title: "About AsliLearn.ai | Heyansh Edu Media Pvt. Ltd.",
    description:
      "Learn about AsliLearn.ai, developed by Heyansh Edu Media Pvt. Ltd. with more than 15 years of experience in educational media, IIT Foundation resources and academic-content development.",
    path: "/about-us",
  });

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="About AsliLearn.ai"
        title="Built by Educators. Strengthened by Technology. Designed for Better Learning."
        subtitle="AsliLearn.ai brings together more than 15 years of educational experience, expert academic development and intelligent technology to support students, teachers and schools."
      >
        <Link href="/book-a-demo">
          <Button className="h-11 rounded-full bg-sky-500 px-6 font-semibold text-white hover:bg-sky-600">
            Book a Demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/platform">
          <Button
            variant="outline"
            className="h-11 rounded-full border-white/50 bg-transparent px-6 font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            Explore the Platform
          </Button>
        </Link>
      </MarketingPageHero>

      <section className="border-b border-emerald-100 bg-emerald-50/80 py-4">
        <p className="text-center text-sm font-semibold text-emerald-900 sm:text-base">
          15+ years of educational media experience · Connected to Asli Prep Foundation
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Our story</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            AsliLearn.ai is an AI-powered learning platform developed by{" "}
            <strong>Heyansh Edu Media Pvt. Ltd.</strong>, an education media and academic-content organisation
            with more than 15 years of experience in developing school-learning and IIT Foundation resources.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Connected to <strong>Asli Prep Foundation</strong>, the platform combines academic expertise,
            classroom understanding, carefully developed resources and modern technology to help students learn
            with greater clarity, enable teachers to work more effectively and give school leadership meaningful
            academic visibility.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <p className="text-base leading-relaxed text-slate-700">
            Under the leadership of Directors <strong>Kakani Veera Brahamam</strong> and{" "}
            <strong>Kakani Harish</strong>, AsliLearn.ai has been built with a clear purpose: to make quality
            learning more personalised, teaching more powerful and academic progress more measurable.
          </p>
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
            <Users className="h-5 w-5 text-sky-600" />
            Educators, SMEs, design and engineering teams working together
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            How our resources are developed
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Preferred wording: AI-assisted content development, reviewed and refined by subject matter experts.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS.map((step, i) => (
              <li
                key={step}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-sky-600">Step {i + 1}</span>
                <p className="mt-2 text-sm font-medium leading-snug text-slate-800">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">Leadership</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl font-bold text-slate-900">Kakani Veera Brahamam</h3>
            <p className="mt-1 text-sm font-semibold text-emerald-700">Director</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              An educator and education-media leader committed to improving learning resources, teacher support
              and school education through experience, content and innovation.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl font-bold text-slate-900">Kakani Harish</h3>
            <p className="mt-1 text-sm font-semibold text-sky-700">Director</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A technology- and growth-focused leader supporting the development of scalable education platforms,
              digital systems and user-centred learning experiences.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-[#0a1f44] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Mission</h2>
            <p className="mt-3 text-white/80 leading-relaxed">
              To empower every learner with personalised support, help every teacher work more effectively and
              enable every school to make better academic decisions through trusted content and intelligent
              technology.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Vision</h2>
            <p className="mt-3 text-white/80 leading-relaxed">
              To build a future-ready learning ecosystem in which students, teachers and school leadership grow
              together through accessible, measurable and meaningful education.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">What we offer</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {OFFERINGS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-slate-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Link href="/book-a-demo">
            <Button className="h-12 rounded-full bg-orange-500 px-6 font-semibold text-white hover:bg-orange-600">
              See what we have built for schools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
