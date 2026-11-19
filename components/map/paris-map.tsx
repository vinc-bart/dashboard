"use client";

import { useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { PARIS_CENTER } from "@/lib/opendata/datasets";
import type { MapMarker } from "@/lib/opendata/markers";
import { useHtmlDark } from "@/components/theme/use-html-dark";
import "leaflet/dist/leaflet.css";

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Public by design: Leaflet requests tiles from the browser, so the key is in the tile URL. */
function cartoTileUrl(style: "light_all" | "dark_all"): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const query = key ? `?key=${encodeURIComponent(key)}` : "";
  return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png${query}`;
}

const LIGHT_TILES = {
  url: cartoTileUrl("light_all"),
  attribution: CARTO_ATTRIBUTION,
};

const DARK_TILES = {
  url: cartoTileUrl("dark_all"),
  attribution: CARTO_ATTRIBUTION,
};

/** Leaflet only listens to window resizes; the container also resizes when the layout flexes. */
function MapResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function MapBounds({
  onBounds,
}: Readonly<{
  onBounds?: (bbox: { south: number; west: number; north: number; east: number }) => void;
}>) {
  const map = useMap();

  useMapEvents({
    moveend() {
      if (!onBounds) return;
      const bounds = map.getBounds();
      onBounds({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    },
  });

  useEffect(() => {
    if (!onBounds) return;
    const bounds = map.getBounds();
    onBounds({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    });
  }, [map, onBounds]);

  return null;
}

export function ParisMap({
  markers,
  onBounds,
  className = "",
  center = PARIS_CENTER,
  zoom = 12,
  fill = false,
}: Readonly<{
  markers: MapMarker[];
  onBounds?: (bbox: { south: number; west: number; north: number; east: number }) => void;
  className?: string;
  center?: { lat: number; lon: number };
  zoom?: number;
  /** On desktop viewports, take the height the parent flex column gives instead of 420px. */
  fill?: boolean;
}>) {
  const dark = useHtmlDark();
  const t = useTranslations("Explorer");
  const hintId = useId();
  const tiles = dark ? DARK_TILES : LIGHT_TILES;

  return (
    <section
      className={`surface-panel overflow-hidden ${fill ? "flex flex-col" : ""} ${className}`}
      aria-label={t("mapLabel")}
      aria-describedby={hintId}
    >
      <p id={hintId} className="sr-only">
        {t("mapHint")}
      </p>
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={zoom}
        className={fill ? "h-[420px] w-full fill:h-auto fill:min-h-0 fill:flex-1" : "h-[420px] w-full"}
        scrollWheelZoom
        preferCanvas
      >
        <TileLayer key={tiles.url} attribution={tiles.attribution} url={tiles.url} />
        <MapResize />
        {onBounds ? <MapBounds onBounds={onBounds} /> : null}
        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.position.lat, marker.position.lon]}
            radius={7}
            pathOptions={{
              color: marker.color ?? "#0f1c2a",
              fillColor: marker.color ?? "#c8102e",
              fillOpacity: 0.85,
              weight: 1,
            }}
          >
            <Popup>
              <strong>{marker.label}</strong>
              {marker.description ? <div>{marker.description}</div> : null}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </section>
  );
}
