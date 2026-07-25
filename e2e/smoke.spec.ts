import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("health endpoint returns ok envelope", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(body.meta.requestId).toBeTruthy();
  });

  test("unauthenticated visitor is redirected to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Prijava" })).toBeVisible();
  });

  test("sign-in page shows Serbian labels and mobile-friendly inputs", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Email adresa")).toBeVisible();
    await expect(page.getByLabel("Lozinka", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prijava" })).toBeVisible();
  });
});
