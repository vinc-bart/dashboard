"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useHeaderCompact } from "@/components/layout/sticky-header";

export function MorphSlot({
  children,
  when = "rest",
  className = "",
}: Readonly<{
  children: ReactNode;
  when?: "rest" | "compact";
  className?: string;
}>) {
  const compact = useHeaderCompact();
  const shown = when === "compact" ? compact : !compact;
  const inner = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState(0);

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    const measure = () => setFull(node.scrollWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <span
      className={`header-morph inline-block overflow-hidden align-middle ${className}`}
      style={
        full === 0
          ? shown
            ? undefined
            : { width: 0, opacity: 0 }
          : { width: shown ? full : 0, opacity: shown ? 1 : 0 }
      }
    >
      <span ref={inner} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}
