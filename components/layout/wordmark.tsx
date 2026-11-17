import { Link } from "@/i18n/navigation";

export function Wordmark({
  href = "/",
  invert = false,
  size = "md",
}: Readonly<{
  href?: string;
  invert?: boolean;
  size?: "md" | "lg";
}>) {
  const titleSize =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : "header-morph text-xl sm:group-data-[compact=true]/header:text-base";
  const subSize =
    size === "lg"
      ? "text-lg sm:text-xl"
      : "header-morph text-sm sm:group-data-[compact=true]/header:text-base";

  return (
    <Link
      href={href}
      className={`group inline-flex flex-col ${invert ? "text-white" : "text-heading"}`}
    >
      <span className="inline-flex flex-col sm:group-data-[compact=true]/header:flex-row sm:group-data-[compact=true]/header:items-baseline">
        <span className={`font-display font-semibold leading-none tracking-tight ${titleSize}`}>
          Paris
        </span>
        <span
          className={`header-morph mt-0.5 font-display font-medium leading-none sm:group-data-[compact=true]/header:mt-0 sm:group-data-[compact=true]/header:ml-1.5 ${subSize} ${
            invert ? "text-white/80" : "text-heading/70"
          }`}
        >
          Ouverte
        </span>
      </span>
      <span
        className={`header-morph mt-1.5 block bg-accent ${
          size === "lg"
            ? "h-1.5 w-14 group-hover:w-20"
            : "h-1 w-10 group-hover:w-14 group-data-[compact=true]/header:mt-1 group-data-[compact=true]/header:h-0.5 group-data-[compact=true]/header:w-8"
        }`}
        aria-hidden
      />
    </Link>
  );
}
