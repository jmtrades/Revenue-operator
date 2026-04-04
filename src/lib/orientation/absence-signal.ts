/**
 * Absence signal: if no orientation record for 6 hours during business hours,
 * send one line. Only once per day. Prevents users checking other tools.
 */

import { getDb } from "@/lib/db/queries";
import {
  countOrientationRecordsInLastHours,
  getOrientationState,
  setOrientationAbsenceSentToday,
} from "./records";

const MESSAGE = "Nothing required resolution recently.";
const SIX_HOURS = 6;

function getWorkspaceLocalHour(timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "12";
  return parseInt(hourStr, 10);
}

function isBusinessHours(timezone: string): boolean {
  const hour = getWorkspaceLocalHour(timezone);
  return hour >= 8 && hour < 18;
}

async function getOwnerEmail(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return null;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  return (user as { email?: string } | null)?.email ?? null;
}

async function sendEmail(to: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: text, text }),
      signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

/** Run from cron: for workspaces in business hours with no orientation in 6h, send once per day. */
export async function runOrientationAbsenceSignal(): Promise<
  Array<{ workspaceId: string; sent: boolean }>
> {
  const db = getDb();
  const results: Array<{ workspaceId: string; sent: boolean }> = [];
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active");
  if (!workspaces?.length) return results;

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_hours")
    .in("workspace_id", (workspaces as { id: string }[]).map((w) => w.id));
  const tzByWorkspace = new Map<string, string>();
  for (const row of (settingsRows ?? []) as { workspace_id: string; business_hours?: { timezone?: string } }[]) {
    tzByWorkspace.set(row.workspace_id, row.business_hours?.timezone ?? "UTC");
  }

  for (const w of workspaces as { id: string }[]) {
    const workspaceId = w.id;
    const tz = tzByWorkspace.get(workspaceId) ?? "UTC";
    if (!isBusinessHours(tz)) continue;

    const count = await countOrientationRecordsInLastHours(workspaceId, SIX_HOURS);
    if (count > 0) continue;

    const state = await getOrientationState(workspaceId);
    const today = new Date().toISOString().slice(0, 10);
    if (state?.orientation_absence_sent_at === today) continue;

    const owner = await getOwnerEmail(workspaceId);
    if (!owner) continue;

    const sent = await sendEmail(owner, MESSAGE);
    if (sent) await setOrientationAbsenceSentToday(workspaceId);
    results.push({ workspaceId, sent });
  }
  return results;
}
