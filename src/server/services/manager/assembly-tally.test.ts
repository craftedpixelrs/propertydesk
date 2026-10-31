import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

import { decisionPassed, sharesMeetQuorum } from "./assembly-tally";

const d = (value: string) => new Decimal(value);

describe("sharesMeetQuorum", () => {
  it("needs more than half of the building share", () => {
    expect(sharesMeetQuorum(d("50"), d("100"))).toBe(false);
    expect(sharesMeetQuorum(d("50.0001"), d("100"))).toBe(true);
    expect(sharesMeetQuorum(d("0"), d("0"))).toBe(false);
  });
});

describe("decisionPassed", () => {
  it("does not vote on information items", () => {
    expect(
      decisionPassed({
        voteKind: "INFORMATION",
        majority: "SIMPLE",
        yes: d("80"),
        no: d("0"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBeNull();
  });

  it("fails every decision when quorum is missing", () => {
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "SIMPLE",
        yes: d("10"),
        no: d("0"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: false,
      }),
    ).toBe(false);
  });

  it("passes a simple majority only when yes is more than half of the votes cast", () => {
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "SIMPLE",
        yes: d("40"),
        no: d("30"),
        abstain: d("10"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(false);
    expect(
      decisionPassed({
        voteKind: "ELECTION",
        majority: "SIMPLE",
        yes: d("41"),
        no: d("30"),
        abstain: d("10"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(true);
  });

  it("requires more than half of every share for an absolute majority", () => {
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "ABSOLUTE",
        yes: d("50"),
        no: d("10"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(false);
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "ABSOLUTE",
        yes: d("50.01"),
        no: d("10"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(true);
  });

  it("requires two thirds of every share", () => {
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "TWO_THIRDS",
        yes: d("66"),
        no: d("0"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(false);
    expect(
      decisionPassed({
        voteKind: "DECISION",
        majority: "TWO_THIRDS",
        yes: d("66.67"),
        no: d("0"),
        abstain: d("0"),
        totalShares: d("100"),
        quorumMet: true,
      }),
    ).toBe(true);
  });
});
