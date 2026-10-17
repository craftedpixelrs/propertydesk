import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe used by the Docker/Caddy healthcheck.
 *
 * This intentionally does NOT touch the database — a Postgres blip
 * shouldn't cascade into "container unhealthy → restart loop". A separate
 * `/api/health/db` (not implemented yet) would gate DB readiness for
 * blue/green deploys.
 *
 * We also return `commit` (short git SHA baked into the image at build
 * time via the BUILD_SHA Docker build-arg). This is the ground truth for
 * "which commit is actually serving traffic right now?" and is invaluable
 * when a deploy workflow reports success but the live site is stale.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const commit = process.env.BUILD_SHA ?? "unknown";
  return NextResponse.json(
    {
      status: "ok",
      ts: new Date().toISOString(),
      commit: commit.slice(0, 12),
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
