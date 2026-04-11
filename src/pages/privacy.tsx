import { Link } from "wouter";

export default function Privacy() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-slate-600">
          This policy describes how AsliLearn AI collects, uses, and protects your
          information when you use our learning platform.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Information we collect</h2>
          <p className="text-slate-700">
            We may collect account details you provide (such as name and email),
            usage data to improve the product, and content you submit through the
            platform as part of your learning experience.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">How we use information</h2>
          <p className="text-slate-700">
            We use this information to operate and improve AsliLearn AI, personalize
            learning features, communicate with you about your account, and comply
            with legal obligations where applicable.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-700">
            For privacy-related questions, you can reach us through the{" "}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              contact page
            </Link>
            .
          </p>
        </section>

        <div className="mt-10">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
