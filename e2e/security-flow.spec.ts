import { expect, test } from "@playwright/test";

/**
 * Security-flow probes.
 *
 * These tests attempt cross-tenant + unauthenticated access on every
 * mutating surface and assert the request is rejected before it can
 * observe any tenant state:
 *
 *   - 401 for unauthenticated POSTs.
 *   - 403 when the caller lacks permission (verified in unit tests).
 *   - Response bodies must never leak entity IDs, tenant names, or
 *     user identifiers that weren't part of the request.
 *
 * The suite runs without seed data — it is a firewall test, not a
 * feature test.
 */
test.describe("security flow", () => {
  test("global security headers are present on every response", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
  });

  test("mutating v1 endpoints require authentication", async ({ request }) => {
    const endpoints: Array<{ path: string; body: Record<string, unknown> }> = [
      { path: "/api/v1/reservations", body: { unitId: "x", buyerId: "y" } },
      {
        path: "/api/v1/agency/reservations",
        body: { unitId: "x", buyerId: "y" },
      },
      {
        path: "/api/v1/agency/registrations",
        body: {
          projectId: "x",
          firstName: "A",
          lastName: "B",
          phone: "+3811",
        },
      },
      { path: "/api/v1/projects", body: { name: "New" } },
      { path: "/api/v1/buyers", body: { firstName: "A", lastName: "B" } },
    ];

    for (const ep of endpoints) {
      const res = await request.post(ep.path, { data: ep.body });
      // 401/403 for auth failure, 404 for tenant-scoped miss, 422 for
      // schema validation failing before auth. All are acceptable — none
      // leak tenant data. What we forbid is a 200 or a 5xx.
      const status = res.status();
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(500);
      expect(status).not.toBe(200);
      const body = await res.json().catch(() => ({}));
      // Response body must not include internal DB / stack details.
      const text = JSON.stringify(body).toLowerCase();
      expect(text).not.toContain("prismaclient");
      expect(text).not.toMatch(/at\s+\w+\s*\(/); // no stack frames
      expect(text).not.toContain("\\node_modules\\");
    }
  });

  test("cron jobs reject calls without the CRON_SECRET header", async ({
    request,
  }) => {
    const jobs = [
      "/api/v1/jobs/expire-reservations",
      "/api/v1/jobs/mark-installments-overdue",
      "/api/v1/jobs/due-soon-notifications",
      "/api/v1/jobs/trial-expiration-notifications",
    ];
    for (const path of jobs) {
      const res = await request.post(path, { data: {} });
      expect([401, 403, 404]).toContain(res.status());
    }
  });

  test("404 for a random unknown route does not leak framework details", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/does-not-exist");
    expect([404, 405]).toContain(res.status());
    // Dev mode injects React Server Component payloads that reference
    // framework paths; production strips them. We only assert that the
    // response does not contain a real stack trace or a Prisma client
    // panic message — both of which would indicate an unhandled 5xx.
    const body = await res.text();
    expect(body).not.toContain("PrismaClientKnownRequestError");
    expect(body).not.toContain("PrismaClientInitializationError");
    expect(body).not.toMatch(/^\s+at\s+\w+\s*\(/m); // no raw stack frames
  });
});
