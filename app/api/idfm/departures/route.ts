import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { fetchLine9Departures } from "@/lib/idfm/client";
import { idfmDeparturesLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(idfmDeparturesLimit);
  if (!auth.ok) return auth.response;

  const slug = request.nextUrl.searchParams.get("stop")?.trim() ?? "";
  const result = await fetchLine9Departures(slug);
  if (result.ok) return NextResponse.json(result);
  const status = result.error === "unknown_stop" ? 400 : result.error === "missing_key" ? 503 : 502;
  return NextResponse.json({ ok: false, error: result.error }, { status });
}
