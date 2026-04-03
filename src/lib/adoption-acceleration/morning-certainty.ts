/**
 * Daily certainty message at 08:00 workspace local. No marketing. One sentence.
 */

import { getDb } from "@/lib/db/queries";
import { getCommitmentsRequiringAuthority } from "@/lib/commitment-recovery";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";
import { getPaymentObligationsRequiringAuthority } from "@/lib/payment-completion";
import { getSharedTransactionsRequiringAuthority } from "@/lib/shared-transaction-assurance";
import { getInstallationState } from "./installation-state";

export async function sendDailyCertaintyStatus(workspaceId: string): Promise<{ sent: boolean; message: string }> {
  const state = await getInstallationState(workspaceId);
  if (!state || state.phase !== "active") return { sent: false, message: "" };

  const [commitments, opportunities, payments, sharedTx] = await Promise.all([
    getCommitmentsRequiringAuthority(workspaceId),
    getStalledOpportunitiesRequiringAuthority(workspaceId),
    getPaymentObligationsRequiringAuthority(workspaceId),
    getSharedTransactionsRequiringAuthority(workspaceId),
  ]);
  const total =
    commitments.length + opportunities.length + payments.length + sharedTx.length;
  const message =
    total === 0
      ? "Nothing requires attention."
      : total === 1
        ? "1 item requires a decision."
        : `${total} items require a decision.`;

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return { sent: false, message };
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return { sent: false, message };

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>",
        to: email,
        subject: "Daily status",
        text: message,
      signal: AbortSignal.timeout(10_000),
      }),
    });
  }
  return { sent: true, message };
}

export async function getWorkspacesForMorningCertainty(): Promise<string[]> {
  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active")
    .is("paused_at", null);
  const ids = (workspaces ?? []).map((r: { id: string }) => r.id);
  const out: string[] = [];
  for (const id of ids) {
    const state = await getInstallationState(id);
    if (state?.phase === "active") out.push(id);
  }
  return out;
}

function getWorkspaceLocal(timezone: string): { date: string; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { date, hour, minute };
}

/** 08:00 local, 15-min window. */
function is0800Local(timezone: string): boolean {
  const loc = getWorkspaceLocal(timezone);
  return loc.hour === 8 && loc.minute >= 0 && loc.minute < 15;
}

/** Cron: for workspaces in 08:00 local window, send daily certainty once per local day. */
export async function runMorningCertaintyCron(): Promise<
  Array<{ workspaceId: string; sent: boolean; error?: string }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean; error?: string }> = [];
  const activeIds = await getWorkspacesForMorningCertainty();
  if (!activeIds.length) return results;

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours")
    .in("workspace_id", activeIds);
  const byWorkspace = new Map<string, string>();
  for (const row of (settingsRows ?? []) as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    byWorkspace.set(row.workspace_id, row.business_hours?.timezone ?? "UTC");
  }

  for (const workspaceId of activeIds) {
    const tz = byWorkspace.get(workspaceId) ?? "UTC";
    try {
      if (!is0800Local(tz)) continue;
      const { date: localDate } = getWorkspaceLocal(tz);
      const { data: already } = await db
        .from("morning_certainty_sent")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("sent_local_date", localDate)
        .limit(1);
      if (already?.length) continue;

      const { sent } = await sendDailyCertaintyStatus(workspaceId);
      if (sent) {
        await db.from("morning_certainty_sent").insert({
          workspace_id: workspaceId,
          sent_local_date: localDate,
          sent_at: new Date().toISOString(),
        });
      }
      results.push({ workspaceId, sent });
    } catch (e) {
      results.push({
        workspaceId,
        sent: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
