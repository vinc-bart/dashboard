"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { MorphSlot } from "@/components/layout/morph-slot";
import { useHeaderCompact } from "@/components/layout/sticky-header";
import { routing, type AppLocale } from "@/i18n/routing";

const MORPH_MS = 200;

export function LocaleSwitcher({
  invert = false,
  collapsible = false,
}: Readonly<{ invert?: boolean; collapsible?: boolean }>) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Common");
  const compact = useHeaderCompact();
  const [trackedCompact, setTrackedCompact] = useState(compact);
  const [holdCodes, setHoldCodes] = useState(false);
  if (collapsible && compact !== trackedCompact) {
    setTrackedCompact(compact);
    setHoldCodes(!compact);
  }
  const frame = invert ? "border-white/20 bg-white/5 text-white" : "border-line bg-paper text-ink";
  const showCodes = collapsible && (compact || holdCodes);

  useEffect(() => {
    if (!collapsible || compact || !holdCodes) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setHoldCodes(false), reduce ? 0 : MORPH_MS);
    return () => window.clearTimeout(timeout);
  }, [collapsible, compact, holdCodes]);

  return (
    <label className="inline-flex items-center gap-2 text-xs">
      {collapsible ? (
        <span className="inline-flex items-center">
          <MorphSlot when="compact">
            <Languages
              className={`mr-1.5 h-3.5 w-3.5 ${invert ? "text-white/70" : "text-muted"}`}
              aria-hidden
            />
          </MorphSlot>
          <MorphSlot>
            <span className={invert ? "sr-only" : "text-muted"}>{t("localeSwitcher")}</span>
          </MorphSlot>
        </span>
      ) : (
        <span className={invert ? "sr-only" : "text-muted"}>{t("localeSwitcher")}</span>
      )}
      <select
        className={`rounded-none border text-xs font-medium focus-field ${
          collapsible
            ? "header-morph h-9 w-28 px-2 group-data-[compact=true]/header:h-8 group-data-[compact=true]/header:w-14 group-data-[compact=true]/header:px-1.5"
            : "h-9 px-2"
        } ${frame}`}
        value={locale}
        aria-label={
          collapsible ? `${t("localeSwitcher")}, ${t(`locale.${locale}`)}` : t("localeSwitcher")
        }
        onChange={(event) => {
          const query = window.location.search.replace(/^\?/, "");
          const href = query ? `${pathname}?${query}` : pathname;
          router.replace(href, { locale: event.target.value as AppLocale });
        }}
      >
        {routing.locales.map((item) => (
          <option key={item} value={item}>
            {showCodes ? item.toUpperCase() : t(`locale.${item}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
