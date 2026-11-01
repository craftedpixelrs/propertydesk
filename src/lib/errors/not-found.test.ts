import { describe, expect, it } from "vitest";

import { DomainErrors } from "./index";

describe("DomainErrors.notFound", () => {
  it("appends the standard sentence to a noun", () => {
    expect(DomainErrors.notFound("Zgrada").message).toBe("Zgrada nije pronađen.");
  });

  it("keeps a sentence that already says the record was not found", () => {
    expect(DomainErrors.notFound("Prijava nije pronađena.").message).toBe(
      "Prijava nije pronađena.",
    );
    expect(DomainErrors.notFound("Zaduženje nije pronađeno.").message).toBe(
      "Zaduženje nije pronađeno.",
    );
  });
});
