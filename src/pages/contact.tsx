import { Link } from "wouter";

export default function Contact() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Contact Us</h1>
        <p className="mt-3 text-slate-600">
          Get in touch with AsliLearn AI for support, partnerships, or general
          inquiries.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Ways to reach us</h2>
          <ul className="list-disc space-y-2 pl-5 text-slate-700">
            <li>
              <a
                href="https://www.instagram.com/aslilearnai"
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=61573366977048"
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/asli-learn"
                className="text-blue-600 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </li>
          </ul>
          <p className="text-slate-700">
            For account or technical support, please sign in and use in-app help
            where available, or message us on the channels above.
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
