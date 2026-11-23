import type { OpenDataRecord } from "@/lib/opendata/client";
import { scalarString } from "@/lib/safe-string";

export type SqualesSeriesKey = "no" | "no2" | "pm10" | "pm25" | "co2" | "temp" | "humi";

export type SqualesAxis = "pollutant" | "co2" | "climate";

export type SqualesSeries = {
  field: string;
  key: SqualesSeriesKey;
  axis: SqualesAxis;
};

export type SqualesStation = {
  id: string;
  datasetId: string;
  name: string;
  line: string;
  sourceUrl: string;
  series: SqualesSeries[];
};

const RATP_DATASET = "https://data.ratp.fr/explore/dataset";

function station(
  id: string,
  datasetId: string,
  name: string,
  line: string,
  series: SqualesSeries[],
): SqualesStation {
  return {
    id,
    datasetId,
    name,
    line,
    sourceUrl: `${RATP_DATASET}/${datasetId}/`,
    series,
  };
}

/** Live SQUALES stations still published in 2026. Frozen 2013–2020 sets are omitted. */
export const SQUALES_STATIONS: SqualesStation[] = [
  station(
    "franklin",
    "qualite-de-lair-mesuree-dans-la-station-franklin-d-roosevelt-2021-maintenant",
    "Franklin D. Roosevelt",
    "M1",
    [
      { field: "nofra1", key: "no", axis: "pollutant" },
      { field: "n2fra1", key: "no2", axis: "pollutant" },
      { field: "10fra1", key: "pm10", axis: "pollutant" },
      { field: "c2fra1", key: "co2", axis: "co2" },
      { field: "tfra1", key: "temp", axis: "climate" },
      { field: "hyfra1", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "chatelet",
    "qualite-de-lair-mesuree-dans-la-station-chatelet-2021-maintenant",
    "Châtelet",
    "M4",
    [
      { field: "nocha4", key: "no", axis: "pollutant" },
      { field: "n2cha4", key: "no2", axis: "pollutant" },
      { field: "10cha4", key: "pm10", axis: "pollutant" },
      { field: "c2cha4", key: "co2", axis: "co2" },
      { field: "tcha4", key: "temp", axis: "climate" },
      { field: "hycha4", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "saint-germain",
    "qualite-de-lair-mesuree-dans-la-station-saint-germain-des-pres-de-2024-a-nos-jours-",
    "Saint-Germain-des-Prés",
    "M4",
    [
      { field: "10stger4", key: "pm10", axis: "pollutant" },
      { field: "tstger4", key: "temp", axis: "climate" },
      { field: "hystger4", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "iena",
    "qualite-de-lair-mesuree-dans-la-station-iena-de-2025-a-nos-jours",
    "Iéna",
    "M9",
    [
      { field: "10iena9", key: "pm10", axis: "pollutant" },
      { field: "tiena9", key: "temp", axis: "climate" },
      { field: "hiena9", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "auber",
    "qualite-de-lair-mesuree-dans-la-station-auber-2021-a-nos-jours",
    "Auber",
    "RER A",
    [
      { field: "noauba", key: "no", axis: "pollutant" },
      { field: "n2auba", key: "no2", axis: "pollutant" },
      { field: "10auba", key: "pm10", axis: "pollutant" },
      { field: "25auba", key: "pm25", axis: "pollutant" },
      { field: "c2auba", key: "co2", axis: "co2" },
      { field: "tauba", key: "temp", axis: "climate" },
      { field: "hyauba", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "chatelet-rer",
    "qualite-de-lair-mesuree-dans-la-station-chatelet-rer-a0",
    "Châtelet",
    "RER A",
    [
      { field: "10chata", key: "pm10", axis: "pollutant" },
      { field: "tchata", key: "temp", axis: "climate" },
      { field: "hychata", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "nation",
    "qualite-de-lair-mesuree-dans-la-station-nation-rer-a0",
    "Nation",
    "RER A",
    [
      { field: "10nata", key: "pm10", axis: "pollutant" },
      { field: "25nata", key: "pm25", axis: "pollutant" },
      { field: "tnata", key: "temp", axis: "climate" },
      { field: "hynata", key: "humi", axis: "climate" },
    ],
  ),
  station(
    "luxembourg",
    "qualite-de-lair-mesuree-dans-la-gare-luxembourg",
    "Luxembourg",
    "RER B",
    [
      { field: "10luxb", key: "pm10", axis: "pollutant" },
      { field: "tluxb", key: "temp", axis: "climate" },
      { field: "hluxb", key: "humi", axis: "climate" },
    ],
  ),
];

export const SQUALES_REVALIDATE = 3600;
export const SQUALES_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SQUALES_FETCH_MAX = 200;

const PLAIN_NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/** Hourly RATP values are text, often with a French decimal comma. ND and blanks are gaps. */
export function parseSqualesNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!PLAIN_NUMBER.test(raw)) return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function squalesStationById(id: string | undefined): SqualesStation {
  return SQUALES_STATIONS.find((item) => item.id === id) ?? SQUALES_STATIONS[0];
}

/** Seven days ending at the last published hour, not the wall clock. The feed lags by weeks. */
export function squalesWindowWhere(latestIso: string): string | null {
  const end = new Date(latestIso);
  if (Number.isNaN(end.getTime())) return null;
  const start = new Date(end.getTime() - SQUALES_WINDOW_MS);
  const stamp = start.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  return `dateheure >= '${stamp}'`;
}

/** ODSQL reads a leading digit as a number, so `10fra1` must be a quoted identifier. */
function quoteSqualesField(field: string): string {
  return `\`${field.replaceAll("`", "")}\``;
}

export function squalesSelect(station: SqualesStation): string {
  return ["dateheure", ...station.series.map((item) => item.field)].map(quoteSqualesField).join(",");
}

export type SqualesPoint = {
  time: string;
  values: Partial<Record<SqualesSeriesKey, number>>;
};

export function squalesPoints(station: SqualesStation, rows: OpenDataRecord[]): SqualesPoint[] {
  const points: SqualesPoint[] = [];
  for (const row of rows) {
    const time = scalarString(row.dateheure);
    if (!time) continue;
    const values: SqualesPoint["values"] = {};
    for (const series of station.series) {
      const parsed = parseSqualesNumber(row[series.field]);
      if (parsed != null) values[series.key] = parsed;
    }
    points.push({ time, values });
  }
  points.sort((a, b) => a.time.localeCompare(b.time));
  return points;
}

export function latestSqualesValue(
  point: SqualesPoint | undefined,
  key: SqualesSeriesKey,
): number | undefined {
  const value = point?.values[key];
  return value == null ? undefined : value;
}
