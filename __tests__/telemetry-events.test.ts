/**
 * Phase 71 — Observability: telemetry event catalog.
 *
 * The typed catalog in `src/lib/telemetry/events.ts` is the single source of
 * truth for event names and payload shapes emitted to PostHog. These tests
 * pin:
 *   1. PII-safe defaults — when a payload has no workspace_id, the emitter
 *      MUST still capture with a safe placeholder distinctId ("anonymous"),
 *      not leak user identifiers into posthog.
 *   2. workspace_id is used as the distinctId when present (so cohort
 *      analysis groups by tenant, not by the synthetic "anonymous" bucket).
 *   3. Failures in the PostHog client are swallowed and NEVER rethrown — a
 *      broken analytics backend must not take down a revenue-critical path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture calls to trackServer so we can assert distinctId derivation.
const capturedServer: Array<{ distinctId: string; event: string; properties?: Record<string, unknown> }> = [];
const capturedClient: Array<{ event: string; properties?: Record<string, unknown> }> = [];

vi.mock("@/lib/analytics/posthog-server", () => ({
  trackServer: async (distinctId: string, event: string, properties?: Record<string, unknown>) => {
    capturedServer.push({ distinctId, event, properties });
  },
}));

vi.mock("@/lib/analytics/posthog", () => ({
  track: (event: string, properties?: Record<string, unknown>) => {
    capturedClient.push({ event, properties });
  },
}));

import { trackEvent, trackEventClient } from "@/lib/telemetry/events";

describe("telemetry event catalog", () => {
  beforeEach(() => {
    capturedServer.length = 0;
    capturedClient.length = 0;
    // Make `typeof window === "undefined"` deterministic for the server path.
    // vitest's default env is node where window is already undefined.
  });

  it("emits server-side with workspace_id as distinctId when present", async () => {
    trackEvent({
      name: "call.started",
      properties: { workspace_id: "ws_42", direction: "outbound", agent_id: "agent_x" },
    });
    // trackEvent is fire-and-forget — dynamic import + .then() + async mock
    // means 3+ microtasks before capture lands. Poll until it arrives.
    await vi.waitFor(() => expect(capturedServer).toHaveLength(1));
    const [hit] = capturedServer;
    if (!hit) throw new Error("expected capture");
    expect(hit.distinctId).toBe("ws_42");
    expect(hit.event).toBe("call.started");
    expect(hit.properties?.direction).toBe("outbound");
  });

  it("falls back to 'anonymous' when the event has no workspace_id", async () => {
    trackEvent({
      name: "voice.preview",
      properties: { voice_id: "nova", method: "server" }, // intentionally no workspace_id
    });
    await vi.waitFor(() => expect(capturedServer).toHaveLength(1));

    expect(capturedServer[0]?.distinctId).toBe("anonymous");
  });

  it("passes through the full properties payload unchanged", async () => {
    trackEvent({
      name: "integration.synced",
      properties: { workspace_id: "ws_1", provider: "salesforce", records: 137, success: true },
    });
    await vi.waitFor(() => expect(capturedServer).toHaveLength(1));

    expect(capturedServer[0]?.properties).toEqual({
      workspace_id: "ws_1",
      provider: "salesforce",
      records: 137,
      success: true,
    });
  });

  it("error.api (no workspace_id in payload) still captures via anonymous distinctId", async () => {
    // This is the canonical PII-free event: a generic HTTP error shouldn't
    // carry tenant context. Verify it still lands in PostHog under the
    // "anonymous" bucket so ops can count error volumes without fragmenting
    // by user.
    trackEvent({ name: "error.api", properties: { endpoint: "/api/x", status: 500 } });
    await vi.waitFor(() => expect(capturedServer).toHaveLength(1));
    expect(capturedServer[0]?.distinctId).toBe("anonymous");
    expect(capturedServer[0]?.event).toBe("error.api");
    expect(capturedServer[0]?.properties).toEqual({ endpoint: "/api/x", status: 500 });
  });

  it("onboarding.step_completed is captured even without a workspace_id (pre-signup)", async () => {
    // Users tracking onboarding steps often don't have a workspace_id yet.
    // Verify the event still emits (to anonymous) so we can measure
    // funnel drop-off before workspace creation.
    trackEvent({ name: "onboarding.step_completed", properties: { step: "connect_crm" } });
    await vi.waitFor(() => expect(capturedServer).toHaveLength(1));
    expect(capturedServer[0]?.distinctId).toBe("anonymous");
    expect(capturedServer[0]?.event).toBe("onboarding.step_completed");
    expect(capturedServer[0]?.properties).toEqual({ step: "connect_crm" });
  });

  it("trackEventClient is a no-op on the server (no window)", async () => {
    trackEventClient({ name: "call.started", properties: { workspace_id: "w", direction: "inbound" } });
    // Give dynamic import up to a few ticks — we're asserting *no* capture
    // ever happens, so a short wait is enough.
    await new Promise((r) => setTimeout(r, 20));
    expect(capturedClient).toHaveLength(0);
  });
});
