import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLine9Departures } from "./client";

describe("fetchLine9Departures", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a slug outside the line 9 catalog without calling PRIM", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchLine9Departures("chatelet")).resolves.toEqual({
      ok: false,
      error: "unknown_stop",
      departures: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing key without calling PRIM", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("IDFM_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchLine9Departures("robespierre")).resolves.toEqual({
      ok: false,
      error: "missing_key",
      departures: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a line 9 response and keeps the key out of the URL", async () => {
    vi.stubEnv("IDFM_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        departures: [
          {
            display_informations: {
              code: "9",
              direction: "Mairie de Montreuil (Montreuil)",
              color: "D2D200",
            },
            stop_date_time: {
              departure_date_time: "20261125T085257",
              data_freshness: "realtime",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLine9Departures("robespierre")).resolves.toMatchObject({
      ok: true,
      stop: "robespierre",
      departures: [{ direction: "Mairie de Montreuil (Montreuil)", freshness: "realtime" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, { headers: { apikey: string } }];
    expect(String(url)).toContain("/lines/line%3AIDFM%3AC01379/stop_areas/stop_area%3AIDFM%3A71725/departures");
    expect(String(url)).not.toContain("test-key");
    expect(init.headers.apikey).toBe("test-key");
  });

  it("returns idfm when PRIM answers with an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("IDFM_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(fetchLine9Departures("robespierre")).resolves.toEqual({
      ok: false,
      error: "idfm",
      departures: [],
    });
  });
});
