import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LayoutDashboard, LogIn, UserPlus, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";
import { SkipLink } from "@/components/layout/skip-link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MorphSlot } from "@/components/layout/morph-slot";
import { StickyHeader } from "@/components/layout/sticky-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { parseTheme } from "@/lib/theme";

function CompactAction({
  href,
  variant = "primary",
  label,
  icon: Icon,
}: Readonly<{
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  label: string;
  icon: LucideIcon;
}>) {
  return (
    <Button
      href={href}
      variant={variant}
      size="sm"
      className="header-morph px-3 group-data-[compact=true]/header:h-8 group-data-[compact=true]/header:px-2"
    >
      <MorphSlot when="compact">
        <Icon className="size-4" aria-hidden />
      </MorphSlot>
      <MorphSlot>{label}</MorphSlot>
    </Button>
  );
}

function headerSessionActions(
  variant: "public" | "auth",
  session: Awaited<ReturnType<typeof getSession>>,
  t: (key: "privateSpace" | "login" | "signup") => string,
): ReactNode {
  if (variant === "auth") return null;
  if (session) {
    return (
      <CompactAction
        href="/dashboard"
        variant="secondary"
        label={t("privateSpace")}
        icon={LayoutDashboard}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <CompactAction href="/login" variant="ghost" label={t("login")} icon={LogIn} />
      <CompactAction href="/signup" label={t("signup")} icon={UserPlus} />
    </div>
  );
}

export async function SiteHeader({
  variant = "public",
}: Readonly<{ variant?: "public" | "auth" }>) {
  const session = await getSession();
  const t = await getTranslations("Nav");
  const theme = parseTheme((await cookies()).get("theme")?.value);

  return (
    <StickyHeader>
      <SkipLink />
      <div className="header-morph mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-6 py-2.5 group-data-[compact=true]/header:py-1.5">
        <Wordmark />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LocaleSwitcher collapsible />
          <ThemeToggle initial={theme} collapsible />
          {headerSessionActions(variant, session, t)}
        </div>
      </div>
    </StickyHeader>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const common = await getTranslations("Common");
  return (
    <footer className="border-t border-line py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("license")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/contact" className="font-medium text-heading hover:underline">
            {t("contact")}
          </Link>
          <a
            className="font-medium text-heading hover:underline"
            href="https://opendata.paris.fr"
            target="_blank"
            rel="noreferrer"
          >
            opendata.paris.fr{" "}
            <span className="sr-only">{common("opensInNewTab")}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
