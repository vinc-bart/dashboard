"use client";

import { useTranslations } from "next-intl";
import {
  mapLegendItems,
  type ColorScheme,
  type LegendItem,
} from "@/lib/opendata/marker-colors";
import type { MapMarker } from "@/lib/opendata/markers";

function itemLabel(
  item: LegendItem,
  t: ReturnType<typeof useTranslations<"Explorer">>,
) {
  return item.kind === "text" ? item.label : t(item.labelKey);
}

export function MapLegend({
  colorScheme,
  extraMarkers = [],
}: Readonly<{
  colorScheme?: ColorScheme;
  extraMarkers?: readonly MapMarker[];
}>) {
  const t = useTranslations("Explorer");
  const items = mapLegendItems(colorScheme, extraMarkers);
  if (items.length === 0) return null;

  return (
    <ul aria-label={t("legend")} className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <span
            className="inline-block size-3 shrink-0 border border-line"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {itemLabel(item, t)}
        </li>
      ))}
    </ul>
  );
}
