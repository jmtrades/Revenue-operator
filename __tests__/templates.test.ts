import { describe, it, expect } from "vitest";
import { buildMessage, containsRestrictedTopic } from "../src/lib/templates";

describe("Templates", () => {
  it("builds message from slots", () => {
    const msg = buildMessage("greeting", {
      greeting: "Hi there!",
      question_1: "How can I help?",
    });
    expect(msg).toContain("Hi there!");
    expect(msg).toContain("How can I help?");
  });

  it("truncates to max length", () => {
    const long = "a".repeat(300);
    const msg = buildMessage("greeting", { greeting: long, question_1: "x" });
    expect(msg.length).toBeLessThanOrEqual(250);
  });

  it("detects restricted topics", () => {
    expect(containsRestrictedTopic("our pricing guarantee")).toBe(true);
    expect(containsRestrictedTopic("legal advice")).toBe(true);
    expect(containsRestrictedTopic("hello world")).toBe(false);
  });
});
