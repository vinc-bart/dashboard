import type { AppLocale } from "@/i18n/routing";

export const WIKIPEDIA_REVALIDATE = 86_400;
export const WIKIPEDIA_USER_AGENT = "ParisOuverte/0.2 (https://dashboard.vvbb.fr)";

export type WikipediaSection = {
  heading: string;
  level: 2 | 3 | 4;
  paragraphs: string[];
};

export type WikipediaReading = "lead" | "abridged" | "article";

export type WikipediaSummary = {
  title: string;
  extract: string;
  url: string;
  paragraphs: string[];
  sections: WikipediaSection[];
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
  return { title, extract, url, paragraphs, sections: [] };
}

const SKIPPED_HEADINGS = new Set([
  "notes",
  "notes et references",
  "references",
  "voir aussi",
  "articles connexes",
  "liens externes",
  "bibliographie",
  "annexes",
  "see also",
  "external links",
  "further reading",
  "bibliography",
  "sources",
  "notas",
  "notas y referencias",
  "referencias",
  "vease tambien",
  "enlaces externos",
  "bibliografia",
]);

function normalizeHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const HEADING_LINE = /^(={2,6})\s*(.+?)\s*\1\s*$/;

export function parseWikipediaExtract(extract: string): {
  paragraphs: string[];
  sections: WikipediaSection[];
} {
  const sections: WikipediaSection[] = [];
  const lead: string[] = [];
  let current: { heading: string; level: 2 | 3 | 4; lines: string[] } | null = null;
  let skipping = false;

  function flush() {
    if (!current) return;
    sections.push({
      heading: current.heading,
      level: current.level,
      paragraphs: summaryParagraphs(current.lines.join("\n")),
    });
    current = null;
  }

  for (const line of extract.split("\n")) {
    const match = HEADING_LINE.exec(line.trim());
    if (!match?.[1] || !match[2]) {
      if (skipping) continue;
      if (current) current.lines.push(line);
      else lead.push(line);
      continue;
    }

    const marks = match[1].length;
    const heading = match[2].trim();
    if (marks >= 5) {
      if (!skipping && current) current.lines.push(heading);
      continue;
    }

    const level = marks as 2 | 3 | 4;
    if (level === 2) skipping = SKIPPED_HEADINGS.has(normalizeHeading(heading));
    if (skipping) {
      flush();
      continue;
    }

    flush();
    current = { heading, level, lines: [] };
  }

  flush();
  return { paragraphs: summaryParagraphs(lead.join("\n")), sections };
}

export function presentWikipediaArticle(
  article: WikipediaSummary,
  reading: WikipediaReading,
): WikipediaSummary {
  if (reading === "article") return article;
  if (reading === "lead") {
    const opening = article.paragraphs[0];
    return { ...article, paragraphs: opening ? [opening] : [], sections: [] };
  }
  return {
    ...article,
    sections: article.sections.filter(
      (section) => section.level < 4 && (section.level === 2 || section.paragraphs.length > 0),
    ),
  };
}

type QueryPage = {
  missing?: boolean;
  title?: unknown;
  fullurl?: unknown;
  extract?: unknown;
};

export function parseWikipediaQuery(payload: unknown): WikipediaSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const pages = (payload as { query?: { pages?: unknown } }).query?.pages;
  const page = Array.isArray(pages) ? pages[0] : null;
  if (!page || typeof page !== "object") return null;
  const data = page as QueryPage;
  if (data.missing) return null;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const url = typeof data.fullurl === "string" ? data.fullurl : "";
  const extract = typeof data.extract === "string" ? data.extract.trim() : "";
  if (!title || !extract || !url.startsWith("https://")) return null;
  const article = parseWikipediaExtract(extract);
  const hasBody =
    article.paragraphs.length > 0 || article.sections.some((section) => section.paragraphs.length > 0);
  if (!hasBody) return null;
  return { title, extract, url, ...article };
}

async function readSummary(locale: AppLocale, title: string): Promise<WikipediaSummary | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts|info",
    inprop: "url",
    explaintext: "1",
    redirects: "1",
    format: "json",
    formatversion: "2",
    titles: title,
  });
  const url = `https://${locale}.wikipedia.org/w/api.php?${params}`;
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
    return parseWikipediaQuery(await response.json());
  } catch (error) {
    console.error("wikipedia summary failed", locale, title, error);
    return null;
  }
}

export async function fetchWikipediaSummary(
  locale: AppLocale,
  titles: Record<AppLocale, string>,
  reading: WikipediaReading = "article",
): Promise<WikipediaSummary | null> {
  const seen = new Set<string>();
  for (const lang of wikipediaLocales(locale)) {
    const title = titles[lang];
    const key = `${lang}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = await readSummary(lang, title);
    if (summary) return presentWikipediaArticle(summary, reading);
  }
  return null;
}
