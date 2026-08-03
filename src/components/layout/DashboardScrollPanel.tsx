import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardScrollPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /**
   * Cap height so wide tables / lists scroll inside the panel
   * (sidebar + topbar stay fixed via AppShell / SuperAdmin shell).
   */
  maxHeightClassName?: string;
  /** Prefer visible scrollbars on dense data panels. */
  showScrollbar?: boolean;
};

/**
 * Internal scroll region for dashboard tables and dense content.
 * Vertical + horizontal overflow stay inside this panel; pair with sticky thead.
 */
export function DashboardScrollPanel({
  children,
  className,
  maxHeightClassName = "max-h-[min(60vh,calc(100dvh-14rem))]",
  showScrollbar = true,
  ...props
}: DashboardScrollPanelProps) {
  return (
    <div
      data-dashboard-scroll-panel=""
      className={cn(
        "dashboard-scroll-panel relative w-full min-w-0 overflow-auto overscroll-contain",
        maxHeightClassName,
        showScrollbar ? "custom-scrollbar" : "hide-scrollbar",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default DashboardScrollPanel;
