import { describe, expect, it } from "vitest";
import { isPublicTheme, PUBLIC_THEMES, publicTheme } from "./themes";
import { parseWikipediaSummary, summaryParagraphs, wikipediaLocales } from "./summary";

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
    expect(PUBLIC_THEMES.velib.sections[0]?.sourceUrl).toContain("opendata.paris.fr");
  });
});
