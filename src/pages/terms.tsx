import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { usePageSeo } from "@/components/marketing/seo";
import { Link } from "wouter";

export default function Terms() {
  usePageSeo({
    title: "Terms of Use | AsliLearn.ai",
    description:
      "Terms governing use of AsliLearn.ai educational services operated by Heyansh Edu Media Pvt. Ltd.",
    path: "/terms-of-use",
  });

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Legal"
        title="Terms of Use"
        subtitle="These terms govern your use of AsliLearn.ai and its educational services."
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Use of platform</h2>
          <p className="leading-relaxed text-slate-700">
            You agree to use the platform responsibly and comply with applicable laws, school
            policies and these terms. Content and tools are provided for educational purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Accounts and access</h2>
          <p className="leading-relaxed text-slate-700">
            You are responsible for safeguarding your login credentials and all actions taken under
            your account. Schools may control institutional accounts and access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Updates to terms</h2>
          <p className="leading-relaxed text-slate-700">
            We may update these terms periodically. Continued use indicates acceptance of revised
            terms. Questions:{" "}
            <a href="mailto:info@aslilearn.ai" className="font-medium text-sky-700 hover:underline">
              info@aslilearn.ai
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-slate-500">
          See also our{" "}
          <Link href="/privacy-policy" className="text-sky-700 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </MarketingShell>
  );
}
