import { describe, it, expect } from "vitest";
import {
  passesStageLimit,
  passesCooldownLadder,
  getCooldownSeconds,
  COOLDOWN_LADDER,
} from "../src/lib/autopilot";

describe("Stage-based limits", () => {
  it("NEW allows max 2 per day", () => {
    expect(passesStageLimit("NEW", 0)).toBe(true);
    expect(passesStageLimit("NEW", 1)).toBe(true);
    expect(passesStageLimit("NEW", 2)).toBe(false);
  });

  it("ENGAGED allows max 4 per day", () => {
    expect(passesStageLimit("ENGAGED", 3)).toBe(true);
    expect(passesStageLimit("ENGAGED", 4)).toBe(false);
  });

  it("LOST allows max 1 per day", () => {
    expect(passesStageLimit("LOST", 0)).toBe(true);
    expect(passesStageLimit("LOST", 1)).toBe(false);
  });

  it("REACTIVATE allows max 1 per day", () => {
    expect(passesStageLimit("REACTIVATE", 0)).toBe(true);
    expect(passesStageLimit("REACTIVATE", 1)).toBe(false);
  });
});

describe("Cooldown ladder", () => {
  it("returns correct seconds per attempt", () => {
    expect(getCooldownSeconds(1)).toBe(0);
    expect(getCooldownSeconds(2)).toBe(COOLDOWN_LADDER[0]);
    expect(getCooldownSeconds(3)).toBe(COOLDOWN_LADDER[1]);
    expect(getCooldownSeconds(4)).toBe(COOLDOWN_LADDER[2]);
    expect(getCooldownSeconds(5)).toBe(COOLDOWN_LADDER[3]);
    expect(getCooldownSeconds(10)).toBe(COOLDOWN_LADDER[3]);
  });

  it("passesCooldownLadder allows first message with no prior", () => {
    expect(passesCooldownLadder(null, 1)).toBe(true);
  });

  it("passesCooldownLadder enforces 5 min after 1st attempt", () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
    expect(passesCooldownLadder(fourMinutesAgo, 2)).toBe(false);
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    expect(passesCooldownLadder(sixMinutesAgo, 2)).toBe(true);
  });

  it("passesCooldownLadder enforces 2h after 2nd attempt", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(passesCooldownLadder(oneHourAgo, 3)).toBe(false);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(passesCooldownLadder(threeHoursAgo, 3)).toBe(true);
  });
});
