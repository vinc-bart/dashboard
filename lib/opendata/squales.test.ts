import { describe, expect, it } from "vitest";
import {
  parseSqualesNumber,
  SQUALES_STATIONS,
  squalesPoints,
  squalesSelect,
  squalesStationById,
  squalesWindowWhere,
  type SqualesStation,
} from "./squales";

const station: SqualesStation = {
  id: "fixture",
  datasetId: "fixture",
  name: "Fixture",
  line: "M1",
  sourceUrl: "https://data.ratp.fr/explore/dataset/fixture/",
  series: [
    { field: "pm", key: "pm10", axis: "pollutant" },
    { field: "temp", key: "temp", axis: "climate" },
  ],
};

describe("parseSqualesNumber", () => {
  it("reads French decimals and drops blanks", () => {
    expect(parseSqualesNumber("17,9")).toBe(17.9);
    expect(parseSqualesNumber("29")).toBe(29);
    expect(parseSqualesNumber("ND")).toBeNull();
    expect(parseSqualesNumber("<2")).toBeNull();
    expect(parseSqualesNumber("")).toBeNull();
    expect(parseSqualesNumber(null)).toBeNull();
  });
});

describe("SQUALES_STATIONS", () => {
  it("keeps the live PM10 field of each station", () => {
    expect(
      Object.fromEntries(
        SQUALES_STATIONS.map((item) => [
          item.id,
          item.series.find((series) => series.key === "pm10")?.field,
        ]),
      ),
    ).toEqual({
      franklin: "10fra1",
      chatelet: "10cha4",
      "saint-germain": "10stger4",
      iena: "10iena9",
      auber: "10auba",
      "chatelet-rer": "10chata",
      nation: "10nata",
      luxembourg: "10luxb",
    });
  });
});

describe("squalesSelect", () => {
  it("quotes fields so a leading digit stays an identifier", () => {
    expect(squalesSelect(squalesStationById("franklin"))).toBe(
      "`dateheure`,`nofra1`,`n2fra1`,`10fra1`,`c2fra1`,`tfra1`,`hyfra1`",
    );
  });
});

describe("squalesWindowWhere", () => {
  it("covers the seven days ending at the last published hour", () => {
    expect(squalesWindowWhere("2026-11-01T23:00:00+00:00")).toBe(
      "dateheure >= '2026-10-25T23:00:00+00:00'",
    );
    expect(squalesWindowWhere("not-a-date")).toBeNull();
  });
});

describe("squalesPoints", () => {
  it("keeps parsed readings in time order", () => {
    expect(
      squalesPoints(station, [
        { dateheure: "2026-11-01T02:00:00+00:00", pm: "ND", temp: "18" },
        { dateheure: "2026-11-01T01:00:00+00:00", pm: "12,5", temp: "" },
      ]),
    ).toEqual([
      { time: "2026-11-01T01:00:00+00:00", values: { pm10: 12.5 } },
      { time: "2026-11-01T02:00:00+00:00", values: { temp: 18 } },
    ]);
  });

  it("falls back to Franklin when the station id is unknown", () => {
    expect(squalesStationById("nope").id).toBe("franklin");
    expect(squalesStationById("iena").line).toBe("M9");
  });
});
