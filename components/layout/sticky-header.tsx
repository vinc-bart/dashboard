"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const HeaderCompactContext = createContext(false);

/** Past this offset the bar compacts. Far enough that its own height change cannot scroll back over it. */
const COMPACT_AFTER = 48;
/** Back near the top, the bar expands again. The gap between the two avoids a fast toggle. */
const EXPAND_BEFORE = 8;

export function useHeaderCompact() {
  return useContext(HeaderCompactContext);
}

export function StickyHeader({ children }: Readonly<{ children: ReactNode }>) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCompact((current) => (current ? y > EXPAND_BEFORE : y > COMPACT_AFTER));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-compact={compact ? "true" : undefined}
      className="header-morph group/header sticky top-0 z-30 border-b border-line bg-paper shadow-[inset_0_-2px_0_var(--accent)] data-[compact=true]:shadow-[inset_0_-2px_0_var(--accent),0_8px_24px_-18px_rgba(15,28,42,0.45)]"
    >
      <HeaderCompactContext.Provider value={compact}>{children}</HeaderCompactContext.Provider>
    </header>
  );
}
