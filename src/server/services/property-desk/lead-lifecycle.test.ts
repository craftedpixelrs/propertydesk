import { describe, expect, it } from "vitest";

import {
  computeLevel,
  FORWARD_TRANSITIONS,
  isForwardTransition,
  nextAllowedStages,
  ROLE_LEVELS,
  stageChangeCrossesLevel,
  STAGE_TO_LEVEL,
} from "./lead-lifecycle";

describe("lead-lifecycle mappings", () => {
  it("maps every stage to exactly one level", () => {
    for (const stage of Object.keys(STAGE_TO_LEVEL)) {
      expect(computeLevel(stage as never)).toBe(STAGE_TO_LEVEL[stage as never]);
    }
  });

  it("SETTER covers only SOURCING, MANAGER covers everything", () => {
    expect(ROLE_LEVELS.SETTER).toEqual(["SOURCING"]);
    expect(ROLE_LEVELS.CLOSER).toEqual(["CLOSING"]);
    expect(ROLE_LEVELS.OPERATIONS).toEqual(["OPERATIONS"]);
    expect(ROLE_LEVELS.MANAGER.sort()).toEqual(
      ["ARCHIVED", "CLOSING", "OPERATIONS", "SOURCING"].sort(),
    );
  });
});

describe("isForwardTransition", () => {
  it("no-op (same stage) is always forward", () => {
    expect(isForwardTransition("NEW", "NEW")).toBe(true);
    expect(isForwardTransition("DEMO", "DEMO")).toBe(true);
  });

  it("known forward paths are allowed", () => {
    expect(isForwardTransition("NEW", "CONTACTED")).toBe(true);
    expect(isForwardTransition("QUALIFIED", "DEMO")).toBe(true);
    expect(isForwardTransition("DEMO", "PROPOSAL")).toBe(true);
    expect(isForwardTransition("PROPOSAL", "WON")).toBe(true);
    expect(isForwardTransition("NEW", "LOST")).toBe(true);
  });

  it("backward paths need reopen", () => {
    expect(isForwardTransition("DEMO", "QUALIFIED")).toBe(false);
    expect(isForwardTransition("PROPOSAL", "DEMO")).toBe(false);
    expect(isForwardTransition("WON", "PROPOSAL")).toBe(false);
    expect(isForwardTransition("LOST", "NEW")).toBe(false);
  });

  it("skipping stages needs reopen", () => {
    expect(isForwardTransition("NEW", "PROPOSAL")).toBe(false);
    expect(isForwardTransition("CONTACTED", "WON")).toBe(false);
  });

  it("NURTURING is a park within L1 — CONTACTED ↔ NURTURING is forward", () => {
    expect(isForwardTransition("CONTACTED", "NURTURING")).toBe(true);
    expect(isForwardTransition("NURTURING", "CONTACTED")).toBe(true);
    expect(isForwardTransition("NURTURING", "QUALIFIED")).toBe(true);
  });

  it("terminal states (LOST / WON) can only stay terminal", () => {
    expect(FORWARD_TRANSITIONS.LOST).toEqual([]);
    expect(FORWARD_TRANSITIONS.WON).toEqual([]);
  });
});

describe("nextAllowedStages", () => {
  it("SUPER_ADMIN / MANAGER (role=null) sees the full forward set", () => {
    expect(nextAllowedStages("NEW", null).sort()).toEqual(
      ["CONTACTED", "LOST", "NURTURING"].sort(),
    );
    expect(nextAllowedStages("PROPOSAL", null).sort()).toEqual(
      ["LOST", "WON"].sort(),
    );
    expect(nextAllowedStages("WON", null)).toEqual([]);
  });

  it("SETTER can push into the next level (QUALIFIED → DEMO) — sistem obavlja handover", () => {
    // The plan design: SETTER may promote to CLOSING and thereby lose
    // visibility. Stage buttons remain enabled; nothing filters DEMO out.
    expect(nextAllowedStages("QUALIFIED", "SETTER")).toContain("DEMO");
  });

  it("CLOSER at PROPOSAL can push to WON (which is another level)", () => {
    expect(nextAllowedStages("PROPOSAL", "CLOSER")).toEqual(
      expect.arrayContaining(["WON", "LOST"]),
    );
  });

  it("returns [] for terminal stages regardless of role", () => {
    expect(nextAllowedStages("LOST", "SETTER")).toEqual([]);
    expect(nextAllowedStages("WON", "CLOSER")).toEqual([]);
  });
});

describe("stageChangeCrossesLevel", () => {
  it("returns true when the two stages live in different levels", () => {
    expect(stageChangeCrossesLevel("QUALIFIED", "DEMO")).toBe(true);
    expect(stageChangeCrossesLevel("PROPOSAL", "WON")).toBe(true);
    expect(stageChangeCrossesLevel("QUALIFIED", "LOST")).toBe(true);
  });

  it("returns false when they share a level", () => {
    expect(stageChangeCrossesLevel("NEW", "CONTACTED")).toBe(false);
    expect(stageChangeCrossesLevel("DEMO", "PROPOSAL")).toBe(false);
    expect(stageChangeCrossesLevel("CONTACTED", "NURTURING")).toBe(false);
  });
});
