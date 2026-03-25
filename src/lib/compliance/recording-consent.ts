/**
 * Call recording consent and compliance.
 * Per-workspace: one-party, two-party, or no recording consent.
 * State/country-based determination; announcement text for two-party.
 */

export type RecordingConsentMode = "one_party" | "two_party" | "none";

export interface RecordingConsentSettings {
  mode: RecordingConsentMode;
  /** Custom announcement played at call start when mode is two_party. */
  announcementText: string | null;
  /** When true, agent should avoid recording during sensitive info (e.g. payment, SSN). Pause/resume is best-effort. */
  pauseOnSensitive: boolean;
}

const DEFAULT_TWO_PARTY_ANNOUNCEMENT =
  "This call may be recorded for quality and training purposes. By continuing, you consent to being recorded.";

/** Default announcement when workspace has two-party consent and no custom text. */
export function getDefaultTwoPartyAnnouncement(): string {
  return DEFAULT_TWO_PARTY_ANNOUNCEMENT;
}

/**
 * Two-party consent jurisdictions (all-party consent): at least one party must consent.
 * Used to suggest two_party when workspace operates in these states/countries.
 */
export const TWO_PARTY_STATES_US = [
  "CA", // California
  "FL", // Florida
  "IL", // Illinois
  "MD", // Maryland
  "MA", // Massachusetts
  "MT", // Montana
  "NH", // New Hampshire
  "PA", // Pennsylvania
  "WA", // Washington
  "CT", // Connecticut
  "MI", // Michigan
] as const;

export const TWO_PARTY_COUNTRIES = ["US"] as const; // expand with country codes where all-party applies

/**
 * Suggest consent mode from state/country. Does not override workspace choice; use for UI hint only.
 */
export function suggestConsentModeFromRegion(stateCode?: string | null, countryCode?: string | null): RecordingConsentMode | null {
  const state = (stateCode ?? "").toUpperCase().trim().slice(0, 2);
  const country = (countryCode ?? "US").toUpperCase().trim().slice(0, 2);
  if (country === "US" && state && (TWO_PARTY_STATES_US as readonly string[]).includes(state)) {
    return "two_party";
  }
  return null;
}

/**
 * Build the first message for a call: if two_party, prepend the consent announcement.
 */
export function buildFirstMessageWithConsent(
  baseFirstMessage: string,
  settings: RecordingConsentSettings | null
): string {
  if (!settings || settings.mode !== "two_party") return baseFirstMessage;
  const announcement = (settings.announcementText ?? "").trim() || getDefaultTwoPartyAnnouncement();
  return `${announcement} ${baseFirstMessage}`.trim();
}

/**
 * Whether recording consent is required (two-party) for compliance checks.
 */
export function isConsentRequired(settings: RecordingConsentSettings | null): boolean {
  return settings?.mode === "two_party";
}
