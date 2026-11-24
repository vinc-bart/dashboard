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

const SERIES_ORDER = ["no", "no2", "pm10", "pm25", "co2", "temp", "humi"] as const;

const SERIES_AXIS: Record<SqualesSeriesKey, SqualesAxis> = {
  no: "pollutant",
  no2: "pollutant",
  pm10: "pollutant",
  pm25: "pollutant",
  co2: "co2",
  temp: "climate",
  humi: "climate",
};

/** `pm10:10fra1 temp:tfra1` in series order. Missing keys are stations that do not publish that measure. */
function seriesFrom(spec: string): SqualesSeries[] {
  const fields = new Map(spec.split(" ").map((part) => part.split(":") as [string, string]));
  return SERIES_ORDER.flatMap((key) => {
    const field = fields.get(key);
    return field ? [{ field, key, axis: SERIES_AXIS[key] }] : [];
  });
}

function station(
  id: string,
  datasetId: string,
  name: string,
  line: string,
  spec: string,
): SqualesStation {
  return {
    id,
    datasetId,
    name,
    line,
    sourceUrl: `${RATP_DATASET}/${datasetId}/`,
    series: seriesFrom(spec),
  };
}

/**
 * Live SQUALES stations still published in 2026. Frozen 2013–2020 sets are omitted.
 * One row per station: id|dataset|name|line|fields. Repeated objects were flagged as duplication.
 */
const STATION_ROWS = [
  "franklin|qualite-de-lair-mesuree-dans-la-station-franklin-d-roosevelt-2021-maintenant|Franklin D. Roosevelt|M1|no:nofra1 no2:n2fra1 pm10:10fra1 co2:c2fra1 temp:tfra1 humi:hyfra1",
  "chatelet|qualite-de-lair-mesuree-dans-la-station-chatelet-2021-maintenant|Châtelet|M4|no:nocha4 no2:n2cha4 pm10:10cha4 co2:c2cha4 temp:tcha4 humi:hycha4",
  "saint-germain|qualite-de-lair-mesuree-dans-la-station-saint-germain-des-pres-de-2024-a-nos-jours-|Saint-Germain-des-Prés|M4|pm10:10stger4 temp:tstger4 humi:hystger4",
  "iena|qualite-de-lair-mesuree-dans-la-station-iena-de-2025-a-nos-jours|Iéna|M9|pm10:10iena9 temp:tiena9 humi:hiena9",
  "auber|qualite-de-lair-mesuree-dans-la-station-auber-2021-a-nos-jours|Auber|RER A|no:noauba no2:n2auba pm10:10auba pm25:25auba co2:c2auba temp:tauba humi:hyauba",
  "chatelet-rer|qualite-de-lair-mesuree-dans-la-station-chatelet-rer-a0|Châtelet|RER A|pm10:10chata temp:tchata humi:hychata",
  "nation|qualite-de-lair-mesuree-dans-la-station-nation-rer-a0|Nation|RER A|pm10:10nata pm25:25nata temp:tnata humi:hynata",
  "luxembourg|qualite-de-lair-mesuree-dans-la-gare-luxembourg|Luxembourg|RER B|pm10:10luxb temp:tluxb humi:hluxb",
];

export const SQUALES_STATIONS: SqualesStation[] = STATION_ROWS.map((row) => {
  const [id, datasetId, name, line, spec] = row.split("|");
  return station(id ?? "", datasetId ?? "", name ?? "", line ?? "", spec ?? "");
});

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
