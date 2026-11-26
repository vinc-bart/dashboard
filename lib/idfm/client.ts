import { parseDepartures, type Departure } from "./parse";
import {
  IDFM_DEPARTURE_COUNT,
  IDFM_NAVITIA_BASE,
  IDFM_REVALIDATE_SECONDS,
  LINE9_ID,
  line9StopBySlug,
  type Line9StopSlug,
} from "./stops";

export type DeparturesResult =
  | { ok: true; stop: Line9StopSlug; departures: Departure[] }
  | { ok: false; error: "unknown_stop" | "missing_key" | "idfm"; departures: [] };

type IdfmFetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

function idfmKey(): string {
  return process.env.IDFM_API_KEY?.trim() ?? "";
}

/** Next line-9 departures for an allowlisted stop. Never throws; the key stays on the server. */
export async function fetchLine9Departures(slug: string): Promise<DeparturesResult> {
  const stop = line9StopBySlug(slug);
  if (!stop) return { ok: false, error: "unknown_stop", departures: [] };
  const key = idfmKey();
  if (!key) {
    console.error("[idfm] missing IDFM_API_KEY");
    return { ok: false, error: "missing_key", departures: [] };
  }

  const url = new URL(
    `${IDFM_NAVITIA_BASE}/lines/${encodeURIComponent(LINE9_ID)}/stop_areas/${encodeURIComponent(stop.stopAreaId)}/departures`,
  );
  url.searchParams.set("count", String(IDFM_DEPARTURE_COUNT));
  url.searchParams.set("data_freshness", "realtime");
  url.searchParams.set("disable_geojson", "true");

  try {
    const init: IdfmFetchInit = {
      headers: { apikey: key, Accept: "application/json" },
      next: { revalidate: IDFM_REVALIDATE_SECONDS, tags: [`idfm:${stop.slug}`] },
      signal: AbortSignal.timeout(10_000),
    };
    const res = await fetch(url, init);
    if (!res.ok) {
      console.error(`[idfm] departures ${stop.slug}: ${res.status}`);
      return { ok: false, error: "idfm", departures: [] };
    }
    const departures = parseDepartures(await res.json());
    if (!departures) {
      console.error(`[idfm] departures ${stop.slug}: invalid payload`);
      return { ok: false, error: "idfm", departures: [] };
    }
    return { ok: true, stop: stop.slug, departures };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unavailable";
    console.error(`[idfm] departures ${stop.slug}: ${message}`);
    return { ok: false, error: "idfm", departures: [] };
  }
}
