import type { OpenDataRecord } from "@/lib/opendata/client";
import { scalarString } from "@/lib/safe-string";

export type ColorScheme = "velib" | "status";

export const MARKER_COLORS = {
  available: "#2f9e44",
  low: "#fd7e14",
  unavailable: "#c8102e",
  record: "#12263a",
} as const;

export type LegendLabelKey =
  | "legendVelibMany"
  | "legendVelibFew"
  | "legendVelibNone"
  | "legendStatusOk"
  | "legendStatusDown"
  | "legendRecords";

export type LegendItem = {
  id: string;
  color: string;
} & ({ kind: "message"; labelKey: LegendLabelKey } | { kind: "text"; label: string });

type LegendMarker = {
  id: string;
  color?: string;
  label: string;
};

export function colorFor(
  scheme: ColorScheme | undefined,
  record: OpenDataRecord,
): string | undefined {
  if (scheme === "velib") {
    const bikes = Number(record.numbikesavailable ?? 0);
    if (bikes <= 0) return MARKER_COLORS.unavailable;
    if (bikes < 5) return MARKER_COLORS.low;
    return MARKER_COLORS.available;
  }
  if (scheme === "status") {
    const value = scalarString(record.dispo ?? record.statut).toLowerCase();
    if (value.includes("non") || value.includes("hors")) return MARKER_COLORS.unavailable;
    return MARKER_COLORS.available;
  }
  return undefined;
}

/** Scheme swatches, then landmarks. A records swatch only when landmarks sit on an uncolored set. */
export function mapLegendItems(
  scheme: ColorScheme | undefined,
  extraMarkers: readonly LegendMarker[],
): LegendItem[] {
  const items: LegendItem[] = [];
  if (scheme === "velib") {
    items.push(
      {
        id: "velib-many",
        color: MARKER_COLORS.available,
        kind: "message",
        labelKey: "legendVelibMany",
      },
      {
        id: "velib-few",
        color: MARKER_COLORS.low,
        kind: "message",
        labelKey: "legendVelibFew",
      },
      {
        id: "velib-none",
        color: MARKER_COLORS.unavailable,
        kind: "message",
        labelKey: "legendVelibNone",
      },
    );
  } else if (scheme === "status") {
    items.push(
      {
        id: "status-ok",
        color: MARKER_COLORS.available,
        kind: "message",
        labelKey: "legendStatusOk",
      },
      {
        id: "status-down",
        color: MARKER_COLORS.unavailable,
        kind: "message",
        labelKey: "legendStatusDown",
      },
    );
  } else if (extraMarkers.length > 0) {
    items.push({
      id: "records",
      color: MARKER_COLORS.record,
      kind: "message",
      labelKey: "legendRecords",
    });
  }

  const seen = new Set<string>();
  for (const marker of extraMarkers) {
    if (!marker.color || !marker.label) continue;
    const key = `${marker.color}\0${marker.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `landmark-${marker.id}`,
      color: marker.color,
      kind: "text",
      label: marker.label,
    });
  }
  return items;
}
