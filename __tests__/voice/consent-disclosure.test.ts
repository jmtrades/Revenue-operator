/**
 * Phase 78 / Task 7.1 — Recording consent disclosure.
 *
 * US wiretap law splits roughly into one-party-consent and two-party-consent
 * (aka all-party-consent) states. In two-party states, recording a phone call
 * without the other party's knowledge is a crime. Platforms sidestep the risk
 * by always disclosing at the start of the call: "This call may be recorded."
 * CT additionally requires an audible tone at least every 15 seconds while
 * the recording is live (Gen. Stat. § 52-570d(b)).
 *
 * This suite tests the pure helpers in `src/lib/voice/consent-states.ts` and
 * that the voice webhook route mounts them ahead of any `<Record>`, any
 * `<Dial record="...">`, and any `<Connect><Stream>` (media streams also
 * constitute recording).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  TWO_PARTY_STATES,
  requiresTwoPartyConsent,
  requiresAudibleTone,
  buildConsentDisclosureTwiml,
  injectConsentDisclosure,
} from "@/lib/voice/consent-states";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("Phase 78 Task 7.1 — US two-party consent list", () => {
  it("includes the 15 two-party states we enumerated in the spec", () => {
    // Exact set, ordered set-equality — no drift, no silent additions.
    const expected = [
      "CA", "CT", "DE", "FL", "HI", "IL", "MA", "MD", "MI",
      "MT", "NV", "NH", "PA", "VT", "WA",
    ];
    expect([...TWO_PARTY_STATES].sort()).toEqual([...expected].sort());
  });

  it("requiresTwoPartyConsent returns true for every listed state, case-insensitive", () => {
    for (const s of TWO_PARTY_STATES) {
      expect(requiresTwoPartyConsent(s)).toBe(true);
      expect(requiresTwoPartyConsent(s.toLowerCase())).toBe(true);
    }
  });

  it("requiresTwoPartyConsent returns false for a known one-party state", () => {
    // Texas, New York — plain one-party jurisdictions.
    expect(requiresTwoPartyConsent("TX")).toBe(false);
    expect(requiresTwoPartyConsent("NY")).toBe(false);
  });

  it("requiresTwoPartyConsent fails SAFE (true) when state is unknown", () => {
    // Unknown / null / undefined / empty → must treat as two-party so we
    // never accidentally skip disclosure for a caller we can't geolocate.
    expect(requiresTwoPartyConsent(null)).toBe(true);
    expect(requiresTwoPartyConsent(undefined)).toBe(true);
    expect(requiresTwoPartyConsent("")).toBe(true);
  });

  it("requiresAudibleTone is true ONLY for Connecticut", () => {
    expect(requiresAudibleTone("CT")).toBe(true);
    expect(requiresAudibleTone("ct")).toBe(true);
    // No other state — California included — gets the tone requirement.
    for (const s of TWO_PARTY_STATES) {
      if (s === "CT") continue;
      expect(requiresAudibleTone(s)).toBe(false);
    }
    expect(requiresAudibleTone(null)).toBe(false);
    expect(requiresAudibleTone(undefined)).toBe(false);
  });
});

describe("Phase 78 Task 7.1 — buildConsentDisclosureTwiml", () => {
  it("emits a <Say> disclosure containing the word 'recorded'", () => {
    const twiml = buildConsentDisclosureTwiml();
    expect(twiml).toMatch(/<Say[^>]*>[^<]*recorded[^<]*<\/Say>/);
  });

  it("adds CT audible tone (<Play> loop) only for Connecticut", () => {
    const ct = buildConsentDisclosureTwiml("CT");
    const ca = buildConsentDisclosureTwiml("CA");
    const unknown = buildConsentDisclosureTwiml();
    expect(ct).toMatch(/<Play[^>]*loop=/);
    expect(ca).not.toMatch(/<Play/);
    expect(unknown).not.toMatch(/<Play/);
  });
});

describe("Phase 78 Task 7.1 — injectConsentDisclosure", () => {
  it("prepends disclosure before <Record> in existing TwiML", () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hi</Say><Record maxLength="60"/></Response>';
    const out = injectConsentDisclosure(input);
    const disclosureIdx = out.search(/recorded/);
    const recordIdx = out.indexOf("<Record");
    expect(disclosureIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(-1);
    expect(disclosureIdx).toBeLessThan(recordIdx);
  });

  it('prepends disclosure before <Dial record="..."> in existing TwiML', () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Dial record="record-from-answer">+14155550123</Dial></Response>';
    const out = injectConsentDisclosure(input);
    const disclosureIdx = out.search(/recorded/);
    const dialIdx = out.indexOf("<Dial");
    expect(disclosureIdx).toBeLessThan(dialIdx);
  });

  it("prepends disclosure before <Connect><Stream> (media stream is a recording)", () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://voice.example.com/stream"/></Connect></Response>';
    const out = injectConsentDisclosure(input);
    const disclosureIdx = out.search(/recorded/);
    const connectIdx = out.indexOf("<Connect");
    expect(disclosureIdx).toBeLessThan(connectIdx);
  });

  it("is a no-op on TwiML that never records (no <Record>, <Dial record>, <Connect>, <Stream>)", () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Goodbye.</Say><Hangup/></Response>';
    const out = injectConsentDisclosure(input);
    expect(out).toBe(input);
  });

  it("is idempotent — a second pass does not double-inject the <Say>", () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Record maxLength="60"/></Response>';
    const once = injectConsentDisclosure(input);
    const twice = injectConsentDisclosure(once);
    expect(twice).toBe(once);
    // Only one occurrence of 'recorded' in the final TwiML.
    const occurrences = (twice.match(/recorded/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it("adds CT audible tone when state=CT", () => {
    const input =
      '<?xml version="1.0" encoding="UTF-8"?><Response><Record maxLength="60"/></Response>';
    const out = injectConsentDisclosure(input, "CT");
    expect(out).toMatch(/<Play[^>]*loop=/);
  });
});

describe("Phase 78 Task 7.1 — voice webhook route wiring", () => {
  it("route source imports injectConsentDisclosure from consent-states", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/voice/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/injectConsentDisclosure/);
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/consent-states["']/);
  });

  it("route's FALLBACK_TWIML is piped through injectConsentDisclosure", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/voice/route.ts"),
      "utf8",
    );
    // FALLBACK_TWIML must be built via the consent helper so the <Record/>
    // tag at the end can never ship without a preceding disclosure.
    expect(src).toMatch(
      /FALLBACK_TWIML\s*=\s*injectConsentDisclosure\s*\(/,
    );
  });

  it("route pipes inbound-handoff TwiML through injectConsentDisclosure", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/voice/route.ts"),
      "utf8",
    );
    // handleInboundCall returns a streaming or <Record> TwiML; the route
    // must route that through the consent helper before responding.
    expect(src).toMatch(
      /injectConsentDisclosure\s*\(\s*twiml\s*\)/,
    );
  });

  it("route pipes streaming-demo TwiML through injectConsentDisclosure", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/app/api/webhooks/twilio/voice/route.ts"),
      "utf8",
    );
    expect(src).toMatch(
      /injectConsentDisclosure\s*\(\s*streamingTwiml\s*\)/,
    );
  });

  it("call-flow busyVoicemailTwiml is piped through injectConsentDisclosure", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "src/lib/voice/call-flow.ts"),
      "utf8",
    );
    // The module must import the helper and use it to construct
    // `busyVoicemailTwiml`; if either is missing, the <Record/> voicemail
    // branch ships without disclosure.
    expect(src).toMatch(/from\s+["']@\/lib\/voice\/consent-states["']/);
    expect(src).toMatch(
      /busyVoicemailTwiml\s*=\s*injectConsentDisclosure\s*\(/,
    );
  });
});
