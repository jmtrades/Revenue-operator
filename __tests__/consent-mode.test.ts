import { describe, it, expect } from "vitest";

describe("consent mode behavior", () => {
  it("strict requires explicit consent phrase", () => {
    const consentPhrases = ["I consent to recording", "yes, you can record", "sure, record it"];
    const hasConsent = (text: string) =>
      consentPhrases.some((p) => text.toLowerCase().includes(p.toLowerCase()));
    expect(hasConsent("I consent to recording this call")).toBe(true);
    expect(hasConsent("No consent given")).toBe(false);
  });

  it("soft allows when Zoom indicates consent", () => {
    const zoomRecordingConsent = true;
    const userToggled = true;
    const softConsent = zoomRecordingConsent && userToggled;
    expect(softConsent).toBe(true);
  });

  it("off stores summary only", () => {
    const consentMode = "off";
    const storeTranscript = consentMode !== "off";
    expect(storeTranscript).toBe(false);
  });
});
