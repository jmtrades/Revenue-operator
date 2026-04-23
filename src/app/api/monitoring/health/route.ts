/**
 * GET /api/monitoring/health
 * System health check endpoint (no auth required for monitoring/observability)
 * Returns status of critical system components and uptime
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: boolean;
    voice_server: boolean;
    telephony: boolean;
  };
  uptime_ms: number;
  version: string;
}

/**
 * Perform a simple database connectivity check
 */
async function checkDatabase(): Promise<boolean> {
  try {
    const db = getDb();
    const { error } = await db.from("workspaces").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Check voice server health endpoint with timeout
 */
async function checkVoiceServer(): Promise<boolean> {
  try {
    const voiceServerUrl = process.env.VOICE_SERVER_URL;
    if (!voiceServerUrl) {
      // Voice server not configured; not a failure
      return true;
    }

    const res = await fetch(`${voiceServerUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check telephony provider health (basic validation)
 * Verifies that at least one telephony provider is configured
 */
async function checkTelephony(): Promise<boolean> {
  try {
    // Validate that telephony is configured (Telnyx or Twilio)
    const telnyxKey = process.env.TELNYX_API_KEY?.trim();
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();

    if (!telnyxKey && !twilioAccountSid) {
      // No telephony provider configured
      return false;
    }

    // If Telnyx is configured, try a quick connectivity check
    if (telnyxKey) {
      try {
        const res = await fetch("https://api.telnyx.com/v2/balance", {
          headers: { Authorization: `Bearer ${telnyxKey}` },
          signal: AbortSignal.timeout(3000),
        });
        return res.ok;
      } catch {
        // Telnyx check failed, but Twilio might work
        return !!twilioAccountSid;
      }
    }

    // Twilio is configured but not tested (would require SDK)
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();

  // Run all checks in parallel
  const [database, voice_server, telephony] = await Promise.all([
    checkDatabase(),
    checkVoiceServer(),
    checkTelephony(),
  ]);

  const checks = {
    database,
    voice_server,
    telephony,
  };

  // Determine overall status
  const allHealthy = Object.values(checks).every(Boolean);
  const criticalHealthy = database && telephony; // database and telephony are critical

  let status: "healthy" | "degraded" | "unhealthy";
  if (allHealthy) {
    status = "healthy";
  } else if (criticalHealthy) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  const uptime_ms = Date.now() - startTime;
  const version = process.env.GIT_COMMIT_SHA?.slice(0, 7) || "dev";

  const response: HealthCheckResponse = {
    status,
    checks,
    uptime_ms,
    version,
  };

  // Return appropriate HTTP status
  const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 503 : 503;

  return NextResponse.json(response, { status: httpStatus });
}
