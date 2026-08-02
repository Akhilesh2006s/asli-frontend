import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Linkedin, Menu, X } from "lucide-react";
import { MARKETING_NAV } from "@/components/marketing/seo";
import { cn } from "@/lib/utils";

export function MarketingNav({ scrolled = false }: { scrolled?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b transition-colors",
        scrolled
          ? "border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-[#050d24]/95 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/logo.jpg" alt="AsliLearn.ai" className="h-9 w-9 rounded-lg object-contain" />
          <span
            className={cn(
              "font-display text-lg font-extrabold tracking-tight",
              scrolled ? "text-slate-900" : "text-white",
            )}
          >
            ASLILEARN<span className={scrolled ? "text-sky-600" : "text-sky-300"}>.AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {MARKETING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/auth/login">
            <Button
              variant="outline"
              className={cn(
                "h-10 rounded-full px-4 font-semibold",
                scrolled
                  ? "border-slate-300 bg-white text-slate-800"
                  : "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
              )}
            >
              Login
            </Button>
          </Link>
          <Link href="/book-a-demo">
            <Button className="h-10 rounded-full bg-sky-500 px-4 font-semibold text-white hover:bg-sky-600">
              Book a Demo
            </Button>
          </Link>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("lg:hidden", scrolled ? "text-slate-800" : "text-white hover:bg-white/10")}
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-[#050d24] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {MARKETING_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/85"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="h-11 w-full border-white/40 bg-transparent text-white">
                  Login
                </Button>
              </Link>
              <Link href="/book-a-demo" onClick={() => setMobileOpen(false)}>
                <Button className="h-11 w-full bg-sky-500 text-white hover:bg-sky-600">Book a Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#0a1f44] pt-10 text-white sm:pt-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:gap-10 sm:px-6 sm:pb-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="AsliLearn AI" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-display text-lg font-extrabold tracking-tight">
              ASLILEARN<span className="text-sky-300">.AI</span>
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            AsliLearn.ai — developed by Heyansh Edu Media Pvt. Ltd.
            <br />
            AI-powered Board and IIT Foundation learning for schools.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <ul className="space-y-2.5 text-sm text-white/80">
            {MARKETING_NAV.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5 text-sm text-white/80">
            <li>
              <Link href="/about-us" className="hover:text-white">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-of-use" className="hover:text-white">
                Terms of Use
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white/90">For enquiries</p>
          <a href="mailto:hello@aslilearn.ai" className="mt-2 block text-sm text-sky-300 hover:text-sky-200">
            hello@aslilearn.ai
          </a>
          <Link
            href="/book-a-demo"
            className="mt-3 inline-block text-sm font-semibold text-white underline-offset-2 hover:underline"
          >
            Book a Demo →
          </Link>
          <div className="mt-4 flex gap-2">
            <a
              href="https://www.facebook.com/profile.php?id=61573366977048"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="AsliLearn on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://www.instagram.com/aslilearnai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="AsliLearn on Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/asli-learn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="AsliLearn on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Heyansh Edu Media Pvt. Ltd. All rights reserved.
      </div>
    </footer>
  );
}

/** Light inner pages: nav starts dark, turns white on scroll. Homepage can pass forceDarkNav. */
export function MarketingShell({
  children,
  forceDarkNav = false,
}: {
  children: ReactNode;
  forceDarkNav?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (forceDarkNav) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [forceDarkNav]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <MarketingNav scrolled={forceDarkNav ? false : scrolled} />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingPageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#050d24] px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.18), transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{subtitle}</p>
        {children ? <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
