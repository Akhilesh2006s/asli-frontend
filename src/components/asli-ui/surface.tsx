import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Layered mist background shared across dashboards & marketing. */
export function AsliAppSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("asli-app-bg min-h-screen", className)}>{children}</div>;
}

/** Zoom-readable page header. */
export function AsliPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-base font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink lg:text-[2.625rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** Premium glass panel for dashboard modules. */
export function AsliPanel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <section
      className={cn(
        "asli-card-premium p-6 lg:p-8",
        glow && "asli-ai-glow",
        className
      )}
    >
      {children}
    </section>
  );
}
