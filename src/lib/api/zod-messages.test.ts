import { describe, expect, it } from "vitest";
import { z } from "zod";

import { flattenZodIssues } from "./query";
import { localizeZodMessage, messageForZodIssue } from "./zod-messages";

const schema = z.object({
  name: z.string().min(1).max(10),
  email: z.string().email(),
  code: z.string().length(3),
  price: z.number().min(0).max(100),
  status: z.enum(["DRAFT", "ACTIVE"]),
});

function issuesOf(input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected failure");
  return parsed.error.issues;
}

describe("messageForZodIssue", () => {
  it("maps missing required string to a localized required message", () => {
    const [issue] = issuesOf({});
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Ovo polje je obavezno.");
    expect(messageForZodIssue(issue, "en")).toBe("This field is required.");
  });

  it("maps empty string (min 1) to required", () => {
    const [issue] = issuesOf({ name: "" });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Ovo polje je obavezno.");
    expect(messageForZodIssue(issue, "en")).toBe("This field is required.");
  });

  it("maps max length with the limit", () => {
    const [issue] = issuesOf({ name: "abcdefghijk" });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Unesite najviše 10 karaktera.");
    expect(messageForZodIssue(issue, "en")).toBe("Enter at most 10 characters.");
  });

  it("maps email format", () => {
    const [issue] = issuesOf({ name: "Ok", email: "nije-email" });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Unesite ispravnu email adresu.");
    expect(messageForZodIssue(issue, "en")).toBe("Enter a valid email address.");
  });

  it("maps exact length", () => {
    const [issue] = issuesOf({ name: "Ok", email: "a@b.co", code: "EU" });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Unesite tačno 3 karaktera.");
    expect(messageForZodIssue(issue, "en")).toBe("Enter exactly 3 characters.");
  });

  it("maps number type mismatch", () => {
    const [issue] = issuesOf({
      name: "Ok",
      email: "a@b.co",
      code: "EUR",
      price: "x",
    });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Unesite ispravan broj.");
    expect(messageForZodIssue(issue, "en")).toBe("Enter a valid number.");
  });

  it("maps number minimum", () => {
    const [issue] = issuesOf({
      name: "Ok",
      email: "a@b.co",
      code: "EUR",
      price: -1,
    });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe("Broj mora biti najmanje 0.");
    expect(messageForZodIssue(issue, "en")).toBe("Number must be at least 0.");
  });

  it("maps invalid enum option", () => {
    const [issue] = issuesOf({
      name: "Ok",
      email: "a@b.co",
      code: "EUR",
      price: 10,
      status: "NOPE",
    });
    expect(messageForZodIssue(issue, "sr-Latn")).toBe(
      "Izaberite jednu od ponuđenih vrednosti.",
    );
    expect(messageForZodIssue(issue, "en")).toBe("Choose one of the available options.");
  });

  it("keeps custom refine messages", () => {
    expect(
      messageForZodIssue(
        { path: ["_"], message: "Geografske koordinate se moraju uneti u paru.", code: "custom" },
        "en",
      ),
    ).toBe("Geografske koordinate se moraju uneti u paru.");
  });
});

describe("flattenZodIssues", () => {
  it("groups localized messages by field path", () => {
    const out = flattenZodIssues(issuesOf({}), "en");
    expect(out.name).toEqual(["This field is required."]);
  });
});

describe("localizeZodMessage", () => {
  it("rewrites leftover English Zod copy", () => {
    expect(
      localizeZodMessage("Invalid input: expected string, received undefined", "sr-Latn"),
    ).toBe("Ovo polje je obavezno.");
    expect(
      localizeZodMessage("Invalid input: expected string, received undefined", "en"),
    ).toBe("This field is required.");
  });

  it("leaves already-localized copy alone", () => {
    expect(localizeZodMessage("Ovo polje je obavezno.", "en")).toBe("Ovo polje je obavezno.");
  });
});
