import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function Card({
  children,
  className = "",
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={`surface-panel panel-lift p-4 ${className}`}>{children}</div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  href,
}: Readonly<{
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}>) {
  const body = (
    <>
      <span className="mb-3 block h-1 w-10 bg-accent" aria-hidden />
      <p className="text-label">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-heading">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </>
  );
  if (!href) return <Card>{body}</Card>;
  return (
    <Link
      href={href}
      className="surface-panel panel-lift block p-4 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {body}
    </Link>
  );
}
