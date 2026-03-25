import { describe, it, expect } from "vitest";
import { evaluateState, selectAllowedActions } from "../src/lib/state-machine";

describe("State Machine", () => {
  it("transitions NEW -> CONTACTED on message_received", () => {
    expect(evaluateState("NEW", "message_received")).toBe("CONTACTED");
  });

  it("transitions CONTACTED -> ENGAGED on message_received", () => {
    expect(evaluateState("CONTACTED", "message_received")).toBe("ENGAGED");
  });

  it("transitions CONTACTED -> REACTIVATE on no_reply_timeout", () => {
    expect(evaluateState("CONTACTED", "no_reply_timeout")).toBe("REACTIVATE");
  });

  it("transitions QUALIFIED -> BOOKED on booking_created", () => {
    expect(evaluateState("QUALIFIED", "booking_created")).toBe("BOOKED");
  });

  it("returns same state for unknown transition", () => {
    expect(evaluateState("WON", "message_received")).toBe("WON");
  });

  it("returns allowed actions for state", () => {
    expect(selectAllowedActions("NEW")).toEqual(["greeting", "question"]);
    expect(selectAllowedActions("QUALIFIED")).toEqual(["booking", "call_invite"]);
    expect(selectAllowedActions("CLOSED")).toEqual([]);
  });
});
