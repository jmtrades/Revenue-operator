import { describe, it, expect } from "vitest";
import { getNextNode, CALL_NODES } from "../src/lib/calls/dialogue-graph";

describe("Call dialogue graph", () => {
  it("has expected nodes", () => {
    expect(CALL_NODES).toContain("intro");
    expect(CALL_NODES).toContain("situation");
    expect(CALL_NODES).toContain("routing");
  });

  it("transitions intro -> situation on continue", () => {
    expect(getNextNode("intro", "continue")).toBe("situation");
  });

  it("returns end on end condition", () => {
    expect(getNextNode("intro", "end")).toBe("end");
  });

  it("defaults to routing for unmatched condition", () => {
    expect(getNextNode("qualification", "unknown")).toBe("routing");
  });
});
