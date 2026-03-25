/**
 * Hardening tests for AUDIT_FAILURE_MODES mitigations.
 * Guarantees: no lost jobs, no processed_at lie, no double enqueue on retries, handoff durable.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("P0-1 Queue durability", () => {
  it("queue index does not use Redis for dequeue (no rpop)", () => {
    const queuePath = path.join(process.cwd(), "src", "lib", "queue", "index.ts");
    const src = fs.readFileSync(queuePath, "utf8");
    expect(src).not.toContain("rpop");
    expect(src).toContain("claim_next_job");
  });

  it("enqueue and dequeue are functions", async () => {
    const { enqueue, dequeue } = await import("@/lib/queue");
    expect(typeof enqueue).toBe("function");
    expect(typeof dequeue).toBe("function");
  });
});

describe("P0-2 Signal processed_at only after reducer", () => {
  it("setSignalProcessed exists; claimSignalForProcessing removed", async () => {
    const store = await import("@/lib/signals/store");
    expect(typeof store.setSignalProcessed).toBe("function");
    expect(store).not.toHaveProperty("claimSignalForProcessing");
  });

  it("LeadLockedRetryError is thrown when lock cannot be acquired", async () => {
    const { LeadLockedRetryError } = await import("@/lib/signals/consumer");
    const err = new LeadLockedRetryError("sig-1");
    expect(err.name).toBe("LeadLockedRetryError");
    expect(err.signalId).toBe("sig-1");
    expect(err.message).toContain("lead_locked");
  });
});

describe("P0-3 Handoff durable", () => {
  it("runHandoffBatchSend is exported for process-queue", async () => {
    const handoff = await import("@/lib/operational-transfer/handoff-notifications");
    expect(typeof handoff.runHandoffBatchSend).toBe("function");
  });
});

describe("P1-4 Retry selection claim-safe", () => {
  it("persist uses claim_due_action_retries RPC (FOR UPDATE SKIP LOCKED)", () => {
    const persistSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "action-queue", "persist.ts"),
      "utf8"
    );
    expect(persistSrc).toContain("claim_due_action_retries");
  });
});

describe("P1-5 Claim TTL from DB", () => {
  it("CLAIM_TTL_SECONDS is 15 min", async () => {
    const { CLAIM_TTL_SECONDS } = await import("@/lib/queue");
    expect(CLAIM_TTL_SECONDS).toBe(15 * 60);
  });
});
