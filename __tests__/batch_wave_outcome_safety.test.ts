/**
 * Batch wave: pause when >30% hostile/legal_risk/complaint; uses lastOutcomeType.
 */

import { describe, it, expect } from "vitest";
import { selectBatchWave, type LeadSegmentItem } from "../src/lib/intelligence/batch-controller";
import { DEFAULT_COMMITMENT_STATE } from "../src/lib/intelligence/commitment-score";

describe("Batch wave outcome safety", () => {
  it("LeadSegmentItem may include lastOutcomeType and hostilityScore", () => {
    const item: LeadSegmentItem = {
      workspace_id: "w1",
      thread_id: "t1",
      lastOutcomeType: "hostile",
      hostilityScore: 80,
      broken_commitments_count: 0,
    };
    expect(item.lastOutcomeType).toBe("hostile");
    expect(item.hostilityScore).toBe(80);
  });

  it("pauseCycle true when >30% of wave has hostile/legal_risk/complaint", () => {
    const items: LeadSegmentItem[] = [
      { workspace_id: "w", thread_id: "t1", lastOutcomeType: "hostile" },
      { workspace_id: "w", thread_id: "t2", lastOutcomeType: "legal_risk" },
      { workspace_id: "w", thread_id: "t3", lastOutcomeType: "connected" },
      { workspace_id: "w", thread_id: "t4", lastOutcomeType: "connected" },
      { workspace_id: "w", thread_id: "t5", lastOutcomeType: "connected" },
    ];
    const { pauseCycle } = selectBatchWave({
      items,
      maxPerWave: 5,
      rateConsumed: 0,
      rateLimit: 10,
    });
    expect(pauseCycle).toBe(true);
  });

  it("sort deprioritizes lastOutcomeType hostile", () => {
    const base = { ...DEFAULT_COMMITMENT_STATE };
    const items: LeadSegmentItem[] = [
      { workspace_id: "w", thread_id: "t1", lastOutcomeType: "hostile", commitmentState: base },
      { workspace_id: "w", thread_id: "t2", lastOutcomeType: "connected", commitmentState: base },
    ];
    const { wave } = selectBatchWave({ items, maxPerWave: 2, rateConsumed: 0, rateLimit: 10 });
    expect(wave[0].thread_id).toBe("t2");
  });
});
