import { describe, it, expect } from "vitest";
import {
  getDefaultTwoPartyAnnouncement,
  suggestConsentModeFromRegion,
  buildFirstMessageWithConsent,
  isConsentRequired,
  TWO_PARTY_STATES_US,
} from "@/lib/compliance/recording-consent";

describe("recording consent", () => {
  describe("getDefaultTwoPartyAnnouncement", () => {
    it("returns non-empty announcement text", () => {
      const text = getDefaultTwoPartyAnnouncement();
      expect(text).toBeTruthy();
      expect(text).toContain("recorded");
    });
  });

  describe("suggestConsentModeFromRegion", () => {
    it("returns two_party for California", () => {
      expect(suggestConsentModeFromRegion("CA", "US")).toBe("two_party");
    });

    it("returns two_party for Illinois", () => {
      expect(suggestConsentModeFromRegion("IL", "US")).toBe("two_party");
    });

    it("returns two_party for Washington", () => {
      expect(suggestConsentModeFromRegion("WA", "US")).toBe("two_party");
    });

    it("returns null for one-party states like Texas", () => {
      expect(suggestConsentModeFromRegion("TX", "US")).toBeNull();
    });

    it("returns null for non-US countries", () => {
      expect(suggestConsentModeFromRegion("ON", "CA")).toBeNull();
    });

    it("handles null/undefined inputs", () => {
      expect(suggestConsentModeFromRegion(null, null)).toBeNull();
      expect(suggestConsentModeFromRegion(undefined, undefined)).toBeNull();
    });

    it("handles lowercase state codes", () => {
      expect(suggestConsentModeFromRegion("ca", "US")).toBe("two_party");
    });

    it("covers all known two-party states", () => {
      for (const state of TWO_PARTY_STATES_US) {
        expect(suggestConsentModeFromRegion(state, "US")).toBe("two_party");
      }
    });
  });

  describe("buildFirstMessageWithConsent", () => {
    it("returns base message when no settings", () => {
      expect(buildFirstMessageWithConsent("Hello!", null)).toBe("Hello!");
    });

    it("returns base message for one_party mode", () => {
      expect(buildFirstMessageWithConsent("Hello!", { mode: "one_party", announcementText: null, pauseOnSensitive: false })).toBe("Hello!");
    });

    it("prepends announcement for two_party mode", () => {
      const result = buildFirstMessageWithConsent("Hello!", { mode: "two_party", announcementText: null, pauseOnSensitive: false });
      expect(result).toContain("recorded");
      expect(result).toContain("Hello!");
    });

    it("uses custom announcement text", () => {
      const result = buildFirstMessageWithConsent("Hello!", { mode: "two_party", announcementText: "Custom recording notice.", pauseOnSensitive: false });
      expect(result).toContain("Custom recording notice.");
      expect(result).toContain("Hello!");
    });
  });

  describe("isConsentRequired", () => {
    it("returns true for two_party mode", () => {
      expect(isConsentRequired({ mode: "two_party", announcementText: null, pauseOnSensitive: false })).toBe(true);
    });

    it("returns false for one_party mode", () => {
      expect(isConsentRequired({ mode: "one_party", announcementText: null, pauseOnSensitive: false })).toBe(false);
    });

    it("returns false for none mode", () => {
      expect(isConsentRequired({ mode: "none", announcementText: null, pauseOnSensitive: false })).toBe(false);
    });

    it("returns false for null settings", () => {
      expect(isConsentRequired(null)).toBe(false);
    });
  });
});
