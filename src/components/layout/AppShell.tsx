import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PenTool,
  School,
  Search,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

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

const NAV_ACCENTS = [
  {
    active: "from-orange-500 via-amber-400 to-yellow-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(249,115,22,0.75)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-orange-600 group-hover:ring-orange-200",
  },
  {
    active: "from-sky-500 via-cyan-400 to-teal-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(14,165,233,0.7)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-sky-600 group-hover:ring-sky-200",
  },
  {
    active: "from-violet-500 via-purple-400 to-fuchsia-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(139,92,246,0.7)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-violet-600 group-hover:ring-violet-200",
  },
  {
    active: "from-rose-500 via-pink-400 to-orange-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(244,63,94,0.65)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-rose-600 group-hover:ring-rose-200",
  },
  {
    active: "from-emerald-500 via-green-400 to-lime-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(16,185,129,0.65)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-emerald-600 group-hover:ring-emerald-200",
  },
  {
    active: "from-indigo-500 via-blue-400 to-cyan-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(99,102,241,0.65)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-indigo-600 group-hover:ring-indigo-200",
  },
  {
    active: "from-teal-500 via-emerald-400 to-sky-300",
    glow: "shadow-[0_8px_28px_-6px_rgba(20,184,166,0.65)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-teal-600 group-hover:ring-teal-200",
  },
  {
    active: "from-fuchsia-500 via-pink-500 to-violet-400",
    glow: "shadow-[0_8px_28px_-6px_rgba(217,70,239,0.7)]",
    icon: "bg-white/30 text-white",
    idle: "group-hover:text-fuchsia-600 group-hover:ring-fuchsia-200",
  },
] as const;

const SPARKLE_SEEDS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${8 + ((i * 17) % 84)}%`,
  top: `${6 + ((i * 23) % 88)}%`,
  size: 3 + (i % 4),
  delay: (i * 0.35) % 4,
  duration: 2.2 + (i % 5) * 0.4,
}));

/* ──────────────────────────────── wild sidebar décor ─────────────────── */

function SidebarAtmosphere() {
  const floaters = [
    { Icon: BookOpen, className: "left-2 top-20 text-sky-500/50", delay: 0, size: 26, path: [0, -14, 6, 0] as number[] },
    { Icon: PenTool, className: "right-3 top-36 text-orange-500/45", delay: 0.6, size: 22, path: [0, 10, -8, 0] as number[] },
    { Icon: BackpackMini, className: "left-4 bottom-40 text-teal-500/45", delay: 1.2, size: 28, path: [0, -8, 12, 0] as number[] },
    { Icon: GraduationCap, className: "right-5 bottom-32 text-amber-500/40", delay: 0.3, size: 24, path: [0, 12, -10, 0] as number[] },
    { Icon: Star, className: "left-8 top-[48%] text-yellow-400/50", delay: 1.8, size: 16, path: [0, -6, 8, 0] as number[] },
    { Icon: Sparkles, className: "right-8 top-[58%] text-fuchsia-400/45", delay: 0.9, size: 18, path: [0, 10, -6, 0] as number[] },
    { Icon: Zap, className: "left-12 bottom-24 text-violet-400/40", delay: 1.5, size: 14, path: [0, -12, 4, 0] as number[] },
    { Icon: BookOpen, className: "right-2 top-[72%] text-indigo-400/35", delay: 2.1, size: 20, path: [0, 8, -12, 0] as number[] },
  ] as const;

  return (
    <div className="app-shell-sidebar-atmosphere pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="sidebar-aurora absolute inset-0" />
      <div className="sidebar-aurora sidebar-aurora--alt absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.15)_45%,rgba(255,255,255,0.35)_100%)]" />

      <div className="sidebar-scanline absolute inset-0 opacity-[0.07]" />

      {SPARKLE_SEEDS.map((s) => (
        <span
          key={s.id}
          className="sidebar-sparkle absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      <motion.div
        className="absolute -right-10 top-12 h-44 w-44 rounded-full bg-gradient-to-br from-sky-400/40 to-cyan-300/20 blur-3xl"
        animate={{ y: [0, 18, 0], x: [0, -8, 0], scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-12 bottom-16 h-48 w-48 rounded-full bg-gradient-to-tr from-orange-400/35 to-rose-300/20 blur-3xl"
        animate={{ y: [0, -16, 0], x: [0, 10, 0], scale: [1, 1.12, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <motion.div
        className="absolute left-1/2 top-[42%] h-32 w-32 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-400/30 to-fuchsia-300/20 blur-3xl"
        animate={{ x: [0, 22, -12, 0], opacity: [0.35, 0.65, 0.45, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      {floaters.map(({ Icon, className, delay, size, path }, i) => (
        <motion.div
          key={i}
          className={cn("absolute drop-shadow-sm", className)}
          style={{ width: size, height: size }}
          animate={{
            y: path,
            rotate: [0, i % 2 === 0 ? 12 : -12, 0],
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.85, 0.4],
          }}
          transition={{
            duration: 4.5 + i * 0.5,
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
  accentIndex,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  accentIndex: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const accent = NAV_ACCENTS[accentIndex % NAV_ACCENTS.length];
  const [location, setLocation] = useLocation();

  const handleClick = (e: MouseEvent) => {
    const href = item.href || '';
    const isTeacherDashTab = href.startsWith('/teacher/dashboard?');
    const isAdminDashTab = href.startsWith('/admin/dashboard?');
    const onTeacherDash = location.startsWith('/teacher/dashboard');
    const onAdminDash = location.startsWith('/admin/dashboard');
    // Same-page tab switches should replace history so Back returns to the prior real page
    // (e.g. Learning Paths), not Overview → Classes → Students → …
    if ((isTeacherDashTab && onTeacherDash) || (isAdminDashTab && onAdminDash)) {
      e.preventDefault();
      setLocation(href, { replace: true });
      onNavigate?.();
      return;
    }
    onNavigate?.();
  };

  return (
    <motion.div
      whileHover={{ x: 5, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 480, damping: 24 }}
    >
      <Link
        href={item.href}
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-300",
          active
            ? cn("bg-gradient-to-r text-white", accent.active, accent.glow)
            : "text-slate-600 hover:bg-white/85 hover:text-slate-900 hover:shadow-md hover:shadow-sky-100/80",
        )}
      >
        {active ? (
          <>
            <motion.span
              layoutId="app-shell-nav-glow"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.35),transparent_58%)]"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
            <span className="sidebar-nav-shimmer pointer-events-none absolute inset-0" />
            <span className="pointer-events-none absolute -right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/25 blur-md" />
          </>
        ) : (
          <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:bg-gradient-to-r group-hover:from-white/60 group-hover:to-sky-50/40" />
        )}

        <motion.span
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300",
            active
              ? accent.icon
              : cn("bg-white/80 text-slate-500 ring-sky-100/90 group-hover:scale-110", accent.idle),
          )}
          animate={active ? { rotate: [0, -6, 6, 0] } : {}}
          transition={active ? { duration: 0.5, ease: "easeOut" } : { type: "spring", stiffness: 400, damping: 18 }}
          whileHover={active ? undefined : { rotate: -10, scale: 1.12 }}
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </motion.span>

        <span className="relative min-w-0 flex-1 truncate">{item.label}</span>

        {active ? (
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            className="relative flex h-5 w-5 items-center justify-center"
          >
            <Sparkles className="h-3.5 w-3.5 text-white/90" aria-hidden="true" />
          </motion.span>
        ) : null}

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
    <div className="app-shell-sidebar-crazy relative flex h-full flex-col overflow-hidden border-r border-white/60 text-slate-800 shadow-[6px_0_32px_-10px_rgba(99,102,241,0.25)]">
      <SidebarAtmosphere />

      {/* Product brand */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, type: "spring", stiffness: 260, damping: 22 }}
        className="relative z-10"
      >
        <Link
          href={homeHref}
          onClick={onNavigate}
          className="sidebar-brand-card mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 px-3 py-3 shadow-lg shadow-sky-200/40 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-xl hover:shadow-orange-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
          aria-label="Go to home"
          title="Home"
        >
          <div className="relative shrink-0">
            <span className="sidebar-logo-orbit absolute inset-[-6px] rounded-2xl" aria-hidden="true" />
            <motion.img
              src="/logo-transparent.png"
              alt=""
              className="relative h-10 w-10 rounded-xl bg-white object-contain p-0.5 ring-2 ring-white/80"
              animate={{ y: [0, -3, 0], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold leading-tight tracking-tight">
              <span className="sidebar-brand-gradient bg-clip-text text-transparent">AsliLearn</span>{" "}
              <span className="text-orange-500">AI</span>
            </p>
            <p className="truncate text-[11px] font-semibold text-sky-700/90">Your learning library ✨</p>
          </div>
        </Link>
      </motion.div>

      <div className="relative z-10 mx-5 mt-5 mb-2 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />
        <span className="sidebar-menu-label text-[10px] font-black uppercase tracking-[0.22em]">Menu</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      </div>

      {/* Nav */}
      <nav
        aria-label="Main"
        className="app-shell-sidebar-nav relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4"
      >
        {nav.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * index, duration: 0.4, ease: "easeOut" }}
          >
            <NavRow
              item={item}
              active={item.id === activeId}
              accentIndex={index}
              onNavigate={onNavigate}
            />
          </motion.div>
        ))}
      </nav>

      <div className="relative z-10 border-t border-white/70 bg-white/75 px-3 py-3 backdrop-blur-xl">
        <ContactSupportLink className="sidebar-support-btn w-full justify-center rounded-xl border-sky-100/80 bg-white/95 text-slate-700 shadow-sm hover:bg-gradient-to-r hover:from-sky-50 hover:to-orange-50 hover:text-slate-900" />
        <p className="mt-2.5 text-center text-[9px] font-medium leading-tight tracking-wide text-slate-400">
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
