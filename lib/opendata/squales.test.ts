import { describe, expect, it } from "vitest";
import {
  parseSqualesNumber,
  squalesPoints,
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
