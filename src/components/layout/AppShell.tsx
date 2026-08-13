import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PenTool,
  School,
  Search,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ContactSupportLink } from "@/components/ContactSupportLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { type NavItem, resolveActiveNavId } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

/* ──────────────────────────────── types ─────────────────────────────── */

type AppShellProps = {
  nav: NavItem[];
  user: { name: string; role: string; avatarUrl?: string };
  orgName: string;
  orgSubtitle?: string;
  orgLogoUrl?: string;
  homeHref?: string;
  /** @deprecated Ask Vidya promo card removed from sidebar */
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onLogout?: () => void;
  onSearch?: (q: string) => void;
  children: ReactNode;
};

const BackpackMini = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M6 8h12M6 8c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v10c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8V6c0-1.1.9-2 2-2s2 .9 2 2v2M8 12h8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ──────────────────────────────── soft light décor ─────────────────── */

function SidebarAtmosphere() {
  const floaters = [
    { Icon: BookOpen, className: "left-3 top-24 text-sky-400/40", delay: 0, size: 22 },
    { Icon: PenTool, className: "right-4 top-40 text-orange-400/35", delay: 0.8, size: 20 },
    { Icon: BackpackMini, className: "left-5 bottom-36 text-teal-500/35", delay: 1.4, size: 24 },
    { Icon: GraduationCap, className: "right-6 bottom-28 text-amber-500/30", delay: 0.4, size: 22 },
    { Icon: BookOpen, className: "left-10 top-[55%] text-indigo-400/25", delay: 1.1, size: 18 },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Light colorful wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/90 via-orange-50/50 to-teal-50/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_0%_0%,rgba(56,189,248,0.28),transparent_55%),radial-gradient(ellipse_70%_45%_at_100%_15%,rgba(251,146,60,0.22),transparent_50%),radial-gradient(ellipse_65%_40%_at_40%_100%,rgba(45,212,191,0.22),transparent_55%)]" />

      <motion.div
        className="absolute -right-8 top-16 h-36 w-36 rounded-full bg-sky-300/35 blur-3xl"
        animate={{ y: [0, 14, 0], scale: [1, 1.12, 1], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-10 bottom-20 h-40 w-40 rounded-full bg-orange-300/30 blur-3xl"
        animate={{ y: [0, -12, 0], scale: [1, 1.1, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute left-1/3 top-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-teal-300/25 blur-3xl"
        animate={{ x: [0, 18, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {floaters.map(({ Icon, className, delay, size }, i) => (
        <motion.div
          key={i}
          className={cn("absolute", className)}
          style={{ width: size, height: size }}
          animate={{
            y: [0, -10, 0],
            rotate: [0, i % 2 === 0 ? 8 : -8, 0],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: 5 + i * 0.7,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          }}
        >
          <Icon className="h-full w-full" />
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────── nav row ───────────────────────────── */

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
          active
            ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md shadow-orange-300/70"
            : "text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm",
        )}
      >
        {active ? (
          <motion.span
            layoutId="app-shell-nav-glow"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.32),transparent_55%)]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        ) : null}
        <motion.span
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            active
              ? "bg-white/25 text-white"
              : "bg-white/70 text-slate-500 ring-1 ring-sky-100 group-hover:bg-sky-50 group-hover:text-sky-600",
          )}
          whileHover={{ rotate: active ? 0 : -8, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </motion.span>
        <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span
            className={cn(
              "relative rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              active ? "bg-white/25 text-white" : "bg-orange-100 text-orange-700",
            )}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}

function SidebarBody({
  nav,
  activeId,
  homeHref = "/",
  onNavigate,
}: {
  nav: NavItem[];
  activeId: string;
  orgName: string;
  orgSubtitle?: string;
  orgLogoUrl?: string;
  homeHref?: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-sky-100/90 text-slate-800 shadow-[4px_0_24px_-12px_rgba(14,165,233,0.18)]">
      <SidebarAtmosphere />

      {/* Product brand */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10"
      >
        <Link
          href={homeHref}
          onClick={onNavigate}
          className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-3 py-3 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          aria-label="Go to home"
          title="Home"
        >
          <motion.img
            src="/logo-transparent.png"
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-sky-100"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold leading-tight tracking-tight text-slate-900">
              AsliLearn <span className="text-orange-500">AI</span>
            </p>
            <p className="truncate text-[11px] font-medium text-sky-700/80">Your learning library</p>
          </div>
        </Link>
      </motion.div>

      <div className="relative z-10 mx-5 mt-5 mb-2 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600/80">Menu</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
      </div>

      {/* Nav */}
      <nav
        aria-label="Main"
        className="app-shell-sidebar-nav relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4"
      >
        {nav.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.35, ease: "easeOut" }}
          >
            <NavRow
              item={item}
              active={item.id === activeId}
              onNavigate={onNavigate}
            />
          </motion.div>
        ))}
      </nav>

      <div className="relative z-10 border-t border-sky-100/90 bg-white/70 px-3 py-3 backdrop-blur-md">
        <ContactSupportLink className="w-full justify-center rounded-xl border-sky-100 bg-white/90 text-slate-700 shadow-none hover:bg-sky-50 hover:text-slate-900" />
        <p className="mt-2.5 text-center text-[9px] leading-tight tracking-wide text-slate-400">
          © {new Date().getFullYear()} AsliLearn AI
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────── shell ─────────────────────────────── */

export function AppShell({
  nav,
  user,
  orgName,
  orgSubtitle,
  orgLogoUrl,
  homeHref = "/",
  showUpgrade: _showUpgrade = false,
  onUpgrade: _onUpgrade,
  onLogout,
  onSearch,
  children,
}: AppShellProps) {
  const [location] = useLocation();
  const search = useSearch();
  const activeId = resolveActiveNavId(location, search.startsWith("?") ? search : `?${search}`, nav);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoFailed(false);
  }, [orgLogoUrl]);

  // Drop any leftover collapse preference from older builds.
  useEffect(() => {
    try {
      window.localStorage.removeItem("asli:shell:collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  // ⌘K / Ctrl+K focuses search when present
  useEffect(() => {
    if (!onSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch]);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Lock document scroll while the shell is mounted so the topbar (and Log out)
  // cannot scroll away with long admin/teacher/student pages.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-10 flex overflow-hidden bg-shell-backdrop"
      style={{ ["--rail" as string]: "16rem" }}
    >
      {/* Desktop rail — always expanded; mobile uses the single hamburger below */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--rail)] overflow-hidden lg:block">
        <SidebarBody
          nav={nav}
          activeId={activeId}
          orgName={orgName}
          orgSubtitle={orgSubtitle}
          orgLogoUrl={orgLogoUrl}
          homeHref={homeHref}
        />
      </aside>

      {/* Mobile drawer — one open-menu control only */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(18rem,88vw)] border-none bg-white p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBody
            nav={nav}
            activeId={activeId}
            orgName={orgName}
            orgSubtitle={orgSubtitle}
            orgLogoUrl={orgLogoUrl}
            homeHref={homeHref}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Content window — header pinned; only <main> scrolls */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-shell-surface lg:ml-[var(--rail)]">
        <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-border bg-shell-topbar px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-xl border border-border p-2 text-ink-soft transition-colors hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* School identity — left of the topbar */}
          <Link
            href={homeHref}
            className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden pr-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go to dashboard home"
          >
            <span className="relative isolate z-0 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-indigo-blue-50 sm:h-11 sm:w-11">
              {orgLogoUrl && !logoFailed ? (
                <img
                  src={orgLogoUrl}
                  alt={`${orgName} logo`}
                  onError={() => setLogoFailed(true)}
                  className="absolute inset-0 h-full w-full object-contain p-0.5"
                />
              ) : (
                <School className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
            </span>
            <div className="relative z-10 min-w-0 flex-1 overflow-hidden">
              <p className="truncate font-display text-base font-bold leading-tight text-ink sm:text-lg">
                {orgName}
              </p>
              {orgSubtitle && (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{orgSubtitle}</p>
              )}
            </div>
          </Link>

          {onSearch ? (
            <div className="relative ml-4 hidden min-w-0 max-w-md flex-1 xl:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="shell-search" className="sr-only">
                Search
              </label>
              <input
                id="shell-search"
                ref={searchRef}
                type="search"
                placeholder="Search anything..."
                onChange={(e) => onSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-mini font-medium text-muted-foreground sm:block">
                ⌘K
              </kbd>
            </div>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Account menu for ${user.name}`}
                  className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {initials}
                    </span>
                  )}
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-semibold text-foreground">{user.name}</span>
                    <span className="block text-xs text-muted-foreground">{user.role}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block text-sm font-semibold">{user.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{user.role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onLogout?.()}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          data-dashboard-main-scroll=""
          className="dashboard-main-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain scroll-pt-4"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
