import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ChevronDown,
  ChevronLeft,
  LogOut,
  type LucideIcon,
  Menu,
  PanelLeft,
  School,
  Search,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { resolveActiveNavId, type NavItem } from "@/lib/app-nav";

const COLLAPSE_KEY = "asli:shell:collapsed";

export interface AppShellUser {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface AppShellProps {
  nav: NavItem[];
  user: AppShellUser;
  /** Brand line under the logo, e.g. the school name. */
  orgName: string;
  orgSubtitle?: string;
  orgLogoUrl?: string;
  /** Renders the premium upsell block above the sidebar footer. */
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  children: ReactNode;
}

/* ────────────────────────────── nav row ────────────────────────────── */

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon: LucideIcon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums">{item.badge}</span>
      ) : null}
    </Link>
  );
}

/* ─────────────────────────── sidebar content ────────────────────────── */

function SidebarBody({
  nav,
  activeId,
  collapsed,
  orgName,
  orgSubtitle,
  orgLogoUrl,
  showUpgrade,
  onUpgrade,
  onNavigate,
  onToggleCollapse,
}: {
  nav: NavItem[];
  activeId: string;
  collapsed: boolean;
  orgName: string;
  orgSubtitle?: string;
  orgLogoUrl?: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Product brand — the school name lives in the topbar, per the design */}
      <div className={cn("flex items-center gap-3 px-5 py-6", collapsed && "justify-center px-0")}>
        <img
          src="/logo.jpg"
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-sidebar-border"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-tight text-sidebar-heading">
              AsliLearn <span className="text-primary">AI</span>
            </p>
            <p className="truncate text-xs text-sidebar-foreground">AI-Powered Learning</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main" className={cn("flex-1 space-y-1.5 overflow-y-auto px-3 pb-4", collapsed && "px-2")}>
        {nav.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            active={item.id === activeId}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Assistant card */}
      {showUpgrade && !collapsed && (
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
      )}

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapse && (
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn("h-4 w-4 shrink-0 transition-transform", collapsed && "rotate-180")}
              aria-hidden="true"
            />
            {!collapsed && <span>Collapse</span>}
          </button>
          {!collapsed && (
            <p className="mt-3 text-center text-micro leading-relaxed text-sidebar-foreground">
              © {new Date().getFullYear()} AsliLearn AI
              <br />
              All rights reserved
            </p>
          )}
        </div>
      )}
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
  showUpgrade = false,
  onUpgrade,
  onLogout,
  onSearch,
  children,
}: AppShellProps) {
  const [location] = useLocation();
  const search = useSearch();
  const activeId = resolveActiveNavId(location, search.startsWith("?") ? search : `?${search}`, nav);

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoFailed(false);
  }, [orgLogoUrl]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable (private mode) — collapse still works for the session */
      }
      return next;
    });
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
      style={{ ["--rail" as string]: collapsed ? "5rem" : "16rem" }}
    >
      {/* Desktop rail — fixed so navigation never scrolls out of reach */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[var(--rail)] overflow-hidden",
          "transition-[width] duration-300 ease-out lg:block",
        )}
      >
        <SidebarBody
          nav={nav}
          activeId={activeId}
          collapsed={collapsed}
          orgName={orgName}
          orgSubtitle={orgSubtitle}
          orgLogoUrl={orgLogoUrl}
          showUpgrade={showUpgrade}
          onUpgrade={onUpgrade}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(18rem,88vw)] border-none bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBody
            nav={nav}
            activeId={activeId}
            collapsed={false}
            orgName={orgName}
            orgSubtitle={orgSubtitle}
            orgLogoUrl={orgLogoUrl}
            showUpgrade={showUpgrade}
            onUpgrade={onUpgrade}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Content window — header pinned; only <main> scrolls */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-shell-surface transition-[margin] duration-300 ease-out lg:ml-[var(--rail)]">
        <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-border bg-shell-topbar px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-xl border border-border p-2 text-ink-soft transition-colors hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Toggle sidebar"
            aria-expanded={!collapsed}
            className="hidden rounded-xl border border-border p-2 text-ink-soft transition-colors hover:bg-muted lg:block"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* School identity — left of the topbar, matching the design */}
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden pr-2">
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
          </div>

          {/* Search — only when a handler is provided */}
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
            {onLogout ? (
              <button
                type="button"
                onClick={() => onLogout()}
                aria-label="Log out"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-muted hover:text-foreground sm:px-3 sm:text-sm"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            ) : null}
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

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
