import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { usePageSeo } from "@/components/marketing/seo";
import { Link } from "wouter";

export default function Privacy() {
  usePageSeo({
    title: "Privacy Policy | AsliLearn.ai",
    description:
      "How AsliLearn.ai and Heyansh Edu Media Pvt. Ltd. collect, use and protect personal information on the learning platform.",
    path: "/privacy-policy",
  });

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="How AsliLearn.ai collects, uses and protects information when you use our learning platform."
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Information we collect</h2>
          <p className="leading-relaxed text-slate-700">
            We may collect account details you provide (such as name and email), school and role
            information, usage data to improve the product, and content you submit through the
            platform as part of your learning experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">How we use information</h2>
          <p className="leading-relaxed text-slate-700">
            We use this information to operate and improve AsliLearn.ai, personalise learning
            features, communicate about your account or demo requests, support schools and teachers,
            and comply with legal obligations where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Contact</h2>
          <p className="leading-relaxed text-slate-700">
            For privacy-related questions, email{" "}
            <a href="mailto:info@aslilearn.ai" className="font-medium text-sky-700 hover:underline">
              info@aslilearn.ai
            </a>{" "}
            or use our{" "}
            <Link href="/book-a-demo" className="font-medium text-sky-700 hover:underline">
              Book a Demo
            </Link>{" "}
            form.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
