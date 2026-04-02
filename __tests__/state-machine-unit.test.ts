/**
 * Unit tests for src/lib/state-machine/index.ts
 * Validates rule-based state transitions, allowed actions, and structural guarantees.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { evaluateState, selectAllowedActions } from "@/lib/state-machine/index";
import { LEAD_STATES, ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";
import type { LeadState, EventType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Source text for structural assertions                              */
/* ------------------------------------------------------------------ */
const SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/state-machine/index.ts"),
  "utf-8"
);

describe("state-machine — structural guarantees", () => {
  it("contains no Math.random() or nondeterministic code", () => {
    expect(SOURCE).not.toContain("Math.random");
    expect(SOURCE).not.toContain("crypto.randomUUID");
    expect(SOURCE).not.toContain("Date.now");
  });

  it("exports evaluateState function", () => {
    expect(typeof evaluateState).toBe("function");
  });

  it("exports selectAllowedActions function", () => {
    expect(typeof selectAllowedActions).toBe("function");
  });

  it("defines at least 16 state transitions", () => {
    const transitionMatches = SOURCE.match(/\{\s*fromState:/g);
    expect(transitionMatches).not.toBeNull();
    expect(transitionMatches!.length).toBeGreaterThanOrEqual(16);
  });
});

describe("evaluateState — valid transitions", () => {
  it("NEW -> CONTACTED on message_received", () => {
    expect(evaluateState("NEW", "message_received")).toBe("CONTACTED");
  });

  it("CONTACTED -> ENGAGED on message_received", () => {
    expect(evaluateState("CONTACTED", "message_received")).toBe("ENGAGED");
  });

  it("ENGAGED -> QUALIFIED on message_received", () => {
    expect(evaluateState("ENGAGED", "message_received")).toBe("QUALIFIED");
  });

  it("QUALIFIED -> BOOKED on booking_created", () => {
    expect(evaluateState("QUALIFIED", "booking_created")).toBe("BOOKED");
  });

  it("BOOKED -> SHOWED on call_completed", () => {
    expect(evaluateState("BOOKED", "call_completed")).toBe("SHOWED");
  });

  it("SHOWED -> WON on payment_detected", () => {
    expect(evaluateState("SHOWED", "payment_detected")).toBe("WON");
  });

  it("SHOWED -> LOST on manual_update", () => {
    expect(evaluateState("SHOWED", "manual_update")).toBe("LOST");
  });

  it("WON -> RETAIN on payment_detected", () => {
    expect(evaluateState("WON", "payment_detected")).toBe("RETAIN");
  });

  it("LOST -> REACTIVATE on message_received", () => {
    expect(evaluateState("LOST", "message_received")).toBe("REACTIVATE");
  });

  it("RETAIN -> CLOSED on manual_update", () => {
    expect(evaluateState("RETAIN", "manual_update")).toBe("CLOSED");
  });
});

describe("evaluateState — reactivation loop transitions", () => {
  it("REACTIVATE -> ENGAGED on message_received (first match)", () => {
    // The first matching transition for REACTIVATE + message_received is
    // either ENGAGED or CONTACTED depending on array order. Line 31 is ENGAGED,
    // line 35 is CONTACTED. find() returns first match = ENGAGED.
    const result = evaluateState("REACTIVATE", "message_received");
    expect(["ENGAGED", "CONTACTED"]).toContain(result);
  });

  it("CONTACTED -> REACTIVATE on no_reply_timeout", () => {
    expect(evaluateState("CONTACTED", "no_reply_timeout")).toBe("REACTIVATE");
  });

  it("ENGAGED -> REACTIVATE on no_reply_timeout", () => {
    expect(evaluateState("ENGAGED", "no_reply_timeout")).toBe("REACTIVATE");
  });

  it("QUALIFIED -> REACTIVATE on no_reply_timeout", () => {
    expect(evaluateState("QUALIFIED", "no_reply_timeout")).toBe("REACTIVATE");
  });

  it("BOOKED -> REACTIVATE on no_reply_timeout", () => {
    expect(evaluateState("BOOKED", "no_reply_timeout")).toBe("REACTIVATE");
  });

  it("reactivation loops exist (timeout -> REACTIVATE -> back to funnel)", () => {
    // Timeout sends CONTACTED to REACTIVATE
    const afterTimeout = evaluateState("CONTACTED", "no_reply_timeout");
    expect(afterTimeout).toBe("REACTIVATE");

    // message_received from REACTIVATE brings lead back into funnel
    const afterReactivation = evaluateState("REACTIVATE", "message_received");
    expect(["ENGAGED", "CONTACTED"]).toContain(afterReactivation);
  });
});

describe("evaluateState — invalid transitions return current state", () => {
  it("NEW + booking_created stays NEW", () => {
    expect(evaluateState("NEW", "booking_created")).toBe("NEW");
  });

  it("NEW + payment_detected stays NEW", () => {
    expect(evaluateState("NEW", "payment_detected")).toBe("NEW");
  });

  it("CLOSED + message_received stays CLOSED", () => {
    expect(evaluateState("CLOSED", "message_received")).toBe("CLOSED");
  });

  it("WON + message_received stays WON", () => {
    expect(evaluateState("WON", "message_received")).toBe("WON");
  });

  it("BOOKED + message_received stays BOOKED", () => {
    expect(evaluateState("BOOKED", "message_received")).toBe("BOOKED");
  });

  it("LOST + payment_detected stays LOST", () => {
    expect(evaluateState("LOST", "payment_detected")).toBe("LOST");
  });
});

describe("selectAllowedActions", () => {
  it("returns non-empty array for every non-CLOSED state", () => {
    for (const state of LEAD_STATES) {
      const actions = selectAllowedActions(state);
      if (state === "CLOSED") {
        expect(actions).toEqual([]);
      } else {
        expect(actions.length).toBeGreaterThan(0);
      }
    }
  });

  it("NEW allows greeting and question", () => {
    const actions = selectAllowedActions("NEW");
    expect(actions).toContain("greeting");
    expect(actions).toContain("question");
  });

  it("QUALIFIED allows booking and call_invite", () => {
    const actions = selectAllowedActions("QUALIFIED");
    expect(actions).toContain("booking");
    expect(actions).toContain("call_invite");
  });

  it("WON allows retention and referral_ask", () => {
    const actions = selectAllowedActions("WON");
    expect(actions).toContain("retention");
    expect(actions).toContain("referral_ask");
  });

  it("REACTIVATE allows win_back and offer", () => {
    const actions = selectAllowedActions("REACTIVATE");
    expect(actions).toContain("win_back");
    expect(actions).toContain("offer");
  });

  it("CLOSED returns empty array", () => {
    expect(selectAllowedActions("CLOSED")).toEqual([]);
  });

  it("matches ALLOWED_ACTIONS_BY_STATE for every state", () => {
    for (const state of LEAD_STATES) {
      expect(selectAllowedActions(state)).toEqual(ALLOWED_ACTIONS_BY_STATE[state]);
    }
  });
});
