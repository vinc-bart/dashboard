import type { AppLocale } from "@/i18n/routing";

export const WIKIPEDIA_REVALIDATE = 86_400;
export const WIKIPEDIA_USER_AGENT = "ParisOuverte/0.2 (https://dashboard.vvbb.fr)";

export type WikipediaSummary = {
  title: string;
  extract: string;
  url: string;
  paragraphs: string[];
};

type SummaryPayload = {
  title?: unknown;
  extract?: unknown;
  content_urls?: { desktop?: { page?: unknown } };
};

export function wikipediaLocales(locale: AppLocale): AppLocale[] {
  return locale === "fr" ? ["fr"] : [locale, "fr"];
}

export function summaryParagraphs(extract: string): string[] {
  return extract
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function parseWikipediaSummary(payload: unknown): WikipediaSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as SummaryPayload;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const extract = typeof data.extract === "string" ? data.extract.trim() : "";
  const url = data.content_urls?.desktop?.page;
  if (!title || !extract || typeof url !== "string" || !url.startsWith("https://")) return null;
  const paragraphs = summaryParagraphs(extract);
  if (paragraphs.length === 0) return null;
  return { title, extract, url, paragraphs };
}

async function readSummary(locale: AppLocale, title: string): Promise<WikipediaSummary | null> {
  const url = `https://${locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": WIKIPEDIA_USER_AGENT,
        "api-user-agent": WIKIPEDIA_USER_AGENT,
      },
      next: { revalidate: WIKIPEDIA_REVALIDATE },
    });
    if (!response.ok) return null;
    return parseWikipediaSummary(await response.json());
  } catch (error) {
    console.error("wikipedia summary failed", locale, title, error);
    return null;
  }
}

export async function fetchWikipediaSummary(
  locale: AppLocale,
  titles: Record<AppLocale, string>,
): Promise<WikipediaSummary | null> {
  const seen = new Set<string>();
  for (const lang of wikipediaLocales(locale)) {
    const title = titles[lang];
    const key = `${lang}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = await readSummary(lang, title);
    if (summary) return summary;
  }
  return null;
}
