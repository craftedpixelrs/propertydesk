import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe used by the Docker/Caddy healthcheck.
 *
 * This intentionally does NOT touch the database — a Postgres blip
 * shouldn't cascade into "container unhealthy → restart loop". A separate
 * `/api/health/db` (not implemented yet) would gate DB readiness for
 * blue/green deploys.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", ts: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
