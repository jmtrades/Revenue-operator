/**
 * Structured telemetry event emitter
 * Uses PostHog if available, falls back to console in dev
 */

export type TelemetryEvent =
  | {
      name: "call.started";
      properties: { workspace_id: string; direction: "inbound" | "outbound"; agent_id?: string };
    }
  | {
      name: "call.ended";
      properties: { workspace_id: string; duration_ms: number; outcome: string };
    }
  | {
      name: "appointment.booked";
      properties: { workspace_id: string; source: string; lead_id?: string };
    }
  | {
      name: "lead.qualified";
      properties: { workspace_id: string; lead_id: string; score?: number };
    }
  | {
      name: "integration.synced";
      properties: { workspace_id: string; provider: string; records: number; success: boolean };
    }
  | {
      name: "voice.preview";
      properties: { workspace_id?: string; voice_id: string; method: "server" | "deepgram" | "browser" };
    }
  | {
      name: "campaign.started";
      properties: { workspace_id: string; campaign_id: string; contacts: number };
    }
  | {
      name: "error.api";
      properties: { endpoint: string; status: number; message?: string };
    }
  | {
      name: "onboarding.step_completed";
      properties: { workspace_id?: string; step: string; duration_ms?: number };
    }
  | {
      name: "billing.upgraded";
      properties: { workspace_id: string; from_tier: string; to_tier: string };
    };

/**
 * Track a telemetry event via PostHog (server-side)
 * Falls back to console.debug in development if PostHog is not configured
 */
export function trackEvent(event: TelemetryEvent): void {
  try {
    // Only run on server side
    if (typeof window !== "undefined") {
      return;
    }

    // Try PostHog server client first
    try {
      const { trackServer } = require("@/lib/analytics/posthog-server");
      // Extract workspace_id from properties if available
      const props = event.properties as Record<string, unknown>;
      const distinctId = (props.workspace_id as string | undefined) || "anonymous";
      trackServer(distinctId, event.name, event.properties);
      return;
    } catch {
      // PostHog not available or not configured
    }

    // Fallback to console in development
    if (process.env.NODE_ENV === "development") {
      // Debug logging omitted to protect PII
    }
  } catch {
    // Silently fail - don't break the app over telemetry
  }
}

/**
 * Track a telemetry event from the client side
 * Uses PostHog JS client when available
 */
export function trackEventClient(event: TelemetryEvent): void {
  try {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    // Try PostHog client
    try {
      const { track } = require("@/lib/analytics/posthog");
      track(event.name, event.properties);
      return;
    } catch {
      // PostHog not available or not configured
    }

    // Fallback to console in development
    if (process.env.NODE_ENV === "development") {
      // Debug logging omitted to protect PII
    }
  } catch {
    // Silently fail - don't break the app over telemetry
  }
}
