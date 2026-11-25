import type { GeoPoint } from "@/lib/opendata/client";

/** Generic Navitia access on PRIM. This key’s product has no `/coverage/…` prefix. */
export const IDFM_NAVITIA_BASE = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia";

export const IDFM_SOURCE_URL = "https://prim.iledefrance-mobilites.fr/";

/** Métro 9, published by PRIM as `line:IDFM:C01379`. */
export const LINE9_ID = "line:IDFM:C01379";
export const LINE9_CODE = "9";
export const LINE9_COLOR = "D2D200";

export const IDFM_REVALIDATE_SECONDS = 30;
export const IDFM_DEPARTURE_COUNT = 8;

export type Line9Stop = {
  slug: string;
  /** PRIM `stop_area.label`, kept as published. */
  label: string;
  stopAreaId: string;
  position: GeoPoint;
};

/**
 * Line 9 corridor already in the product: Paris gate, then Montreuil toward the town hall.
 * Stop-area ids and coordinates come from PRIM `/places` (Montreuil / Paris labels only).
 */
export const LINE9_STOPS = [
  {
    slug: "porte-de-montreuil",
    label: "Porte de Montreuil (Paris)",
    stopAreaId: "stop_area:IDFM:71710",
    position: { lat: 48.853596, lon: 2.410949 },
  },
  {
    slug: "robespierre",
    label: "Robespierre (Montreuil)",
    stopAreaId: "stop_area:IDFM:71725",
    position: { lat: 48.855643, lon: 2.422224 },
  },
  {
    slug: "croix-de-chavaux",
    label: "Croix de Chavaux (Montreuil)",
    stopAreaId: "stop_area:IDFM:71756",
    position: { lat: 48.858426, lon: 2.436327 },
  },
  {
    slug: "mairie-de-montreuil",
    label: "Mairie de Montreuil (Montreuil)",
    stopAreaId: "stop_area:IDFM:71785",
    position: { lat: 48.862354, lon: 2.442405 },
  },
] as const satisfies readonly Line9Stop[];

export type Line9StopSlug = (typeof LINE9_STOPS)[number]["slug"];

export function line9StopBySlug(slug: string | undefined | null): (typeof LINE9_STOPS)[number] | undefined {
  if (!slug) return undefined;
  return LINE9_STOPS.find((stop) => stop.slug === slug);
}

export function defaultLine9Stop() {
  const stop = line9StopBySlug("robespierre");
  if (!stop) throw new Error("missing robespierre stop");
  return stop;
}
