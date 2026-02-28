/**
 * Queue type mapping invariants. Allowed queue_type only. Deterministic. No randomness.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { resolveQueueType, type QueueType } from "../src/lib/scenarios/queue-type";

const ROOT = path.resolve(__dirname, "..");
const ALLOWED: QueueType[] = [
  "inbound_queue",
  "outbound_queue",
  "commitment_queue",
  "collections_queue",
  "routing_queue",
  "review_queue",
  "exception_queue",
];

describe("Queue type mapping invariants", () => {
  it("returns only allowed queue_type", () => {
    const inputs = [
      { isInbound: true, primary_objective: "qualify", risk_score: 0, use_mode_key: "triage" },
      { isInbound: false, primary_objective: "book", risk_score: 0, use_mode_key: "list_execution" },
      { isInbound: true, primary_objective: "escalate", risk_score: 80, use_mode_key: null },
    ];
    for (const input of inputs) {
      const out = resolveQueueType(input);
      expect(ALLOWED).toContain(out);
    }
  });

  it("high risk yields exception_queue", () => {
    expect(resolveQueueType({ isInbound: true, risk_score: 75 })).toBe("exception_queue");
    expect(resolveQueueType({ isInbound: false, risk_score: 90 })).toBe("exception_queue");
  });

  it("same input yields same output (deterministic)", () => {
    const input = { isInbound: true, primary_objective: "qualify", use_mode_key: "triage" };
    expect(resolveQueueType(input)).toBe(resolveQueueType(input));
  });

  it("queue-type.ts does not import provider libs", () => {
    const full = path.join(ROOT, "src/lib/scenarios/queue-type.ts");
    const content = readFileSync(full, "utf-8");
    expect(content).not.toMatch(/from\s+['"]?.*twilio|stripe|nodemailer|sendgrid|resend/);
  });
});
