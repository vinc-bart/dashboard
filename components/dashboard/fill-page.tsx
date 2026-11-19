import type { ReactNode } from "react";

/**
 * Page shell for map + table themes. On desktop-sized viewports it is exactly one screen
 * tall (the dashboard frame adds 2 × 2rem of padding) so the page itself never scrolls:
 * the explorer inside shares the remaining height between map and table, and only the
 * table scrolls. Smaller viewports fall back to the normal flowing layout.
 */
export function FillPage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="space-y-6 fill:flex fill:h-[calc(100dvh-4rem)] fill:flex-col fill:gap-4 fill:space-y-0 fill:[&>:first-child]:mb-0">
      {children}
    </div>
  );
}
