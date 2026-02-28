/**
 * Phase II — Domain pack objection tree integrity: escalation thresholds, soft/hard redirect.
 * Fail build if objection tree is missing or malformed.
 */

import { describe, it, expect } from "vitest";
import { INDUSTRY_PACKS } from "@/lib/domain-packs/presets/industry-packs";
import type { ObjectionNode } from "@/lib/domain-packs/schema";

function countObjectionNodes(nodes: ObjectionNode[]): number {
  let n = nodes.length;
  for (const node of nodes) {
    if (node.children?.length) n += countObjectionNodes(node.children);
  }
  return n;
}

describe("Domain pack objection integrity", () => {
  it("every industry pack has objection_tree_library with at least one tree", () => {
    for (const [key, pack] of Object.entries(INDUSTRY_PACKS)) {
      const lib = pack?.objection_tree_library;
      expect(lib, `pack ${key} must have objection_tree_library`).toBeDefined();
      const entries = lib ? Object.entries(lib) : [];
      expect(entries.length, `pack ${key} must have at least one objection tree`).toBeGreaterThanOrEqual(1);
    }
  });

  it("objection tree nodes have objection_phrase and valid escalation_threshold when present", () => {
    for (const pack of Object.values(INDUSTRY_PACKS)) {
      const lib = pack?.objection_tree_library ?? {};
      for (const nodes of Object.values(lib)) {
        for (const node of nodes as ObjectionNode[]) {
          expect(typeof node.objection_phrase).toBe("string");
          expect(node.objection_phrase.length).toBeGreaterThan(0);
          if (node.escalation_threshold != null) {
            expect(["none", "low", "medium", "high", "immediate"]).toContain(node.escalation_threshold);
          }
        }
      }
    }
  });
});
