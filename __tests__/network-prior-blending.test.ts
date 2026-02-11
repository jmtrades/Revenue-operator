/**
 * Network prior blending: local sample dominates
 */

import { describe, it, expect } from "vitest";

function blendWeights(localSampleSize: number): { workspaceWeight: number; priorWeight: number } {
  const workspaceWeight = Math.min(1, Math.max(0, localSampleSize / 50));
  const priorWeight = 1 - workspaceWeight;
  return { workspaceWeight, priorWeight };
}

describe("network prior blending", () => {
  it("prior weight is 1 when local sample is 0", () => {
    const { workspaceWeight, priorWeight } = blendWeights(0);
    expect(workspaceWeight).toBe(0);
    expect(priorWeight).toBe(1);
  });

  it("workspace weight increases with sample size", () => {
    const { workspaceWeight: w25 } = blendWeights(25);
    const { workspaceWeight: w50 } = blendWeights(50);
    const { workspaceWeight: w100 } = blendWeights(100);
    expect(w25).toBe(0.5);
    expect(w50).toBe(1);
    expect(w100).toBe(1);
  });

  it("prior weight decreases as workspace gains data", () => {
    const { priorWeight: p0 } = blendWeights(0);
    const { priorWeight: p50 } = blendWeights(50);
    expect(p0).toBe(1);
    expect(p50).toBe(0);
  });

  it("network contribution is scaled by prior weight", () => {
    const rawPrior = 8;
    const { priorWeight } = blendWeights(10); // 10/50 = 0.2 workspace, 0.8 prior
    const blended = rawPrior * priorWeight;
    expect(blended).toBe(6.4);
  });
});
