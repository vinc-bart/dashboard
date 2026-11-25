"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { Card } from "@/components/ui/card";
import type { DeparturesResult } from "@/lib/idfm/client";
import type { Departure } from "@/lib/idfm/parse";

const REFRESH_MS = 30_000;

async function loadDepartures(stop: string): Promise<DeparturesResult> {
  const res = await fetch(`/api/idfm/departures?stop=${encodeURIComponent(stop)}`);
  if (res.status === 429) throw new Error("rate_limited");
  const data = (await res.json()) as DeparturesResult;
  if (!res.ok || !data.ok) throw new Error("idfm");
  return data;
}

function DepartureRows({
  departures,
  compact,
}: Readonly<{ departures: Departure[]; compact: boolean }>) {
  const t = useTranslations("Pages.transports");
  const format = useFormatter();
  const rows = compact ? departures.slice(0, 4) : departures;
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted">{t("empty")}</p>;
  }
  return (
    <ul className={compact ? "mt-3 divide-y divide-line" : "divide-y divide-line"}>
      {rows.map((row) => (
        <li key={row.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
          <span className="flex min-w-0 items-baseline gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 translate-y-px"
              style={{ backgroundColor: `#${row.color}` }}
              aria-hidden
            />
            <span className="shrink-0 tabular-nums text-heading">{row.line}</span>
            <span className="truncate">{row.direction}</span>
          </span>
          <span className="flex shrink-0 items-baseline gap-2">
            <time className="tabular-nums text-heading" dateTime={row.at}>
              {format.dateTime(new Date(row.at), { hour: "2-digit", minute: "2-digit" })}
            </time>
            <span className="text-xs text-muted">
              {row.freshness === "realtime" ? t("live") : t("scheduled")}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DeparturesBoard({
  stop,
  initial,
  compact = false,
  children,
}: Readonly<{
  stop: string;
  initial: DeparturesResult;
  compact?: boolean;
  children?: ReactNode;
}>) {
  const t = useTranslations("Pages.transports");
  const common = useTranslations("Common");
  const format = useFormatter();
  const query = useQuery({
    queryKey: ["idfm-departures", stop],
    queryFn: () => loadDepartures(stop),
    initialData: initial.ok ? initial : undefined,
    refetchInterval: REFRESH_MS,
  });

  const data = query.data;
  const departures = data?.ok ? data.departures : [];
  const next = departures[0];
  const live = departures.filter((row) => row.freshness === "realtime").length;
  const refreshError =
    query.isError && query.error instanceof Error && query.error.message === "rate_limited"
      ? common("rateLimited")
      : query.isError
        ? t("refreshError")
        : null;

  if (compact) {
    return (
      <div>
        {refreshError ? (
          <p role="status" className="text-sm text-danger">
            {refreshError}
          </p>
        ) : null}
        {data?.ok ? <DepartureRows departures={departures} compact /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiStrip
        items={[
          {
            label: t("next"),
            value: next
              ? format.dateTime(new Date(next.at), { hour: "2-digit", minute: "2-digit" })
              : "—",
            hint: next?.direction,
          },
          {
            label: t("realtime"),
            value: departures.length ? format.number(live) : "—",
            hint: departures.length
              ? t("realtimeHint", {
                  count: format.number(live),
                  total: format.number(departures.length),
                })
              : undefined,
          },
        ]}
      />
      {children}
      {refreshError ? (
        <p role="status" className="text-sm text-danger">
          {refreshError}
        </p>
      ) : null}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2">{t("line")}</th>
                <th className="px-3 py-2">{t("direction")}</th>
                <th className="px-3 py-2">{t("time")}</th>
                <th className="px-3 py-2">{t("freshness")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.ok && departures.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted" colSpan={4}>
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                departures.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5"
                          style={{ backgroundColor: `#${row.color}` }}
                          aria-hidden
                        />
                        <span className="tabular-nums text-heading">{row.line}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.direction}</td>
                    <td className="px-3 py-2 tabular-nums text-heading">
                      <time dateTime={row.at}>
                        {format.dateTime(new Date(row.at), { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {row.freshness === "realtime" ? t("live") : t("scheduled")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
