import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { ok, fail } from "./response";

describe("API response envelope", () => {
  it("wraps success payloads as { data, meta }", async () => {
    const res = ok({ hello: "world" }, { requestId: "req-1" });
    const body = await res.json();
    expect(body).toEqual({
      data: { hello: "world" },
      meta: { requestId: "req-1" },
    });
    expect(res.status).toBe(200);
  });

  it("wraps failures with { error: {...} } and correct status", async () => {
    const err = new ApiError("NOT_FOUND", "Nije pronađeno.");
    const res = fail(err, "req-2");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBe("req-2");
    expect(body.error.message).toBe("Nije pronađeno.");
  });

  it("preserves fieldErrors on validation failures", async () => {
    const err = new ApiError("VALIDATION_ERROR", "Podaci nisu ispravni.", {
      fieldErrors: { email: ["Neispravna adresa."] },
    });
    const res = fail(err, "req-3");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.fieldErrors).toEqual({ email: ["Neispravna adresa."] });
  });
});
