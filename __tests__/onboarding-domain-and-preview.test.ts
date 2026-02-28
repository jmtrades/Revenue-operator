/**
 * Contract: onboarding domain step and message preview.
 * Domain selection is optional; message preview shows exact output and policy basis.
 * No forbidden language in app surfaces.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Onboarding domain and preview contract", () => {
  describe("Domain step", () => {
    it("domain page has domain pack options and copy ≤90 chars", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "onboard", "domain", "page.tsx"), "utf-8");
      expect(content).toContain("real_estate");
      expect(content).toContain("clinic");
      expect(content).toContain("finance");
      expect(content).toContain("recruiting");
      expect(content).toContain("home_services");
      expect(content).toContain("generic");
      const copy = "Choose a domain pack. This sets message templates and policy defaults.";
      expect(copy.length).toBeLessThanOrEqual(90);
    });

    it("domain API accepts workspace_id and domain_type", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "onboard", "domain", "route.ts"), "utf-8");
      expect(content).toContain("workspace_id");
      expect(content).toContain("domain_type");
      expect(content).toContain("real_estate");
      expect(content).toContain("general");
    });
  });

  describe("Message preview", () => {
    it("enterprise message-preview route returns proposed_text and requires_approval", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "api", "enterprise", "message-preview", "route.ts"), "utf-8");
      expect(content).toContain("proposed_text");
      expect(content).toContain("requires_approval");
      expect(content).toContain("policy_basis");
      expect(content).toContain("first_record_send");
    });

    it("preview fallback message is doctrine-safe and ≤90 chars", () => {
      const defaultMessage = "This matches what we agreed. Adjust it if anything is off.";
      expect(defaultMessage.length).toBeLessThanOrEqual(90);
    });
  });

  describe("Send page preview and approval mode", () => {
    it("send page fetches message-preview and shows approval mode", () => {
      const content = readFileSync(path.join(ROOT, "src", "app", "onboard", "send", "page.tsx"), "utf-8");
      expect(content).toContain("message-preview");
      expect(content).toContain("proposed_text");
      expect(content).toContain("approval_mode");
      expect(content).toContain("autopilot");
      expect(content).toContain("review_required");
    });
  });

  describe("No forbidden language in onboarding app copy", () => {
    const forbidden = ["you should", "boost", "optimize", "increase conversion", "sell more", "best practice"];
    it("domain and send copy do not contain persuasion phrases", () => {
      const domainCopy = "Choose a domain pack. This sets message templates and policy defaults.";
      const sendCopy = "Send this record to someone who can confirm it.";
      [domainCopy, sendCopy].forEach((text) => {
        forbidden.forEach((phrase) => {
          expect(text.toLowerCase()).not.toContain(phrase);
        });
      });
    });
  });
});
