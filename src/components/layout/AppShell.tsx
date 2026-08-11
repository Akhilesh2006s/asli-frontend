import {
  ChevronDown,
  LogOut,
  Menu,
  School,
  Search,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
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
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onLogout?: () => void;
  onSearch?: (q: string) => void;
  children: ReactNode;
};

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
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBody({
  nav,
  activeId,
  homeHref = "/",
  showUpgrade,
  onUpgrade,
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
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Product brand — click returns to role home */}
      <Link
        href={homeHref}
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sidebar-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label="Go to home"
        title="Home"
      >
        <img
          src="/logo.jpg"
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-sidebar-border"
        />
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold leading-tight text-sidebar-heading">
            AsliLearn <span className="text-primary">AI</span>
          </p>
          <p className="truncate text-xs text-sidebar-foreground">AI-Powered Learning</p>
        </div>
      </Link>

      {/* Nav */}
      <nav aria-label="Main" className="app-shell-sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            active={item.id === activeId}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Assistant card */}
      {showUpgrade ? (
        <div className="mx-3 mb-3 rounded-2xl border border-sidebar-border bg-gradient-to-b from-indigo-blue-50 to-white p-4">
          <p className="font-display text-base font-bold text-primary">Vidya AI</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground">
            Your smart learning assistant
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            Ask Vidya AI
          </button>
        </div>
      ) : null}

      <div className="border-t border-sidebar-border p-3">
        <p className="mt-3 text-center text-micro leading-relaxed text-sidebar-foreground">
          © {new Date().getFullYear()} AsliLearn AI
          <br />
          All rights reserved
        </p>
        <div className="mt-2">
          <ContactSupportLink className="w-full justify-center border-sidebar-border bg-transparent text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        </div>
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
  showUpgrade = false,
  onUpgrade,
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
          showUpgrade={showUpgrade}
          onUpgrade={onUpgrade}
        />
      </aside>

      {/* Mobile drawer — one open-menu control only */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(18rem,88vw)] border-none bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBody
            nav={nav}
            activeId={activeId}
            orgName={orgName}
            orgSubtitle={orgSubtitle}
            orgLogoUrl={orgLogoUrl}
            homeHref={homeHref}
            showUpgrade={showUpgrade}
            onUpgrade={onUpgrade}
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
