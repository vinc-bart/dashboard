import { Link } from "@/i18n/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-accent text-white hover:bg-[#a50e26] disabled:bg-[#d9a3ad]",
  secondary:
    "bg-navy text-white hover:bg-navy-2 disabled:bg-[#7a8794]",
  ghost:
    "border border-line bg-paper text-ink hover:border-heading/40 disabled:opacity-50",
} as const;

const sizes = {
  md: "h-11 px-5 text-sm",
  sm: "h-8 px-3 text-xs",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  ...props
}: Props) {
  const classes = `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-none font-medium transition duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
