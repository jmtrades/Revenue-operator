/**
 * US two-party (all-party) consent states for call recording.
 *
 * Sources:
 *   California (CA):    Pen. Code § 632
 *   Connecticut (CT):   Gen. Stat. § 52-570d (civil), § 53a-189 (criminal);
 *                       audible-tone rule applies during recording
 *   Delaware (DE):      11 Del. C. § 2402 (all-party for oral;
 *                       one-party for wire — we treat as two-party, conservative)
 *   Florida (FL):       § 934.03
 *   Hawaii (HI):        § 711-1111 (in-home all-party)
 *   Illinois (IL):      720 ILCS 5/14
 *   Maryland (MD):      Cts. & Jud. Proc. § 10-402
 *   Massachusetts (MA): Ch. 272 § 99
 *   Michigan (MI):      § 750.539c (disputed; conservative treatment)
 *   Montana (MT):       § 45-8-213
 *   Nevada (NV):        § 200.620 (all-party under NV SC)
 *   New Hampshire (NH): § 570-A
 *   Pennsylvania (PA):  18 Pa. C.S. § 5704
 *   Vermont (VT):       common law (no statute; VT SC applied two-party)
 *   Washington (WA):    RCW 9.73.030
 *
 * Phase 78 / Task 7.1. Previously the code had an incomplete list of
 * two-party states and — critically — emitted TwiML that started recording
 * (`<Record>`, `<Connect><Stream>`, `<Dial record="...">`) with no prior
 * disclosure to the caller. That shipped wiretap liability in every
 * two-party state. This module closes both gaps:
 *
 *   1. `requiresTwoPartyConsent` / `requiresAudibleTone` fail-safe on
 *      unknown input (treat as two-party).
 *   2. `injectConsentDisclosure` rewrites TwiML to guarantee a spoken
 *      disclosure precedes any recording element, regardless of which
 *      code path built the TwiML.
 */

export const TWO_PARTY_STATES = [
  "CA", "CT", "DE", "FL", "HI", "IL", "MA", "MD", "MI",
  "MT", "NV", "NH", "PA", "VT", "WA",
] as const;

export type USState = typeof TWO_PARTY_STATES[number];

const TWO_PARTY_SET = new Set<string>(TWO_PARTY_STATES);

/**
 * True when the caller is in (or cannot be proven NOT to be in) a state
 * that requires all parties to consent to recording.
 *
 * Fail-safe: unknown / null / empty input returns `true`. Never skip
 * disclosure for a caller we can't geolocate.
 */
export function requiresTwoPartyConsent(
  state: string | null | undefined,
): boolean {
  if (!state) return true;
  return TWO_PARTY_SET.has(state.toUpperCase());
}

/**
 * Connecticut specifically requires an audible signal (beep/tone) at
 * least every fifteen seconds while the recording is active, per
 * Gen. Stat. § 52-570d(b). Returns true only for CT.
 */
export function requiresAudibleTone(
  state: string | null | undefined,
): boolean {
  return (state ?? "").toUpperCase() === "CT";
}

/**
 * The single canonical disclosure phrase. Anchored here so both
 * `buildConsentDisclosureTwiml` and `injectConsentDisclosure` emit
 * identical wording, and the idempotency check in `injectConsentDisclosure`
 * can rely on a stable substring.
 */
const DISCLOSURE_SENTENCE =
  "This call may be recorded for quality assurance.";

/** Stable marker used to detect "already injected" TwiML in idempotency
 *  checks. Embedded as an attribute so it renders invisibly. */
const DISCLOSURE_MARKER = 'data-consent-disclosure="1"';

/** CT audible-tone fragment. Looped `<Play>` sits inside the recording
 *  segment; ten loops × ~1.5s is enough to cover the 15-second cadence
 *  while still being bounded so Twilio doesn't queue a 30-minute loop. */
const CT_TONE_FRAGMENT =
  '<Play loop="10">https://cdn.recall-touch.com/tone-1khz.mp3</Play>';

/**
 * Build the disclosure TwiML fragment.
 *
 * Always returns at least a `<Say>` tag. When `state === "CT"`, also
 * appends the `<Play loop>` fragment for the audible-tone rule.
 *
 * Callers that build TwiML from scratch can concatenate the return value
 * directly at the top of their `<Response>`. Callers wiring into
 * pre-built TwiML should prefer `injectConsentDisclosure` instead.
 */
export function buildConsentDisclosureTwiml(
  state?: string | null,
): string {
  const tone = requiresAudibleTone(state) ? CT_TONE_FRAGMENT : "";
  return `<Say voice="alice" ${DISCLOSURE_MARKER}>${DISCLOSURE_SENTENCE}</Say>${tone}`;
}

/**
 * Rewrite TwiML to guarantee the recording-consent disclosure precedes
 * any recording-capable element. No-op when the input:
 *   - doesn't contain any recording element, OR
 *   - already carries the disclosure marker.
 *
 * Recording-capable elements handled:
 *   - `<Record ...>` (direct voicemail / transcription)
 *   - `<Dial record="...">` (inbound/outbound dial with recording)
 *   - `<Connect>` / `<Stream>` (media streaming is a form of recording
 *     under most interpretations; CT/CA counsel generally treat it as such)
 *
 * The rewrite is a plain string operation — we do NOT parse the TwiML
 * as XML — so it stays safe for use at runtime without pulling in an
 * XML parser. The cost of this choice is the conservative set of
 * element patterns above; expand them if a new recording path is added.
 */
export function injectConsentDisclosure(
  twiml: string,
  state?: string | null,
): string {
  // Already injected? idempotent no-op.
  if (twiml.includes(DISCLOSURE_MARKER)) return twiml;

  // Does this TwiML actually record? If not, nothing to disclose.
  if (!needsDisclosure(twiml)) return twiml;

  // Prepend the disclosure directly after the opening <Response> tag.
  // (Every Twilio response document starts with `<Response>` on the
  // outermost level.)
  const openTag = /<Response(\s[^>]*)?>/;
  const match = twiml.match(openTag);
  if (!match) return twiml;

  const disclosure = buildConsentDisclosureTwiml(state);
  const insertAt = (match.index ?? 0) + match[0].length;
  return twiml.slice(0, insertAt) + disclosure + twiml.slice(insertAt);
}

function needsDisclosure(twiml: string): boolean {
  if (/<Record\b/.test(twiml)) return true;
  if (/<Dial\b[^>]*\brecord\s*=/.test(twiml)) return true;
  if (/<Connect\b/.test(twiml)) return true;
  if (/<Stream\b/.test(twiml)) return true;
  return false;
}
