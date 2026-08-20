import { describe, expect, it } from "vitest";

import { guessImportField } from "./unit-import-columns";

describe("guessImportField", () => {
  it("maps Serbian template headers", () => {
    expect(guessImportField("Šifra")).toBe("code");
    expect(guessImportField("Ukupna površina")).toBe("totalArea");
    expect(guessImportField("Osnovna cena")).toBe("basePrice");
    expect(guessImportField("Javni opis")).toBe("publicDescription");
  });

  it("maps English template headers and canonical keys", () => {
    expect(guessImportField("Code")).toBe("code");
    expect(guessImportField("Total area")).toBe("totalArea");
    expect(guessImportField("totalArea")).toBe("totalArea");
    expect(guessImportField("basePrice")).toBe("basePrice");
  });
});
