import { getFormatter, getTranslations } from "next-intl/server";
import { DatasetNotice } from "@/components/dashboard/dataset-notice";
import { DatasetTabs } from "@/components/dashboard/dataset-tabs";
import { DynamicAirCharts } from "@/components/dashboard/dynamic-air-charts";
import { DynamicSqualesChart } from "@/components/dashboard/dynamic-squales-chart";
import { InfiniteThemeExplorer } from "@/components/dashboard/infinite-theme-explorer";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { PageIntro } from "@/components/dashboard/page-intro";
import { SqualesStationSelect } from "@/components/dashboard/squales-station-select";
import { Card } from "@/components/ui/card";
import { fetchAllRecords, fetchRecordsSafe, type DatasetConfig } from "@/lib/opendata/client";
import { DATASETS } from "@/lib/opendata/datasets";
import { localizeExplorerDataset } from "@/lib/opendata/localize";
import { loadThemeExplorer } from "@/lib/opendata/load";
import {
  latestSqualesValue,
  SQUALES_FETCH_MAX,
  SQUALES_REVALIDATE,
  SQUALES_STATIONS,
  squalesPoints,
  squalesSelect,
  squalesStationById,
  squalesWindowWhere,
  type SqualesPoint,
  type SqualesSeriesKey,
  type SqualesStation,
} from "@/lib/opendata/squales";
import { requireSession } from "@/lib/session";

function squalesIntroDataset(station: SqualesStation): DatasetConfig {
  return {
    id: station.datasetId,
    title: `${station.name} · ${station.line}`,
    sourceUrl: station.sourceUrl,
    revalidate: SQUALES_REVALIDATE,
    geoField: "",
    idField: "dateheure",
    titleField: "dateheure",
    bbox: false,
    host: "ratp",
    columns: [],
  };
}

function formatMeasure(value: number | undefined, format: Awaited<ReturnType<typeof getFormatter>>) {
  if (value == null) return "—";
  return format.number(value, { maximumFractionDigits: 1 });
}

function readingWhen(
  point: SqualesPoint | undefined,
  format: Awaited<ReturnType<typeof getFormatter>>,
) {
  if (!point) return "—";
  return format.dateTime(new Date(point.time), { dateStyle: "medium", timeStyle: "short" });
}

export default async function AirPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tab?: string; station?: string }>;
}>) {
  const session = await requireSession();
  const t = await getTranslations("Pages.air");
  const { tab, station: stationId } = await searchParams;
  const underground = tab === "underground";
  const station = squalesStationById(stationId);

  return (
    <div className="space-y-6">
      <PageIntro
        title={t("title")}
        dataset={underground ? squalesIntroDataset(station) : DATASETS.air}
      >
        {t("body")}
      </PageIntro>
      <DatasetTabs
        active={underground ? "/dashboard/air?tab=underground" : "/dashboard/air"}
        tabs={[
          { href: "/dashboard/air", label: t("outdoor") },
          { href: "/dashboard/air?tab=underground", label: t("underground") },
        ]}
      />
      {underground ? (
        <UndergroundPanel station={station} />
      ) : (
        <OutdoorPanel userId={session.user.id} />
      )}
    </div>
  );
}

async function OutdoorPanel({ userId }: Readonly<{ userId: string }>) {
  const t = await getTranslations("Pages.air");
  const [loaded, charts] = await Promise.all([
    loadThemeExplorer(DATASETS.air, userId),
    fetchAllRecords(DATASETS.air.id, DATASETS.air.revalidate, { max: 200 }),
  ]);
  const chartRecords = charts.ok ? charts.page.results : loaded.table.results;
  const latest = [...chartRecords].sort((a, b) =>
    String(b.annee).localeCompare(String(a.annee)),
  )[0];
  const dash = !loaded.ok || !latest;

  return (
    <>
      <DatasetNotice error={loaded.error || charts.error} />
      <KpiStrip
        items={[
          { label: t("latestYear"), value: dash ? "—" : String(latest?.annee) },
          { label: t("goodDays"), value: dash ? "—" : Number(latest?.ind_jour_qa_bonne ?? 0) },
          { label: t("averageDays"), value: dash ? "—" : Number(latest?.ind_jour_qa_moyenne ?? 0) },
          { label: t("badDays"), value: dash ? "—" : Number(latest?.ind_jour_qa_mauvaise ?? 0) },
        ]}
      />
      <DynamicAirCharts records={chartRecords} />
      <InfiniteThemeExplorer
        dataset={await localizeExplorerDataset(DATASETS.air)}
        initial={loaded.table}
        mapRecords={loaded.markers.results}
        favoriteIds={loaded.favoriteIds}
        initialError={loaded.ok ? null : loaded.error}
      />
    </>
  );
}

async function UndergroundPanel({ station }: Readonly<{ station: SqualesStation }>) {
  const t = await getTranslations("Pages.air");
  const format = await getFormatter();
  const latestPage = await fetchRecordsSafe(
    station.datasetId,
    { limit: 1, orderBy: "dateheure desc", select: squalesSelect(station), host: "ratp" },
    SQUALES_REVALIDATE,
  );
  const latestIso =
    latestPage.ok && latestPage.page.results[0]
      ? String(latestPage.page.results[0].dateheure ?? "")
      : "";
  const where = latestIso ? squalesWindowWhere(latestIso) : null;
  const seriesPage = where
    ? await fetchAllRecords(station.datasetId, SQUALES_REVALIDATE, {
        where,
        orderBy: "dateheure",
        host: "ratp",
        max: SQUALES_FETCH_MAX,
        select: squalesSelect(station),
      })
    : null;
  const points = squalesPoints(station, seriesPage?.ok ? seriesPage.page.results : []);
  const latestPoint = points.at(-1);
  const thirdKey: SqualesSeriesKey = station.series.some((item) => item.key === "co2")
    ? "co2"
    : "temp";
  const chartSeries = station.series
    .filter((item) => item.axis !== "climate")
    .map((item) => ({
      key: item.key,
      label: t(`series.${item.key}`),
      yAxisId: item.axis === "co2" ? ("right" as const) : ("left" as const),
    }));
  const recent = [...points].reverse().slice(0, 24);

  return (
    <>
      <DatasetNotice error={latestPage.error || seriesPage?.error} />
      <SqualesStationSelect
        label={t("station")}
        value={station.id}
        stations={SQUALES_STATIONS.map((item) => ({
          id: item.id,
          label: `${item.name} · ${item.line}`,
        }))}
      />
      <KpiStrip
        items={[
          { label: t("latestReading"), value: readingWhen(latestPoint, format) },
          {
            label: t("pm10"),
            value: formatMeasure(latestSqualesValue(latestPoint, "pm10"), format),
            hint: "µg/m³",
          },
          {
            label: thirdKey === "co2" ? t("co2") : t("temperature"),
            value: formatMeasure(latestSqualesValue(latestPoint, thirdKey), format),
            hint: thirdKey === "co2" ? "ppm" : "°C",
          },
        ]}
      />
      <DynamicSqualesChart stationName={station.name} points={points} series={chartSeries} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-label">
            <tr>
              <th className="px-3 py-2 font-medium">{t("hour")}</th>
              {station.series.map((item) => (
                <th key={item.key} className="px-3 py-2 font-medium">
                  {t(`series.${item.key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={station.series.length + 1} className="px-3 py-6 text-center text-muted">
                  {t("noReadings")}
                </td>
              </tr>
            ) : (
              recent.map((row) => (
                <tr key={row.time} className="table-row">
                  <td className="px-3 py-1.5 tabular-nums">
                    {format.dateTime(new Date(row.time), { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  {station.series.map((item) => (
                    <td key={item.key} className="px-3 py-1.5 tabular-nums">
                      {formatMeasure(row.values[item.key], format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
