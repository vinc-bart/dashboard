import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { jsonOf, mockSessionUser } from "@/lib/api-route-test";
import { fetchLine9Departures } from "@/lib/idfm/client";
import { idfmDeparturesLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { GET } from "./route";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    idfmDeparturesLimit: { check: vi.fn() },
  };
});

vi.mock("@/lib/idfm/client", () => ({
  fetchLine9Departures: vi.fn(),
}));

const getSessionMock = vi.mocked(getSession);
const rateLimitMock = vi.mocked(idfmDeparturesLimit.check);
const fetchMock = vi.mocked(fetchLine9Departures);

describe("GET /api/idfm/departures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionUser(getSessionMock);
    rateLimitMock.mockReturnValue({ ok: true });
    fetchMock.mockResolvedValue({
      ok: true,
      stop: "robespierre",
      departures: [],
    });
  });

  it("returns 401 when there is no session", async () => {
    mockSessionUser(getSessionMock, null);
    const response = await GET(new NextRequest("http://localhost/api/idfm/departures?stop=robespierre"));
    expect(await jsonOf(response)).toMatchObject({ status: 401, body: { ok: false, error: "unauthorized" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a stop outside the catalog", async () => {
    fetchMock.mockResolvedValue({ ok: false, error: "unknown_stop", departures: [] });
    const response = await GET(new NextRequest("http://localhost/api/idfm/departures?stop=chatelet"));
    expect(await jsonOf(response)).toMatchObject({ status: 400, body: { ok: false, error: "unknown_stop" } });
  });

  it("returns the allowlisted stop payload", async () => {
    const response = await GET(new NextRequest("http://localhost/api/idfm/departures?stop=robespierre"));
    expect(await jsonOf(response)).toMatchObject({
      status: 200,
      body: { ok: true, stop: "robespierre" },
    });
    expect(fetchMock).toHaveBeenCalledWith("robespierre");
  });
});
