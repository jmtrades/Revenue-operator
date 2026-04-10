import { describe, it, expect } from "vitest";
import {
  isChannel,
  isSequenceGoal,
  isCommunicationMode,
  CHANNEL_TYPES,
  SEQUENCE_GOALS,
  COMMUNICATION_MODES,
  CONFIDENCE_THRESHOLDS,
  RATE_LIMIT,
} from "@/lib/channel-orchestration/types";

describe("channel orchestration types", () => {
  describe("isChannel", () => {
    it("returns true for valid channels", () => {
      expect(isChannel("call")).toBe(true);
      expect(isChannel("sms")).toBe(true);
      expect(isChannel("email")).toBe(true);
    });

    it("returns false for invalid values", () => {
      expect(isChannel("fax")).toBe(false);
      expect(isChannel("")).toBe(false);
      expect(isChannel(null)).toBe(false);
      expect(isChannel(42)).toBe(false);
    });
  });

  describe("isSequenceGoal", () => {
    it("returns true for valid goals", () => {
      expect(isSequenceGoal("book_appointment")).toBe(true);
      expect(isSequenceGoal("reactivate")).toBe(true);
      expect(isSequenceGoal("qualify")).toBe(true);
      expect(isSequenceGoal("close_deal")).toBe(true);
      expect(isSequenceGoal("review_request")).toBe(true);
    });

    it("returns false for invalid goals", () => {
      expect(isSequenceGoal("invalid")).toBe(false);
      expect(isSequenceGoal(null)).toBe(false);
    });
  });

  describe("isCommunicationMode", () => {
    it("returns true for valid modes", () => {
      expect(isCommunicationMode("aggressive")).toBe(true);
      expect(isCommunicationMode("balanced")).toBe(true);
      expect(isCommunicationMode("conservative")).toBe(true);
    });

    it("returns false for invalid modes", () => {
      expect(isCommunicationMode("passive")).toBe(false);
      expect(isCommunicationMode(null)).toBe(false);
    });
  });

  describe("constants", () => {
    it("CHANNEL_TYPES has exactly 3 entries", () => {
      expect(CHANNEL_TYPES).toHaveLength(3);
    });

    it("SEQUENCE_GOALS has exactly 5 entries", () => {
      expect(SEQUENCE_GOALS).toHaveLength(5);
    });

    it("COMMUNICATION_MODES has exactly 3 entries", () => {
      expect(COMMUNICATION_MODES).toHaveLength(3);
    });

    it("CONFIDENCE_THRESHOLDS are ordered", () => {
      expect(CONFIDENCE_THRESHOLDS.AUTO_SEND).toBeGreaterThan(CONFIDENCE_THRESHOLDS.NEED_APPROVAL);
      expect(CONFIDENCE_THRESHOLDS.NEED_APPROVAL).toBeGreaterThan(CONFIDENCE_THRESHOLDS.ESCALATE);
    });

    it("RATE_LIMIT has required fields", () => {
      expect(RATE_LIMIT.RECOMMEND.limit).toBeGreaterThan(0);
      expect(RATE_LIMIT.AUTO_SEQUENCE.limit).toBeGreaterThan(0);
      expect(RATE_LIMIT.MAX_BATCH_SIZE).toBeGreaterThan(0);
    });
  });
});
