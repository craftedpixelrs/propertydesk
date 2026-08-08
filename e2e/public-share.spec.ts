import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the unauthenticated `/p/[token]` unit offer
 * page.
 *
 * We intentionally do not seed a real ShareLink here — the seed
 * lifecycle is owned by the DB seeder / manual investor-flow tests.
 * These checks lock in the anonymous access surface: (a) an unknown
 * token yields a 404 rather than 5xx, and (b) the response headers
 * carry `noindex` so leaked offers never end up in a search engine.
 */
test.describe("public offer", () => {
  test("unknown token returns 404 with noindex", async ({ page }) => {
    const res = await page.goto("/p/definitely-not-a-real-token");
    expect(res).not.toBeNull();
    expect(res?.status()).toBe(404);
    const html = await page.content();
    expect(html.toLowerCase()).toContain("noindex");
  });

  test("image endpoint returns 404 for unknown token", async ({ request }) => {
    const res = await request.get(
      "/api/public/share/not-a-real-token/image/not-a-real-doc",
    );
    expect(res.status()).toBe(404);
  });

  test("dashboard is not required to reach /p", async ({ page }) => {
    // Ensures the `(dashboard)` layout's session check does not run
    // for this path — the response should not redirect to /sign-in.
    const res = await page.goto("/p/definitely-not-a-real-token");
    expect(page.url()).not.toMatch(/\/sign-in/);
    expect(res).not.toBeNull();
  });
});
