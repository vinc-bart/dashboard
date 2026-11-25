import { describe, expect, it } from "vitest";
import { MARKER_COLORS, colorFor, mapLegendItems } from "./marker-colors";

const landmarks = [
  { id: "metro", color: "#c8102e", label: "Métro Robespierre" },
  { id: "street", color: "#3d7ea6", label: "Rue Étienne Marcel" },
] as const;

describe("colorFor", () => {
  it("colors Vélib’ stations by bikes available", () => {
    expect(colorFor("velib", { numbikesavailable: 0 })).toBe(MARKER_COLORS.unavailable);
    expect(colorFor("velib", {})).toBe(MARKER_COLORS.unavailable);
    expect(colorFor("velib", { numbikesavailable: 1 })).toBe(MARKER_COLORS.low);
    expect(colorFor("velib", { numbikesavailable: 4 })).toBe(MARKER_COLORS.low);
    expect(colorFor("velib", { numbikesavailable: 5 })).toBe(MARKER_COLORS.available);
  });

  it("colors a status field red when it contains non or hors", () => {
    expect(colorFor("status", { dispo: "OUI" })).toBe(MARKER_COLORS.available);
    expect(colorFor("status", { statut: "En service" })).toBe(MARKER_COLORS.available);
    expect(colorFor("status", { dispo: "NON" })).toBe(MARKER_COLORS.unavailable);
    expect(colorFor("status", { statut: "Hors service" })).toBe(MARKER_COLORS.unavailable);
    expect(colorFor("status", { statut: "Non disponible" })).toBe(MARKER_COLORS.unavailable);
    expect(colorFor("status", {})).toBe(MARKER_COLORS.available);
  });

  it("prefers dispo over statut", () => {
    expect(colorFor("status", { dispo: "OUI", statut: "Hors service" })).toBe(
      MARKER_COLORS.available,
    );
  });

  it("returns undefined without a scheme", () => {
    expect(colorFor(undefined, { numbikesavailable: 0, statut: "Hors service" })).toBeUndefined();
  });
});

describe("mapLegendItems", () => {
  it("lists Vélib’ thresholds then landmarks", () => {
    expect(mapLegendItems("velib", landmarks).map((item) => item.id)).toEqual([
      "velib-many",
      "velib-few",
      "velib-none",
      "landmark-metro",
      "landmark-street",
    ]);
  });

  it("lists status then landmarks", () => {
    const items = mapLegendItems("status", landmarks);
    expect(items[0]).toMatchObject({ id: "status-ok", labelKey: "legendStatusOk" });
    expect(items[1]).toMatchObject({ id: "status-down", labelKey: "legendStatusDown" });
    expect(items[2]).toMatchObject({ kind: "text", label: "Métro Robespierre" });
  });

  it("explains uniform points when only landmarks are colored", () => {
    const items = mapLegendItems(undefined, landmarks);
    expect(items[0]).toEqual({
      id: "records",
      color: MARKER_COLORS.record,
      kind: "message",
      labelKey: "legendRecords",
    });
    expect(items).toHaveLength(3);
  });

  it("returns nothing without a scheme or landmarks", () => {
    expect(mapLegendItems(undefined, [])).toEqual([]);
  });

  it("dedupes landmarks that share a color and a label", () => {
    const items = mapLegendItems(undefined, [
      landmarks[0],
      { id: "metro-copy", color: landmarks[0].color, label: landmarks[0].label },
    ]);
    expect(items.map((item) => item.id)).toEqual(["records", "landmark-metro"]);
  });
});
