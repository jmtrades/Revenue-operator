/**
 * Cron health check: detect missed or failed heartbeats.
 * Monitors all cron jobs and alerts if any are stale.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/integrations/email";

interface CronJobConfig {
  name: string;
  expected_interval_minutes: number;
}

// Map of all cron jobs and their expected intervals (in minutes)
const CRON_JOBS: CronJobConfig[] = [
  // Every 2 minutes
  { name: "core", expected_interval_minutes: 2 },
  { name: "speed-to-lead", expected_interval_minutes: 2 },
  { name: "outbound-dialer", expected_interval_minutes: 2 },
  { name: "autonomous-brain", expected_interval_minutes: 2 },
  { name: "process-sync-queue", expected_interval_minutes: 2 },
  { name: "process-queue", expected_interval_minutes: 2 },
  { name: "action-intent-watchdog", expected_interval_minutes: 2 },
  { name: "hosted-executor", expected_interval_minutes: 2 },

  // Every 5 minutes
  { name: "heartbeat", expected_interval_minutes: 5 },
  { name: "voice-quality", expected_interval_minutes: 5 },
  { name: "process-sequences", expected_interval_minutes: 5 },
  { name: "process-email-queue", expected_interval_minutes: 5 },
  { name: "webhook-retries", expected_interval_minutes: 5 },
  { name: "self-healing", expected_interval_minutes: 5 },
  { name: "campaign-process", expected_interval_minutes: 5 },
  { name: "connector-inbox", expected_interval_minutes: 5 },
  { name: "commitment-recovery", expected_interval_minutes: 5 },
  { name: "reconcile-reality", expected_interval_minutes: 5 },
  { name: "process-reactivation", expected_interval_minutes: 5 },
  { name: "calendar-ended", expected_interval_minutes: 5 },
  { name: "payment-completion", expected_interval_minutes: 5 },

  // Every 15 minutes
  { name: "process-follow-ups", expected_interval_minutes: 15 },
  { name: "appointment-reminders", expected_interval_minutes: 15 },
  { name: "no-show-detection", expected_interval_minutes: 15 },
  { name: "approval-expiry", expected_interval_minutes: 15 },
  { name: "opportunity-recovery", expected_interval_minutes: 15 },

  // Hourly
  { name: "wizard-abandonment", expected_interval_minutes: 60 },

  // Every 4 hours
  { name: "intelligence-loop", expected_interval_minutes: 240 },

  // Every 6 hours
  { name: "detect-cold-leads", expected_interval_minutes: 360 },

  // Daily jobs (1440 minutes)
  { name: "daily-metrics", expected_interval_minutes: 1440 },
  { name: "benchmark-aggregation", expected_interval_minutes: 1440 },
  { name: "data-retention", expected_interval_minutes: 1440 },
  { name: "self-improvement", expected_interval_minutes: 1440 },
  { name: "recording-cleanup", expected_interval_minutes: 1440 },
  { name: "settlement-export", expected_interval_minutes: 1440 },
  { name: "trial-expiry", expected_interval_minutes: 1440 },
  { name: "usage-alerts", expected_interval_minutes: 1440 },
  { name: "usage-milestones", expected_interval_minutes: 1440 },
  { name: "daily-call-plan", expected_interval_minutes: 1440 },
  { name: "trial-reminders", expected_interval_minutes: 1440 },
  { name: "first-day-check", expected_interval_minutes: 1440 },
  { name: "day-3-nudge", expected_interval_minutes: 1440 },

  // Weekly jobs (10080 minutes)
  { name: "weekly-digest", expected_interval_minutes: 10080 },
  { name: "weekly-trust", expected_interval_minutes: 10080 },

  // Monthly jobs (43200 minutes)
  { name: "phone-billing", expected_interval_minutes: 43200 },
  // Phase 78/Task 6.4: "usage-overage" was removed from CRON_JOBS when the
  // duplicate cron route was retired. Billing is now handled via /api/billing/overage.
];

export interface StaleJob {
  name: string;
  expected_interval_minutes: number;
  last_ran_at: string | null;
  minutes_since_run: number;
  max_allowed_minutes: number;
}

/**
 * Check all cron heartbeats for staleness.
 * Returns jobs that haven't run within 2x their expected interval.
 */
export async function checkCronHealth(): Promise<StaleJob[]> {
  const db = getDb();
  const stale: StaleJob[] = [];

  // Fetch all heartbeats
  const { data: heartbeats } = await db.from("system_cron_heartbeats").select("job_name, last_ran_at");
  const heartbeatMap: Record<string, string | null> = {};
  for (const row of heartbeats ?? []) {
    const r = row as { job_name: string; last_ran_at: string | null };
    heartbeatMap[r.job_name] = r.last_ran_at;
  }

  const now = new Date();

  // Check each configured job
  for (const job of CRON_JOBS) {
    const lastRan = heartbeatMap[job.name];
    const maxAllowedMinutes = job.expected_interval_minutes * 2; // Allow 2x the interval

    if (!lastRan) {
      // Never run before
      stale.push({
        name: job.name,
        expected_interval_minutes: job.expected_interval_minutes,
        last_ran_at: null,
        minutes_since_run: Infinity,
        max_allowed_minutes: maxAllowedMinutes,
      });
      continue;
    }

    const lastRanTime = new Date(lastRan);
    const minutesSinceRun = (now.getTime() - lastRanTime.getTime()) / (1000 * 60);

    if (minutesSinceRun > maxAllowedMinutes) {
      stale.push({
        name: job.name,
        expected_interval_minutes: job.expected_interval_minutes,
        last_ran_at: lastRan,
        minutes_since_run: Math.round(minutesSinceRun * 10) / 10,
        max_allowed_minutes: maxAllowedMinutes,
      });
    }
  }

  return stale;
}

/**
 * Alert workspace owners about stale cron jobs.
 * Uses system workspace ID or logs if email not configured.
 */
export async function alertStaleJobs(staleJobs: StaleJob[]): Promise<void> {
  if (staleJobs.length === 0) return;

  const db = getDb();

  // Find workspace owners/admins
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name")
    .limit(1);

  if (!workspaces || workspaces.length === 0) {
    log("warn", "cron.health-check.no-workspace-found", {
      stale_jobs: staleJobs.length,
    });
    return;
  }

  const workspace = workspaces[0] as { id: string; name: string };

  // Get workspace owner/admin email
  const { data: members } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspace.id)
    .eq("role", "owner")
    .limit(1);

  if (!members || members.length === 0) {
    log("warn", "cron.health-check.no-owner-found", {
      workspace_id: workspace.id,
      stale_jobs: staleJobs.length,
    });
    return;
  }

  const member = members[0] as { user_id: string };

  // Get user email
  const { data: user } = await db
    .from("users")
    .select("email")
    .eq("id", member.user_id)
    .maybeSingle();

  if (!user || !(user as { email?: string }).email) {
    log("warn", "cron.health-check.no-owner-email-found", {
      workspace_id: workspace.id,
      user_id: member.user_id,
      stale_jobs: staleJobs.length,
    });
    return;
  }

  const ownerEmail = (user as { email: string }).email;

  // Build email body
  const jobsList = staleJobs
    .map(
      (job) =>
        `• ${job.name}: last ran ${job.last_ran_at ? `${job.minutes_since_run}m ago` : "never"} (expected every ${job.expected_interval_minutes}m)`
    )
    .join("\n");

  const subject = `[ALERT] ${staleJobs.length} cron job(s) are stale`;
  const bodyHtml = `
<h2>Cron Health Alert</h2>
<p>The following cron jobs in <strong>${workspace.name}</strong> have not run within their expected intervals:</p>
<pre>${jobsList}</pre>
<p>Each job is allowed to miss 2x its expected interval before alerting.</p>
<p>Please investigate the cron scheduler and fix any infrastructure issues.</p>
<p><small>Sent at ${new Date().toISOString()}</small></p>
  `.trim();

  const result = await sendEmail(workspace.id, ownerEmail, subject, bodyHtml);

  if (result.ok) {
    log("warn", "cron.health-check.alert-sent", {
      workspace_id: workspace.id,
      owner_email: ownerEmail,
      stale_jobs: staleJobs.length,
    });
  } else {
    log("error", "cron.health-check.alert-failed", {
      workspace_id: workspace.id,
      owner_email: ownerEmail,
      stale_jobs: staleJobs.length,
      error: result.error,
    });
  }
}
