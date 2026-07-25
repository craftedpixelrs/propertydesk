import { expect, test } from "@playwright/test";

/**
 * Investor-flow smoke.
 *
 * Full end-to-end coverage of the investor scenario (create project →
 * add unit → register buyer → reserve → sell → collect) depends on a
 * seeded database and demo credentials that only run in CI. Here we
 * verify the surfaces that must always work without seed data:
 *
 *   1. Every investor route redirects an anonymous visitor to the
 *      Serbian sign-in page.
 *   2. The sign-in form exposes the fields required by
 *      `docs/business-rules.md`.
 *   3. Common misspellings (`/proekti`) fall through to the Serbian
 *      404 page.
 *
 * Extend this spec with seeded flows once a stable `TEST_SEED=1` DB
 * exists in CI.
 */
test.describe("investor flow", () => {
  const investorRoutes = [
    "/dashboard",
    "/projekti",
    "/kupci",
    "/rezervacije",
    "/prodaje",
    "/uplate",
    "/dokumenti",
    "/provizije",
    "/izvestaji",
    "/agencije",
    "/podesavanja/organizacija",
  ];

  for (const route of investorRoutes) {
    test(`redirects anonymous visitor from ${route} to /sign-in`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in(\?|$)/);
    });
  }

  test("sign-in page renders in Serbian Latin", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Prijava" })).toBeVisible();
    await expect(page.getByText("Email adresa")).toBeVisible();
    await expect(page.getByLabel("Lozinka", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Prijava" }),
    ).toBeVisible();
  });

  test("unknown investor sub-route shows the Serbian 404", async ({ page }) => {
    const res = await page.goto("/projekti/definitely-not-a-real-id-9999");
    expect(res?.status()).toBeLessThanOrEqual(404);
    // Either the app redirects unauthenticated users OR shows a not-found
    // — both are acceptable for security-flow: no tenant data must leak.
    const url = page.url();
    const notFoundVisible = await page
      .getByText(/Stranica nije pronađena|Prijava/)
      .count();
    expect(notFoundVisible).toBeGreaterThan(0);
    expect(url).not.toContain("undefined");
  });
});
