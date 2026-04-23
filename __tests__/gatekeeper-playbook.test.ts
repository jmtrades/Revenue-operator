import { describe, it, expect } from "vitest";
import {
  detectGatekeeper,
  generateGatekeeperMove,
  handleGatekeeper,
} from "../src/lib/voice/gatekeeper-playbook";

describe("gatekeeper-playbook — detectGatekeeper", () => {
  it("empty input → not a gatekeeper", () => {
    const d = detectGatekeeper("");
    expect(d.isGatekeeper).toBe(false);
    expect(d.type).toBe("unknown");
  });

  it("detects family member with high confidence", () => {
    const d = detectGatekeeper("This is his wife, can I help you?");
    expect(d.isGatekeeper).toBe(true);
    expect(d.type).toBe("family_member");
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("detects front desk from 'may I ask what this is regarding'", () => {
    const d = detectGatekeeper("May I ask what this is regarding?");
    expect(d.isGatekeeper).toBe(true);
    expect(d.type).toBe("front_desk");
  });

  it("detects voicemail gate", () => {
    const d = detectGatekeeper("Please leave a message after the tone.");
    expect(d.isGatekeeper).toBe(true);
    expect(d.type).toBe("voicemail_gate");
  });

  it("detects executive assistant", () => {
    const d = detectGatekeeper("I'm Jim's assistant — I handle his calendar.");
    expect(d.isGatekeeper).toBe(true);
    expect(d.type).toBe("assistant");
  });

  it("plain conversational greeting is NOT a gatekeeper", () => {
    const d = detectGatekeeper("Hi, this is Pat.");
    expect(d.isGatekeeper).toBe(false);
  });
});

describe("gatekeeper-playbook — generateGatekeeperMove", () => {
  it("voicemail_gate → leave_structured_message with target + reason", () => {
    const move = generateGatekeeperMove({
      detection: { isGatekeeper: true, type: "voicemail_gate", confidence: 0.95, matchedPhrase: "leave a message", excerpt: "" },
      targetName: "Jamie",
      reasonForCall: "your inquiry about our demo",
      yourName: "This is Alex",
      yourOrg: "Acme",
    });
    expect(move.action).toBe("leave_structured_message");
    expect(move.line).toContain("Jamie");
    expect(move.line).toContain("Acme");
  });

  it("receptionist → ask_for_target line + fallback", () => {
    const move = generateGatekeeperMove({
      detection: { isGatekeeper: true, type: "receptionist", confidence: 0.9, matchedPhrase: "reception", excerpt: "" },
      targetName: "Jamie",
      reasonForCall: "a quick question",
      yourName: "This is Alex",
      yourOrg: "Acme",
    });
    expect(move.action).toBe("ask_for_target");
    expect(move.line).toContain("Jamie");
    expect(move.fallbackLine).toBeTruthy();
  });

  it("family_member → respectful ask_best_callback_time", () => {
    const move = generateGatekeeperMove({
      detection: { isGatekeeper: true, type: "family_member", confidence: 0.95, matchedPhrase: "his wife", excerpt: "" },
      targetName: "Jamie",
      reasonForCall: "a product question",
      yourName: "This is Alex",
      yourOrg: "Acme",
    });
    expect(move.action).toBe("ask_best_callback_time");
    expect(move.line.toLowerCase()).toMatch(/sorry/);
  });
});

describe("gatekeeper-playbook — handleGatekeeper", () => {
  it("returns null move when no gatekeeper detected", () => {
    const r = handleGatekeeper("Hello?", {
      targetName: "Jamie",
      reasonForCall: "our chat earlier",
      yourName: "This is Alex",
      yourOrg: "Acme",
    });
    expect(r.detection.isGatekeeper).toBe(false);
    expect(r.move).toBeNull();
  });

  it("emits a move when a gatekeeper is detected", () => {
    const r = handleGatekeeper("This is her husband.", {
      targetName: "Jamie",
      reasonForCall: "a product question",
      yourName: "This is Alex",
      yourOrg: "Acme",
    });
    expect(r.detection.isGatekeeper).toBe(true);
    expect(r.move).not.toBeNull();
    expect(r.move?.line).toBeTruthy();
  });
});
