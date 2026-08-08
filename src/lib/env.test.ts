import { describe, expect, it } from "vitest";
import { publicEnv } from "./env";

describe("environment validation", () => {
  it("loads NEXT_PUBLIC values with sensible defaults", () => {
    expect(publicEnv.NEXT_PUBLIC_APP_URL).toMatch(/^https?:\/\//);
    expect(publicEnv.NEXT_PUBLIC_APP_LOCALE).toBe("sr-Latn");
    expect(publicEnv.NEXT_PUBLIC_APP_TIMEZONE).toBe("Europe/Belgrade");
    expect(publicEnv.NEXT_PUBLIC_APP_NAME).toBeTruthy();
  });
});
