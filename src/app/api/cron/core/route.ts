/**
 * Cron bundler: one route that runs core crons sequentially. For new installs schedule every 2 min to /api/cron/core.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { log } from "@/lib/logger";

/**
 * Order: intake → execution → watchdog → self-healing → data hygiene → queues →
 * recoveries → engines → brain → billing → digests → stability anchors.
 * All cron routes MUST be in this list to be orchestrated by the core bundler.
 */
const CORE_STEPS = [
  // ── Intake & Execution ──
  "/api/cron/connector-inbox",
  "/api/cron/hosted-executor",
  "/api/cron/action-intent-watchdog",
  "/api/cron/self-healing",
  "/api/cron/approval-expiry",
  "/api/cron/data-retention",
  "/api/cron/appointment-reminders",
  "/api/cron/campaign-process",
  // ── Queue Processing ──
  "/api/cron/process-queue",
  "/api/cron/process-sync-queue",
  "/api/cron/process-follow-ups",
  "/api/cron/process-sequences",
  "/api/cron/scheduled-sends",
  "/api/cron/webhook-retries",
  // ── Recoveries ──
  "/api/cron/commitment-recovery",
  "/api/cron/opportunity-recovery",
  "/api/cron/payment-completion",
  "/api/cron/shared-transaction-recovery",
  // ── Engines ──
  "/api/cron/exposure-engine",
  "/api/cron/operability-anchor",
  "/api/cron/assumption-engine",
  "/api/cron/normalization-engine",
  "/api/cron/proof-capsules",
  "/api/cron/assurance-delivery",
  "/api/cron/settlement-export",
  // ── Brain & Intelligence ──
  "/api/cron/calendar-ended",
  "/api/cron/reconcile-reality",
  "/api/cron/process-reactivation",
  "/api/cron/autonomous-brain",
  "/api/cron/speed-to-lead",
  "/api/cron/no-show-detection",
  "/api/cron/learning",
  // ── Billing & Financial ──
  "/api/cron/billing",
  "/api/cron/phone-billing",
  "/api/cron/economic-value",
  "/api/cron/financial-exposure",
  "/api/cron/settlement-authorization",
  // ── Digests & Notifications ──
  "/api/cron/daily-digest",
  "/api/cron/weekly-digest",
  "/api/cron/daily-metrics",
  "/api/cron/handoff-notifications",
  "/api/cron/usage-alerts",
  "/api/cron/renewal-reminder",
  // ── Trial & Onboarding ──
  "/api/cron/trial-expiring",
  "/api/cron/trial-expiry",
  "/api/cron/trial-reminders",
  "/api/cron/wizard-abandonment",
  "/api/cron/day-3-nudge",
  "/api/cron/first-day-check",
  "/api/cron/installation-transition",
  // ── Stability Anchors & Trust ──
  "/api/cron/daily-trust",
  "/api/cron/weekly-trust",
  "/api/cron/daily-completion",
  "/api/cron/heartbeat",
  "/api/cron/integrity-audit",
  "/api/cron/progress-watchdog",
  // ── Voice & Recordings ──
  "/api/cron/outbound-dialer",
  "/api/cron/recording-cleanup",
  "/api/cron/voice-quality",
  "/api/cron/zoom-refresh",
  // ── Advanced Recovery & Pattern ──
  "/api/cron/deal-death",
  "/api/cron/no-reply",
  "/api/cron/pattern-aggregator",
  "/api/cron/usage-milestones",
  "/api/cron/usage-overage",
  // ── Time-Anchored ──
  "/api/cron/morning-state",
  "/api/cron/morning-certainty",
  "/api/cron/morning-absence",
  "/api/cron/after-hours-stability",
  "/api/cron/weekend-state",
  "/api/cron/week-completion-anchor",
  "/api/cron/month-start-anchor",
  "/api/cron/month-end-anchor",
  // ── Specialized ──
  "/api/cron/absence-confidence",
  "/api/cron/adoption-acceleration",
  "/api/cron/benchmark-aggregation",
  "/api/cron/booking-quiet",
  "/api/cron/closure",
  "/api/cron/coordination",
  "/api/cron/core-drift",
  "/api/cron/economic-activation",
  "/api/cron/economic-usage-backfill",
  "/api/cron/guarantee",
  "/api/cron/guarantees",
  "/api/cron/immediate-risk",
  "/api/cron/interruption-signal",
  "/api/cron/long-silence-confidence",
  "/api/cron/network-intelligence",
  "/api/cron/objectives",
  "/api/cron/operational-assumption",
  "/api/cron/operational-presence-daily",
  "/api/cron/operators",
  "/api/cron/orientation-absence",
  "/api/cron/payroll-safety",
  "/api/cron/post-decision-calm",
  "/api/cron/protocol-density",
  "/api/cron/ritual-cycles",
  "/api/cron/self-improvement",
  "/api/cron/silence-defines-completion",
  "/api/cron/temporal-stability",
];

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("core", async () => {
    const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      // Error (details omitted to protect PII): cron/core] Cannot determine base URL — set NEXT_PUBLIC_APP_URL");
      return { run: 0, ran: 0, steps: CORE_STEPS.length, error: "no_base_url" };
    }
    const token = process.env.CRON_SECRET ?? "";
    const ran: string[] = [];
    const failed: string[] = [];
    for (const path of CORE_STEPS) {
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          ran.push(path);
        } else {
          failed.push(`${path}:${res.status}`);
          log("warn", `[cron/core] Sub-cron ${path} returned ${res.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push(`${path}:ERR`);
        log("error", "cron.core.sub-cron-failed", { path, error: msg });
      }
    }
    if (failed.length > 0) {
      log("warn", `[cron/core] ${failed.length}/${CORE_STEPS.length} sub-crons failed: ${failed.slice(0, 10).join(", ")}`);
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("core").catch((e: unknown) => {
      log("warn", "[cron/core] heartbeat failed:", { detail: e instanceof Error ? e.message : String(e) });
    });
    return { run: ran.length, ran: ran.length, steps: CORE_STEPS.length, failed: failed.length > 0 ? failed.slice(0, 10) : undefined };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
