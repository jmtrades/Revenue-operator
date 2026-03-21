/**
 * Voice quality / health monitoring cron.
 *
 * Every 5 minutes:
 * - Call VOICE_SERVER_URL/health and measure latency
 * - Call VOICE_SERVER_URL/status to inspect active sessions + max concurrent
 * - Alert when:
 *   - voice server is unreachable
 *   - latency exceeds 500ms
 *   - active sessions exceed 80% of max_concurrent
 * - Log results to revenue_operator.voice_health_checks (best-effort)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { runSafeCron } from "@/lib/cron/run-safe";

const LATENCY_THRESHOLD_MS = 500;
const CONCURRENCY_THRESHOLD = 0.8; // 80%

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; body?: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    const body = await resp.json().catch(() => null);
    return { ok: resp.ok, status: resp.status, body };
  } catch (error) {
    return { ok: false, body: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const safe = await runSafeCron("voice-quality", async () => {
    const voiceUrl = (process.env.VOICE_SERVER_URL ?? "").trim();
    const checkedAt = new Date();

    // Best-effort insertion uses DB; even if the table isn't ready yet,
    // we should not fail the cron execution.
    const db = getDb();

    if (!voiceUrl) {
      return {
        run: 1,
        checked_at: checkedAt.toISOString(),
        voice_server_ok: false,
        latency_ms: null,
        active_conversations: null,
        max_concurrent: null,
        alert_reason: "VOICE_SERVER_URL not configured",
      };
    }

    const healthUrl = `${voiceUrl}/health`;
    const statusUrl = `${voiceUrl}/status`;

    let latencyMs: number | null = null;
    let voiceServerOk = false;
    let alertReason: string | null = null;

    // 1) /health with latency measurement
    const start = Date.now();
    const health = await fetchJsonWithTimeout(healthUrl, 2500);
    latencyMs = Date.now() - start;
    voiceServerOk = Boolean(health.ok);

    if (!voiceServerOk) {
      alertReason = "voice_server_unreachable";
    } else if (latencyMs != null && latencyMs > LATENCY_THRESHOLD_MS) {
      alertReason = `latency_exceeded_${latencyMs}ms`;
    }

    // 2) /status (only if health succeeded)
    let activeConversations: number | null = null;
    let maxConcurrent: number | null = null;
    if (voiceServerOk) {
      const status = await fetchJsonWithTimeout(statusUrl, 2500);
      if (status.ok && typeof status.body === "object" && status.body) {
        const b = status.body as Record<string, unknown>;
        const active = b.active_conversations;
        const max = b.max_concurrent;
        activeConversations = typeof active === "number" ? active : null;
        maxConcurrent = typeof max === "number" ? max : null;

        if (activeConversations != null && maxConcurrent != null && maxConcurrent > 0) {
          const ratio = activeConversations / maxConcurrent;
          if (ratio >= CONCURRENCY_THRESHOLD) {
            alertReason = `concurrency_threshold_exceeded_${Math.round(ratio * 100)}pct`;
          }
        }
      }
    }

    // 3) Log results (best-effort)
    try {
      await db.from("voice_health_checks").insert({
        voice_server_url: voiceUrl,
        ok: voiceServerOk,
        latency_ms: latencyMs,
        active_conversations: activeConversations,
        max_concurrent: maxConcurrent,
        alert_reason: alertReason,
        error_message: voiceServerOk ? null : alertReason,
      });
    } catch (error) {
      if (error instanceof Error) Sentry.captureException(error);
    }

    return {
      run: 1,
      checked_at: checkedAt.toISOString(),
      voice_server_ok: voiceServerOk,
      latency_ms: latencyMs,
      active_conversations: activeConversations,
      max_concurrent: maxConcurrent,
      alert_reason: alertReason ?? undefined,
    };
  });

  const details = safe.details as Record<string, unknown> | undefined;
  return NextResponse.json({
    ok: safe.ok,
    jobs_run: safe.jobs_run,
    failures: safe.failures,
    ...(details ?? {}),
  });
}

