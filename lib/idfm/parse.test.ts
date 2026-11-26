import { describe, expect, it } from "vitest";
import { navitiaLocalToIso, parseDepartures } from "./parse";

const FIXTURE = {
  departures: [
    {
      display_informations: {
        commercial_mode: "Bus",
        code: "202",
        direction: "Porte de Montreuil (Paris)",
        color: "640082",
      },
      stop_date_time: {
        departure_date_time: "20261125T085000",
        data_freshness: "realtime",
      },
    },
    {
      display_informations: {
        commercial_mode: "Métro",
        code: "9",
        direction: "Pont de Sèvres (Boulogne-Billancourt)",
        headsign: "Pont de Sèvres",
        color: "D2D200",
      },
      stop_date_time: {
        departure_date_time: "20261125T085308",
        data_freshness: "base_schedule",
      },
    },
    {
      display_informations: {
        commercial_mode: "Métro",
        code: "9",
        direction: "Mairie de Montreuil (Montreuil)",
        color: "not-a-color",
      },
      stop_date_time: {
        departure_date_time: "20261125T085257",
        data_freshness: "realtime",
      },
    },
    {
      display_informations: {
        code: "9",
        direction: "",
        headsign: "",
      },
      stop_date_time: {
        departure_date_time: "20261125T090000",
        data_freshness: "realtime",
      },
    },
  ],
};

describe("navitiaLocalToIso", () => {
  it("converts a Paris winter local time to UTC", () => {
    expect(navitiaLocalToIso("20261125T085257")).toBe("2026-11-25T07:52:57.000Z");
  });

  it("converts a Paris summer local time to UTC", () => {
    expect(navitiaLocalToIso("20260715T085257")).toBe("2026-07-15T06:52:57.000Z");
  });

  it("rejects a malformed timestamp", () => {
    expect(navitiaLocalToIso("2026-11-25T08:52:57")).toBeNull();
    expect(navitiaLocalToIso("20261125T256000")).toBeNull();
  });
});

describe("parseDepartures", () => {
  it("keeps line 9 passages in time order and drops the rest", () => {
    expect(parseDepartures(FIXTURE)).toEqual([
      {
        id: "9:2026-11-25T07:52:57.000Z:Mairie de Montreuil (Montreuil)",
        line: "9",
        color: "D2D200",
        direction: "Mairie de Montreuil (Montreuil)",
        at: "2026-11-25T07:52:57.000Z",
        freshness: "realtime",
      },
      {
        id: "9:2026-11-25T07:53:08.000Z:Pont de Sèvres (Boulogne-Billancourt)",
        line: "9",
        color: "D2D200",
        direction: "Pont de Sèvres (Boulogne-Billancourt)",
        at: "2026-11-25T07:53:08.000Z",
        freshness: "base_schedule",
      },
    ]);
  });

  it("returns null when the document has no departures array", () => {
    expect(parseDepartures(null)).toBeNull();
    expect(parseDepartures({})).toBeNull();
    expect(parseDepartures({ departures: "nope" })).toBeNull();
  });

  it("returns an empty list when the stop has no line 9 passage", () => {
    expect(parseDepartures({ departures: [] })).toEqual([]);
  });
});
