import { LINE9_CODE, LINE9_COLOR } from "./stops";

export type DepartureFreshness = "realtime" | "base_schedule";

export type Departure = {
  id: string;
  line: string;
  color: string;
  /** PRIM direction or headsign, not translated. */
  direction: string;
  /** UTC instant, ISO 8601. */
  at: string;
  freshness: DepartureFreshness;
};

const PARIS = "Europe/Paris";

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  return Number(parts.find((item) => item.type === type)?.value);
}

/** Milliseconds to add to a UTC instant to read that instant’s wall clock in `timeZone`. */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  let hour = part(parts, "hour");
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    part(parts, "year"),
    part(parts, "month") - 1,
    part(parts, "day"),
    hour,
    part(parts, "minute"),
    part(parts, "second"),
  );
  return asUtc - instant.getTime();
}

/** Navitia local datetime `YYYYMMDDTHHMMSS` in Europe/Paris → ISO UTC. */
export function navitiaLocalToIso(value: string, timeZone = PARIS): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone);
  instant = utcGuess - timeZoneOffsetMs(new Date(instant), timeZone);
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lineColor(value: unknown): string {
  const raw = text(value).replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}$/.test(raw) ? raw.toUpperCase() : LINE9_COLOR;
}

/**
 * Normalized line-9 departures. `null` when the payload is not a Navitia departures document.
 * Items that are not line 9, or that lack a direction or a parsable time, are dropped.
 */
export function parseDepartures(payload: unknown): Departure[] | null {
  const root = asRecord(payload);
  if (!root || !Array.isArray(root.departures)) return null;
  const departures: Departure[] = [];
  for (const item of root.departures) {
    const row = asRecord(item);
    if (!row) continue;
    const display = asRecord(row.display_informations);
    const when = asRecord(row.stop_date_time);
    if (!display || !when) continue;
    if (text(display.code) !== LINE9_CODE) continue;
    const direction = text(display.direction) || text(display.headsign);
    const at = navitiaLocalToIso(text(when.departure_date_time));
    if (!direction || !at) continue;
    const freshness: DepartureFreshness =
      text(when.data_freshness) === "realtime" ? "realtime" : "base_schedule";
    departures.push({
      id: `${LINE9_CODE}:${at}:${direction}`,
      line: LINE9_CODE,
      color: lineColor(display.color),
      direction,
      at,
      freshness,
    });
  }
  departures.sort((a, b) => a.at.localeCompare(b.at));
  return departures;
}
