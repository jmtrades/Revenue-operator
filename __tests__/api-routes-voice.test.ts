/**
 * Structural tests for voice API routes.
 * Validates exports, security, compliance, and architectural patterns.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const VOICE_DIR = path.join(ROOT, "src", "app", "api", "voice");

function readRoute(subdir: string): string {
  const filePath = path.join(VOICE_DIR, subdir, "route.ts");
  expect(existsSync(filePath), `voice/${subdir}/route.ts should exist`).toBe(true);
  return readFileSync(filePath, "utf-8");
}

const VOICE_ROUTES = [
  "ab-tests",
  "billing",
  "check-business-hours",
  "clones",
  "config",
  "connect",
  "consents",
  "conversation-state",
  "events",
  "preprocess-tts",
  "quality",
  "quality-alerts",
  "readiness",
  "resolve",
  "route-call",
  "search-knowledge",
  "usage",
  "voices",
  "webhook",
];

describe("Voice routes: existence and handler exports", () => {
  for (const route of VOICE_ROUTES) {
    it(`voice/${route}/route.ts exists`, () => {
      const filePath = path.join(VOICE_DIR, route, "route.ts");
      expect(existsSync(filePath)).toBe(true);
    });
  }

  it("config route exports GET handler", () => {
    const src = readRoute("config");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("connect route exports POST handler", () => {
    const src = readRoute("connect");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("consents route exports both GET and POST handlers", () => {
    const src = readRoute("consents");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("events route exports POST handler", () => {
    const src = readRoute("events");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("quality route exports GET handler", () => {
    const src = readRoute("quality");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("readiness route exports GET handler", () => {
    const src = readRoute("readiness");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("resolve route exports GET handler", () => {
    const src = readRoute("resolve");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("route-call exports POST handler", () => {
    const src = readRoute("route-call");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("webhook route exports POST handler", () => {
    const src = readRoute("webhook");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("search-knowledge route exports POST handler", () => {
    const src = readRoute("search-knowledge");
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("ab-tests route exports GET handler", () => {
    const src = readRoute("ab-tests");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("billing route exports GET handler", () => {
    const src = readRoute("billing");
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe("Voice routes: no direct OpenAI API calls", () => {
  for (const route of VOICE_ROUTES) {
    it(`voice/${route} does not import openai SDK directly`, () => {
      const filePath = path.join(VOICE_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      // Routes should not import openai directly; voice AI goes through voice server / lib abstractions
      expect(src).not.toMatch(/import.*from\s+["']openai["']/);
      expect(src).not.toMatch(/new\s+OpenAI\s*\(/);
    });
  }

  for (const route of VOICE_ROUTES) {
    it(`voice/${route} does not contain hardcoded OpenAI API keys`, () => {
      const filePath = path.join(VOICE_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      expect(src).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    });
  }
});

describe("Voice routes: compliance checks present", () => {
  it("consents route validates consent_type against allowed list", () => {
    const src = readRoute("consents");
    expect(src).toContain("validConsentTypes");
    expect(src).toContain("recording");
    expect(src).toContain("ai_voice");
    expect(src).toContain("voice_clone");
  });

  it("consents route enforces daily rate limit on voice_clone consents", () => {
    const src = readRoute("consents");
    expect(src).toContain("clone_rate_limited");
    expect(src).toContain("voice_clone");
  });

  it("consents route requires phone and consent_type", () => {
    const src = readRoute("consents");
    expect(src).toContain("phone and consent_type are required");
  });

  it("connect route verifies Twilio signature in production", () => {
    const src = readRoute("connect");
    expect(src).toContain("verifyTwilioSignature");
    expect(src).toContain("TWILIO_AUTH_TOKEN");
    expect(src).toContain("x-twilio-signature");
  });

  it("route-call verifies Twilio signature", () => {
    const src = readRoute("route-call");
    expect(src).toContain("verifyTwilioSignature");
    expect(src).toContain("TWILIO_AUTH_TOKEN");
  });

  it("events route verifies voice webhook signature", () => {
    const src = readRoute("events");
    expect(src).toContain("verifyWebhookSignature");
    expect(src).toContain("VOICE_WEBHOOK_SECRET");
    expect(src).toContain("x-voice-webhook-signature");
  });

  it("webhook route verifies voice webhook signature", () => {
    const src = readRoute("webhook");
    expect(src).toContain("verifyWebhookSignature");
    expect(src).toContain("VOICE_WEBHOOK_SECRET");
  });

  it("conversation-state route verifies webhook secret", () => {
    const src = readRoute("conversation-state");
    expect(src).toContain("verifyWebhookSecret");
    expect(src).toContain("VOICE_WEBHOOK_SECRET");
  });

  it("preprocess-tts route verifies webhook secret", () => {
    const src = readRoute("preprocess-tts");
    expect(src).toContain("verifyWebhookSecret");
    expect(src).toContain("VOICE_WEBHOOK_SECRET");
  });
});

describe("Voice routes: auth / workspace access on user-facing endpoints", () => {
  it("config route uses requireWorkspaceAccess", () => {
    const src = readRoute("config");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("consents route uses requireWorkspaceAccess", () => {
    const src = readRoute("consents");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("quality route uses requireWorkspaceAccess", () => {
    const src = readRoute("quality");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("readiness route uses requireWorkspaceAccess", () => {
    const src = readRoute("readiness");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("resolve route uses requireWorkspaceAccess", () => {
    const src = readRoute("resolve");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("billing route uses requireWorkspaceAccess", () => {
    const src = readRoute("billing");
    expect(src).toContain("requireWorkspaceAccess");
  });

  it("ab-tests route uses requireWorkspaceAccess", () => {
    const src = readRoute("ab-tests");
    expect(src).toContain("requireWorkspaceAccess");
  });
});

describe("Voice routes: signature verification uses timing-safe comparison", () => {
  it("events route uses timingSafeEqual for signature comparison", () => {
    const src = readRoute("events");
    expect(src).toContain("timingSafeEqual");
  });

  it("route-call uses timingSafeEqual for Twilio signature", () => {
    const src = readRoute("route-call");
    expect(src).toContain("timingSafeEqual");
  });

  it("webhook route uses timingSafeEqual (if implemented inline)", () => {
    const src = readRoute("webhook");
    expect(src).toContain("timingSafeEqual");
  });

  it("connect route uses HMAC-based verification", () => {
    const src = readRoute("connect");
    expect(src).toContain("createHmac");
  });
});

describe("Voice routes: structured error responses", () => {
  it("config route returns JSON errors with status codes", () => {
    const src = readRoute("config");
    expect(src).toMatch(/\{\s*error:/);
    expect(src).toContain("status: 400");
  });

  it("consents route returns structured errors", () => {
    const src = readRoute("consents");
    expect(src).toMatch(/\{\s*error:/);
    expect(src).toContain("status: 400");
    expect(src).toContain("status: 500");
  });

  it("readiness route returns structured error on missing workspace", () => {
    const src = readRoute("readiness");
    expect(src).toContain("error:");
    expect(src).toContain("status: 401");
  });

  it("events route returns Unauthorized on invalid signature", () => {
    const src = readRoute("events");
    expect(src).toContain("Unauthorized");
    expect(src).toContain("status: 401");
  });
});

describe("Voice routes: force-dynamic export", () => {
  for (const route of VOICE_ROUTES) {
    it(`voice/${route} exports dynamic = "force-dynamic"`, () => {
      const filePath = path.join(VOICE_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      expect(src).toContain('"force-dynamic"');
    });
  }
});

describe("Voice routes: no hardcoded secrets", () => {
  for (const route of VOICE_ROUTES) {
    it(`voice/${route} does not contain hardcoded API keys or tokens`, () => {
      const filePath = path.join(VOICE_DIR, route, "route.ts");
      if (!existsSync(filePath)) return;
      const src = readFileSync(filePath, "utf-8");
      // No hardcoded Twilio or Deepgram keys
      expect(src).not.toMatch(/AC[a-f0-9]{32}/); // Twilio Account SID pattern
      expect(src).not.toMatch(/sk-[a-zA-Z0-9]{20,}/); // OpenAI key pattern
    });
  }
});
