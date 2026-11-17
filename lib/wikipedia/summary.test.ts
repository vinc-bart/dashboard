import { describe, expect, it } from "vitest";
import { isPublicTheme, PUBLIC_THEMES, publicTheme } from "./themes";
import { parseWikipediaExtract, parseWikipediaSummary, presentWikipediaArticle, summaryParagraphs, wikipediaLocales } from "./summary";

const payload = {
  title: "Vélib' Métropole",
  extract: "Premier paragraphe.\n\nSecond paragraphe.",
  content_urls: { desktop: { page: "https://fr.wikipedia.org/wiki/V%C3%A9lib%27_M%C3%A9tropole" } },
};

describe("parseWikipediaSummary", () => {
  it("keeps the lead, the title and the article url", () => {
    expect(parseWikipediaSummary(payload)).toEqual({
      title: "Vélib' Métropole",
      extract: "Premier paragraphe.\n\nSecond paragraphe.",
      url: "https://fr.wikipedia.org/wiki/V%C3%A9lib%27_M%C3%A9tropole",
      paragraphs: ["Premier paragraphe.", "Second paragraphe."],
      sections: [],
    });
  });

  it("drops a payload without a reusable extract or a page url", () => {
    expect(parseWikipediaSummary(null)).toBeNull();
    expect(parseWikipediaSummary({ title: "Airparif", extract: "   " })).toBeNull();
    expect(
      parseWikipediaSummary({
        title: "Airparif",
        extract: "Un résumé.",
        content_urls: { desktop: { page: "http://example.test" } },
      }),
    ).toBeNull();
  });
});

describe("parseWikipediaExtract", () => {
  const extract = [
    "Premier paragraphe.",
    "",
    "Deuxième paragraphe.",
    "",
    "== Histoire ==",
    "Le réseau ouvre en 2007.",
    "",
    "=== Débuts ===",
    "Les premières stations sont à Paris.",
    "",
    "===== Détail =====",
    "Un complément.",
    "",
    "== Notes et références ==",
    "Une note.",
    "",
    "== Voir aussi ==",
    "=== Liens externes ===",
    "Un site.",
  ].join("\n");

  it("keeps the lead and the body sections, and drops the notes", () => {
    expect(parseWikipediaExtract(extract)).toEqual({
      paragraphs: ["Premier paragraphe.", "Deuxième paragraphe."],
      sections: [
        { heading: "Histoire", level: 2, paragraphs: ["Le réseau ouvre en 2007."] },
        {
          heading: "Débuts",
          level: 3,
          paragraphs: ["Les premières stations sont à Paris.", "Détail", "Un complément."],
        },
      ],
    });
  });
});
describe("presentWikipediaArticle", () => {
  const article = {
    title: "Vélib'",
    extract: "Ouverture.\n\nSuite.",
    url: "https://fr.wikipedia.org/wiki/V%C3%A9lib%27",
    paragraphs: ["Ouverture.", "Suite."],
    sections: [
      { heading: "Histoire", level: 2 as const, paragraphs: [] },
      { heading: "Débuts", level: 3 as const, paragraphs: ["Les premières stations."] },
      { heading: "Borne", level: 4 as const, paragraphs: ["Le détail de la borne."] },
    ],
  };

  it("keeps only the opening paragraph for a short page", () => {
    expect(presentWikipediaArticle(article, "lead")).toMatchObject({
      paragraphs: ["Ouverture."],
      sections: [],
    });
  });

  it("drops the finest subsections", () => {
    expect(presentWikipediaArticle(article, "abridged").sections.map((section) => section.heading)).toEqual([
      "Histoire",
      "Débuts",
    ]);
  });
});
describe("summaryParagraphs", () => {
  it("splits a multi-line extract and drops blank lines", () => {
    expect(summaryParagraphs("Un.\n\nDeux.\n")).toEqual(["Un.", "Deux."]);
  });
});

describe("wikipediaLocales", () => {
  it("reads the locale edition, then French", () => {
    expect(wikipediaLocales("fr")).toEqual(["fr"]);
    expect(wikipediaLocales("en")).toEqual(["en", "fr"]);
    expect(wikipediaLocales("es")).toEqual(["es", "fr"]);
  });
});

describe("public themes", () => {
  it("keeps the four landing slugs and their private maps", () => {
    expect(isPublicTheme("velib")).toBe(true);
    expect(isPublicTheme("login")).toBe(false);
    expect(publicTheme("nature")?.sections.map((section) => section.id)).toEqual([
      "trees",
      "parks",
    ]);
    expect(PUBLIC_THEMES.air.sections[0]?.titles).toEqual({
      fr: "Airparif",
      en: "Airparif",
      es: "Airparif",
    });
    expect(PUBLIC_THEMES.agenda.dashboardHref).toBe("/dashboard/events");
    expect(PUBLIC_THEMES.velib.sections[0]?.reading).toBe("abridged");
    expect(PUBLIC_THEMES.nature.sections.every((section) => section.reading === "lead")).toBe(true);
    expect(PUBLIC_THEMES.air.sections[0]?.reading).toBe("article");
    expect(PUBLIC_THEMES.agenda.sections[0]?.reading).toBe("article");
  });
});
