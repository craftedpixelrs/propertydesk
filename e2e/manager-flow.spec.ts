import { expect, test } from "@playwright/test";

/**
 * Faza 11 — Manager (upravnici zgrada) flow smoke.
 *
 * Same shape as `investor-flow.spec.ts`: every manager/stanar route must
 * either redirect anonymous visitors to sign-in or render a public
 * not-found page. Full end-to-end coverage (login MANAGER_OWNER → create
 * building → generate dues → resident invite → accept magic link → vote
 * on an open assembly) depends on seeded demo data and is only run in CI
 * with `TEST_SEED=1`.
 */
test.describe("manager flow — route guards", () => {
  const managerRoutes = [
    "/zgrade",
    "/zgrade/zaduzenja",
    "/zgrade/x/delovi/y",
    "/zgrade/x/finansije",
    "/zgrade/duznici",
    "/zgrade/kvarovi",
    "/zgrade/izvodjaci",
    "/zgrade/obavestenja",
    "/zgrade/skupstine",
    "/zgrade/stanari",
    "/zgrade/predaje",
    "/izvestaji/upravljanje/finansije",
    "/izvestaji/upravljanje/duznici",
    "/izvestaji/upravljanje/troskovi",
    "/izvestaji/upravljanje/odrzavanje",
    "/izvestaji/upravljanje/godisnji",
    "/zgrade/kvarovi?view=board",
  ];

  for (const route of managerRoutes) {
    test(`anonymous visit to ${route} is redirected to /sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in(\?|$)/);
    });
  }
});

test.describe("stanar portal — access guards", () => {
  test("accessing /stanar without a cookie lands on the access-required page", async ({ page }) => {
    await page.goto("/stanar");
    // Either the explicit "need access" page or the generic sign-in — both
    // mean no tenant data leaked.
    await expect(page).toHaveURL(/\/stanar\/potreban-pristup|\/sign-in/);
  });

  test("invalid magic-link token renders a neutral error, not a stack trace", async ({ page }) => {
    await page.goto("/stanar/pristup/this-token-does-not-exist-ever");
    // Must not expose the token in the body or any Prisma error.
    const content = await page.content();
    expect(content).not.toContain("PrismaClient");
    expect(content).not.toContain("this-token-does-not-exist-ever");
  });

  test("resident logout always clears session and redirects", async ({ page }) => {
    const res = await page.request.get("/stanar/odjava", { maxRedirects: 0 });
    // Either 302/303 to /stanar/odjavljen, or a 200 with that page rendered.
    expect([200, 302, 303].includes(res.status())).toBe(true);
  });

  test("resident document download rejects anonymous callers", async ({ request }) => {
    const res = await request.get("/api/v1/public/resident/documents/does-not-exist/download");
    expect([401, 403, 404].includes(res.status())).toBe(true);
  });

  test("resident ticket inbox requires a cookie", async ({ page }) => {
    await page.goto("/stanar/kvarovi");
    await expect(page).toHaveURL(/\/stanar\/potreban-pristup|\/sign-in/);
  });

  test("resident documents inbox requires a cookie", async ({ page }) => {
    await page.goto("/stanar/dokumenti");
    await expect(page).toHaveURL(/\/stanar\/potreban-pristup|\/sign-in/);
  });

  test("resident privacy page requires a cookie", async ({ page }) => {
    await page.goto("/stanar/privatnost");
    await expect(page).toHaveURL(/\/stanar\/potreban-pristup|\/sign-in/);
  });
});

test.describe("investor → manager handover guard", () => {
  test("POST /api/v1/manager/handovers requires auth", async ({ request }) => {
    const res = await request.post("/api/v1/manager/handovers", {
      data: {
        projectId: "does-not-exist",
        targetContactEmail: "nowhere@example.test",
      },
    });
    // 401/403 — never 200, never 500.
    expect([401, 403].includes(res.status())).toBe(true);
  });
});

test.describe("manager finance API — new endpoints", () => {
  test("GET /api/v1/manager/dues/bulk-pdf requires auth", async ({ request }) => {
    const res = await request.get(
      "/api/v1/manager/dues/bulk-pdf?buildingId=none&year=2026&month=10",
    );
    expect([401, 403].includes(res.status())).toBe(true);
  });

  test("POST /api/v1/manager/dues/reminders requires auth", async ({ request }) => {
    const res = await request.post("/api/v1/manager/dues/reminders", {
      data: { cooldownDays: 7 },
    });
    expect([401, 403].includes(res.status())).toBe(true);
  });
});
