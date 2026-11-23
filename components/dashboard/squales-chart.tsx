"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/heading";
import { chartMotion, chartTooltipStyle, useChartChrome } from "@/components/theme/use-chart-chrome";
import type { SqualesSeriesKey } from "@/lib/opendata/squales";

const SERIES_COLOR: Record<SqualesSeriesKey, string> = {
  pm10: "#c8102e",
  pm25: "#7b1e3a",
  no2: "#3d7ea6",
  no: "#12263a",
  co2: "#fd7e14",
  temp: "#fab005",
  humi: "#2f9e44",
};

export type SqualesChartSeries = {
  key: SqualesSeriesKey;
  label: string;
  yAxisId: "left" | "right";
};

export type SqualesChartPoint = {
  time: string;
  values: Partial<Record<SqualesSeriesKey, number>>;
};

export function SqualesChart({
  stationName,
  points,
  series,
}: Readonly<{
  stationName: string;
  points: SqualesChartPoint[];
  series: SqualesChartSeries[];
}>) {
  const chrome = useChartChrome();
  const motion = chartMotion(useReducedMotion());
  const t = useTranslations("Charts");
  const title = useTranslations("Pages.air");
  const locale = useLocale();
  const summaryId = useId();
  const plotted = series.filter((item) => points.some((point) => point.values[item.key] != null));
  const data = points.map((point) => ({
    time: point.time,
    ...Object.fromEntries(plotted.map((item) => [item.key, point.values[item.key] ?? null])),
  }));
  const from = data[0]?.time;
  const to = data.at(-1)?.time;
  const dual = plotted.some((item) => item.yAxisId === "right");
  const formatTick = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
    }).format(new Date(iso));

  return (
    <Card>
      <SectionTitle className="mb-4">{title("undergroundChart")}</SectionTitle>
      {data.length === 0 || plotted.length === 0 || !from || !to ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          <p id={summaryId} className="sr-only">
            {t("squalesSummary", {
              station: stationName,
              from: formatTick(from),
              to: formatTick(to),
            })}{" "}
            {t("keyboardHint")}
          </p>
          <div className="h-[360px] w-full" aria-describedby={summaryId}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid vertical={false} stroke={chrome.grid} strokeOpacity={0.7} />
                <XAxis
                  dataKey="time"
                  stroke={chrome.tick}
                  tick={{ fill: chrome.tick }}
                  minTickGap={28}
                  tickFormatter={formatTick}
                />
                <YAxis yAxisId="left" stroke={chrome.tick} tick={{ fill: chrome.tick }} />
                {dual ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={chrome.tick}
                    tick={{ fill: chrome.tick }}
                  />
                ) : null}
                <Tooltip
                  contentStyle={chartTooltipStyle(chrome)}
                  labelFormatter={(label) => formatTick(String(label))}
                />
                <Legend wrapperStyle={{ color: chrome.ink }} />
                {plotted.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    yAxisId={item.yAxisId}
                    stroke={SERIES_COLOR[item.key]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={motion.isAnimationActive}
                    animationDuration={motion.animationDuration}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
