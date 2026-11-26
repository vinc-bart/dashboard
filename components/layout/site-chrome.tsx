import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HeaderSession } from "@/components/layout/header-session";
import { Wordmark } from "@/components/layout/wordmark";
import { SkipLink } from "@/components/layout/skip-link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { StickyHeader } from "@/components/layout/sticky-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export async function SiteHeader({
  variant = "public",
}: Readonly<{ variant?: "public" | "auth" }>) {
  return (
    <StickyHeader>
      <SkipLink />
      <div className="header-morph mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-6 py-2.5 group-data-[compact=true]/header:py-1.5">
        <Wordmark />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LocaleSwitcher collapsible />
          <ThemeToggle collapsible />
          <HeaderSession variant={variant} />
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
