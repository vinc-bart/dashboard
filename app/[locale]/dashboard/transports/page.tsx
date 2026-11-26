import { getTranslations } from "next-intl/server";
import { DatasetNotice } from "@/components/dashboard/dataset-notice";
import { DatasetTabs } from "@/components/dashboard/dataset-tabs";
import { DeparturesBoard } from "@/components/dashboard/departures-board";
import { PageIntro } from "@/components/dashboard/page-intro";
import { DynamicParisMap } from "@/components/map/dynamic-map";
import { fetchLine9Departures } from "@/lib/idfm/client";
import { IDFM_SOURCE_URL, LINE9_STOPS, line9StopBySlug, defaultLine9Stop } from "@/lib/idfm/stops";
import type { MapMarker } from "@/lib/opendata/markers";
import { requireSession } from "@/lib/session";

function stopHref(slug: string) {
  return `/dashboard/transports?stop=${slug}`;
}

export default async function TransportsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ stop?: string }>;
}>) {
  await requireSession();
  const t = await getTranslations("Pages.transports");
  const { stop: requested } = await searchParams;
  const stop = line9StopBySlug(requested) ?? defaultLine9Stop();
  const result = await fetchLine9Departures(stop.slug);
  const markers: MapMarker[] = LINE9_STOPS.map((item) => ({
    id: item.slug,
    position: item.position,
    label: item.label,
    color: item.slug === stop.slug ? "#c8102e" : "#3d7ea6",
  }));

  return (
    <div className="space-y-6">
      <PageIntro title={t("title")} source={{ href: IDFM_SOURCE_URL, title: t("sourceTitle") }}>
        {t("body")}
      </PageIntro>
      <DatasetNotice error={result.ok ? undefined : result.error} />
      <DeparturesBoard stop={stop.slug} initial={result}>
        <DatasetTabs
          ariaLabel={t("stops")}
          active={stopHref(stop.slug)}
          tabs={LINE9_STOPS.map((item) => ({ href: stopHref(item.slug), label: item.label }))}
        />
        <DynamicParisMap key={stop.slug} markers={markers} center={stop.position} zoom={14} />
      </DeparturesBoard>
    </div>
  );
}
