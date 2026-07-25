import { expect, test } from "@playwright/test";

/**
 * Agency-portal smoke.
 *
 * Verifies that every agency route redirects anonymous visitors to
 * sign-in and that the portal does not leak investor URLs to
 * unauthenticated users. Full portal flow (buyer registration →
 * reservation request → commission view) requires seeded credentials.
 */
test.describe("agency portal", () => {
  const agencyRoutes = [
    "/ponuda",
    "/moji-kupci",
    "/moje-rezervacije",
    "/moje-provizije",
    "/agencija/agenti",
    "/agencija/podesavanja",
    "/agencija/konekcije",
  ];

  for (const route of agencyRoutes) {
    test(`redirects anonymous visitor from ${route} to /sign-in`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in(\?|$)/);
    });
  }

  test("agency portal API rejects unauthenticated buyer registration", async ({
    request,
  }) => {
    const res = await request.post("/api/v1/agency/registrations", {
      data: {
        projectId: "not-a-real-project",
        firstName: "Ana",
        lastName: "Anonimna",
        phone: "+381601112233",
      },
    });
    expect([401, 403]).toContain(res.status());
    const body = await res.json();
    expect(body.error).toBeTruthy();
    // Must not leak whether the project exists.
    expect(JSON.stringify(body)).not.toContain("not-a-real-project");
  });
});
