"use client";

import dynamic from "next/dynamic";
import type { SqualesChartPoint, SqualesChartSeries } from "./squales-chart";

const Chart = dynamic(() => import("./squales-chart").then((mod) => mod.SqualesChart), {
  ssr: false,
});

export function DynamicSqualesChart({
  stationName,
  points,
  series,
}: Readonly<{
  stationName: string;
  points: SqualesChartPoint[];
  series: SqualesChartSeries[];
}>) {
  return <Chart stationName={stationName} points={points} series={series} />;
}
