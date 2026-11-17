"use client";

import { useEffect, useState, type ReactNode } from "react";

export function StickyHeader({ children }: Readonly<{ children: ReactNode }>) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 12;
      setCompact((current) => (current === next ? current : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-compact={compact ? "true" : undefined}
      className="group/header sticky top-0 z-30 border-b border-line bg-paper shadow-[inset_0_-2px_0_var(--accent)] transition-shadow duration-200 motion-reduce:transition-none data-[compact=true]:shadow-[inset_0_-2px_0_var(--accent),0_8px_24px_-18px_rgba(15,28,42,0.45)]"
    >
      {children}
    </header>
  );
}
