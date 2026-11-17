import type { AppLocale } from "@/i18n/routing";
import { DATASETS } from "@/lib/opendata/datasets";
import type { WikipediaReading } from "./summary";

export const PUBLIC_THEME_SLUGS = ["velib", "nature", "air", "agenda"] as const;

export type PublicThemeSlug = (typeof PUBLIC_THEME_SLUGS)[number];

export type ThemeSectionId = "velib" | "trees" | "parks" | "air" | "events";

export type ThemeSection = {
  id: ThemeSectionId;
  sourceUrl: string;
  titles: Record<AppLocale, string>;
  reading: WikipediaReading;
};

export type PublicTheme = {
  slug: PublicThemeSlug;
  dashboardHref: `/dashboard/${string}`;
  sections: readonly ThemeSection[];
};

const titles = {
  velib: { fr: "Vélib'_Métropole", en: "Vélib'", es: "Vélib'" },
  trees: { fr: "Arbre_d'alignement", en: "Urban_forestry", es: "Árbol_urbano" },
  parks: { fr: "Espace_vert", en: "Urban_park", es: "Parque_urbano" },
  air: { fr: "Airparif", en: "Airparif", es: "Airparif" },
  agenda: { fr: "Tourisme_à_Paris", en: "Tourism_in_Paris", es: "Turismo_en_París" },
} as const satisfies Record<string, Record<AppLocale, string>>;

export const PUBLIC_THEMES: Record<PublicThemeSlug, PublicTheme> = {
  velib: {
    slug: "velib",
    dashboardHref: "/dashboard/velib",
    sections: [
      { id: "velib", sourceUrl: DATASETS.velib.sourceUrl, titles: titles.velib, reading: "abridged" },
    ],
  },
  nature: {
    slug: "nature",
    dashboardHref: "/dashboard/nature",
    sections: [
      { id: "trees", sourceUrl: DATASETS.trees.sourceUrl, titles: titles.trees, reading: "lead" },
      { id: "parks", sourceUrl: DATASETS.parks.sourceUrl, titles: titles.parks, reading: "lead" },
    ],
  },
  air: {
    slug: "air",
    dashboardHref: "/dashboard/air",
    sections: [{ id: "air", sourceUrl: DATASETS.air.sourceUrl, titles: titles.air, reading: "article" }],
  },
  agenda: {
    slug: "agenda",
    dashboardHref: "/dashboard/events",
    sections: [{ id: "events", sourceUrl: DATASETS.events.sourceUrl, titles: titles.agenda, reading: "article" }],
  },
};

export function isPublicTheme(value: string): value is PublicThemeSlug {
  return (PUBLIC_THEME_SLUGS as readonly string[]).includes(value);
}

export function publicTheme(slug: string): PublicTheme | null {
  return isPublicTheme(slug) ? PUBLIC_THEMES[slug] : null;
}
