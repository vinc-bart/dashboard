import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { DatasetNotice } from "@/components/dashboard/dataset-notice";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/card";
import { PageTitle, SectionTitle } from "@/components/ui/heading";
import { isAppLocale } from "@/i18n/routing";
import { fetchAggregate, fetchCount, fetchRecordsSafe } from "@/lib/opendata/client";
import { DATASETS } from "@/lib/opendata/datasets";
import { getSession } from "@/lib/session";
import { fetchWikipediaSummary, type WikipediaSummary } from "@/lib/wikipedia/summary";
import {
  isPublicTheme,
  PUBLIC_THEME_SLUGS,
  publicTheme,
  type PublicThemeSlug,
  type ThemeSection,
  type ThemeSectionId,
} from "@/lib/wikipedia/themes";

export function generateStaticParams() {
  return PUBLIC_THEME_SLUGS.map((theme) => ({ theme }));
}

export const dynamicParams = false;

type AirRow = {
  annee?: string;
  ind_jour_qa_bonne?: number;
};

type ThemeFacts = {
  ok: boolean;
  numbers: Partial<Record<ThemeSectionId, number | null>>;
  airYear: string | null;
};

async function loadFacts(slug: PublicThemeSlug): Promise<ThemeFacts> {
  if (slug === "velib") {
    const aggregate = await fetchAggregate<{ bikes?: number }>(
      DATASETS.velib.id,
      "sum(numbikesavailable) as bikes",
      DATASETS.velib.revalidate,
    );
    return {
      ok: aggregate.ok,
      numbers: { velib: aggregate.ok ? Number(aggregate.page.results[0]?.bikes ?? 0) : null },
      airYear: null,
    };
  }

  if (slug === "nature") {
    const [trees, parks] = await Promise.all([
      fetchCount(DATASETS.trees.id, DATASETS.trees.revalidate),
      fetchCount(DATASETS.parks.id, DATASETS.parks.revalidate),
    ]);
    return {
      ok: trees.ok && parks.ok,
      numbers: {
        trees: trees.ok ? trees.count : null,
        parks: parks.ok ? parks.count : null,
      },
      airYear: null,
    };
  }

  if (slug === "air") {
    const atmo = await fetchRecordsSafe<AirRow>(
      DATASETS.air.id,
      { limit: 5, orderBy: "annee desc" },
      DATASETS.air.revalidate,
    );
    const latest = atmo.page.results[0];
    return {
      ok: atmo.ok,
      numbers: {
        air: latest && atmo.ok ? Number(latest.ind_jour_qa_bonne ?? 0) : null,
      },
      airYear: latest?.annee ? String(latest.annee) : null,
    };
  }

  const events = await fetchCount(DATASETS.events.id, DATASETS.events.revalidate);
  return {
    ok: events.ok,
    numbers: { events: events.ok ? events.count : null },
    airYear: null,
  };
}

type ThemeCopy = Awaited<ReturnType<typeof getTranslations<"PublicTheme">>>;

function themeTitle(slug: PublicThemeSlug, t: ThemeCopy) {
  if (slug === "velib") return t("velib.title");
  if (slug === "nature") return t("nature.title");
  if (slug === "air") return t("air.title");
  return t("agenda.title");
}

function themeIntro(slug: PublicThemeSlug, t: ThemeCopy) {
  if (slug === "velib") return t("velib.intro");
  if (slug === "nature") return t("nature.intro");
  if (slug === "air") return t("air.intro");
  return t("agenda.intro");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; theme: string }>;
}): Promise<Metadata> {
  const { locale, theme } = await params;
  if (!isAppLocale(locale) || !isPublicTheme(theme)) return {};
  const t = await getTranslations({ locale, namespace: "PublicTheme" });
  return { title: themeTitle(theme, t) };
}

export default async function PublicThemePage({
  params,
}: {
  params: Promise<{ locale: string; theme: string }>;
}) {
  const { locale, theme: slug } = await params;
  if (!isAppLocale(locale) || !isPublicTheme(slug)) notFound();
  const theme = publicTheme(slug);
  if (!theme) notFound();

  const t = await getTranslations("PublicTheme");
  const format = await getFormatter();
  const session = await getSession();
  const [facts, summaries] = await Promise.all([
    loadFacts(slug),
    Promise.all(
      theme.sections.map((section) => fetchWikipediaSummary(locale, section.titles)),
    ),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <span className="mb-4 block h-1 w-10 bg-accent" aria-hidden />
        <PageTitle size="lg">{themeTitle(slug, t)}</PageTitle>
        <p className="mt-3 max-w-2xl leading-7 text-muted">{themeIntro(slug, t)}</p>
        {facts.ok ? null : (
          <div className="mt-4">
            <DatasetNotice error="opendata" />
          </div>
        )}
        <div className="mt-8 space-y-12">
          {theme.sections.map((section, index) => {
            const copy = sectionCopy(section.id, facts, t);
            return (
              <ThemeBlock
                key={section.id}
                section={section}
                summary={summaries[index] ?? null}
                headed={theme.sections.length > 1}
                label={copy.label}
                hint={copy.hint}
                value={figureValue(section.id, facts, t, (value) => format.number(value))}
                sourceLabel={t("source")}
                attribution={t("attribution")}
                missingSummary={t("summaryUnavailable")}
              />
            );
          })}
        </div>
        <div className="mt-12">
          <Button href={session ? theme.dashboardHref : "/signup"}>
            {session ? t("openMap") : t("signup")}
          </Button>
          {session ? null : <p className="mt-3 text-sm text-muted">{t("signupHint")}</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function figureValue(
  id: ThemeSectionId,
  facts: ThemeFacts,
  t: ThemeCopy,
  formatNumber: (value: number) => string,
) {
  const raw = facts.numbers[id];
  if (raw == null) return "—";
  if (id === "air") return t("air.value", { count: String(raw) });
  return formatNumber(raw);
}

function sectionCopy(id: ThemeSectionId, facts: ThemeFacts, t: ThemeCopy) {
  if (id === "velib") return { label: t("velib.figure"), hint: t("velib.hint") };
  if (id === "trees") return { label: t("trees.figure"), hint: t("trees.hint") };
  if (id === "parks") return { label: t("parks.figure"), hint: t("parks.hint") };
  if (id === "events") return { label: t("agenda.figure"), hint: t("agenda.hint") };
  return {
    label: t("air.figure"),
    hint: facts.airYear ? t("air.hint", { year: facts.airYear }) : t("air.unavailable"),
  };
}

function ThemeBlock({
  section,
  summary,
  headed,
  label,
  hint,
  value,
  sourceLabel,
  attribution,
  missingSummary,
}: Readonly<{
  section: ThemeSection;
  summary: WikipediaSummary | null;
  headed: boolean;
  label: string;
  hint: string;
  value: string;
  sourceLabel: string;
  attribution: string;
  missingSummary: string;
}>) {
  return (
    <section>
      {headed ? (
        <div className="mb-4">
          <SectionTitle>{label}</SectionTitle>
          <p className="mt-3 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-heading">
            {value}
          </p>
          <p className="mt-2 text-sm text-muted">{hint}</p>
        </div>
      ) : (
        <div className="max-w-sm">
          <KpiCard label={label} value={value} hint={hint} />
        </div>
      )}
      <p className="mt-4 text-sm">
        <a
          href={section.sourceUrl}
          className="font-medium text-heading underline decoration-line underline-offset-4 hover:decoration-accent"
        >
          {sourceLabel}
        </a>
      </p>
      {summary ? (
        <article className="mt-6">
          {summary.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-base leading-7 first:mt-0">
              {paragraph}
            </p>
          ))}
          <p className="mt-4 text-sm text-muted">
            <a
              href={summary.url}
              className="font-medium text-heading underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              {summary.title}
            </a>
            {" · "}
            {attribution}
          </p>
        </article>
      ) : (
        <p className="mt-6 text-sm text-muted">{missingSummary}</p>
      )}
    </section>
  );
}
