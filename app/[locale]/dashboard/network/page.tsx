import { getFormatter, getTranslations } from "next-intl/server";
import { DatasetNotice } from "@/components/dashboard/dataset-notice";
import { DatasetTabs } from "@/components/dashboard/dataset-tabs";
import { InfiniteThemeExplorer } from "@/components/dashboard/infinite-theme-explorer";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { PageIntro } from "@/components/dashboard/page-intro";
import { fetchCount, formatCount } from "@/lib/opendata/client";
import { DATASETS } from "@/lib/opendata/datasets";
import { localizeExplorerDataset } from "@/lib/opendata/localize";
import { loadThemeExplorer } from "@/lib/opendata/load";
import { requireSession } from "@/lib/session";

const TABS = [
  { id: "fountains", href: "/dashboard/network", dataset: DATASETS.ratpFountains },
  { id: "toilets", href: "/dashboard/network?tab=toilets", dataset: DATASETS.ratpToilets },
  { id: "aed", href: "/dashboard/network?tab=aed", dataset: DATASETS.ratpAed },
  { id: "shops", href: "/dashboard/network?tab=shops", dataset: DATASETS.ratpShops },
] as const;

type NetworkTab = (typeof TABS)[number]["id"];

function activeTab(tab: string | undefined): NetworkTab {
  if (tab === "toilets" || tab === "aed" || tab === "shops") return tab;
  return "fountains";
}

export default async function NetworkPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tab?: string }>;
}>) {
  const session = await requireSession();
  const t = await getTranslations("Pages.network");
  const format = await getFormatter();
  const { tab } = await searchParams;
  const current = activeTab(tab);
  const active = TABS.find((item) => item.id === current) ?? TABS[0];
  const [loaded, ...counts] = await Promise.all([
    loadThemeExplorer(active.dataset, session.user.id),
    ...TABS.map((item) =>
      fetchCount(item.dataset.id, item.dataset.revalidate, undefined, item.dataset.host),
    ),
  ]);
  const countError = counts.find((result) => !result.ok)?.error;

  return (
    <div className="space-y-6">
      <PageIntro title={t("title")} dataset={TABS.map((item) => item.dataset)}>
        {t("body")}
      </PageIntro>
      <DatasetNotice error={loaded.error || countError} />
      <KpiStrip
        items={TABS.map((item, index) => ({
          label: t(item.id),
          value: formatCount(counts[index], (value) => format.number(value)),
        }))}
      />
      <DatasetTabs
        active={active.href}
        tabs={TABS.map((item) => ({ href: item.href, label: t(item.id) }))}
      />
      <InfiniteThemeExplorer
        dataset={await localizeExplorerDataset(active.dataset)}
        initial={loaded.table}
        mapRecords={loaded.markers.results}
        favoriteIds={loaded.favoriteIds}
        initialError={loaded.ok ? null : loaded.error}
      />
    </div>
  );
}
