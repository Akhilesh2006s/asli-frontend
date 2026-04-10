import { Link } from "wouter";

export default function Terms() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-3 text-slate-600">
          These terms govern your use of AsliLearn and its educational services.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Use of Platform</h2>
          <p className="text-slate-700">
            You agree to use the platform responsibly and comply with applicable
            laws and policies.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Accounts and Access</h2>
          <p className="text-slate-700">
            You are responsible for safeguarding your login credentials and all
            actions taken under your account.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Updates to Terms</h2>
          <p className="text-slate-700">
            We may update these terms periodically. Continued use indicates your
            acceptance of revised terms.
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
