/**
 * Absence Confidence: one operational continuity message when user has not opened dashboard for 72h
 * and system stayed healthy. Max once per 7 days. Same channel as handoff (email).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { deterministicIndex } from "@/lib/intelligence/deterministic-variant";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenue-operator.com>";

const ABSENCE_MESSAGES = [
  "Operating normally.",
  "Operating normally.",
  "Operating normally.",
];

const HOURS_ABSENCE = 72;
const DAYS_SINCE_LAST_SENT = 7;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  try {
  const db = getDb();
  const now = new Date();
  const seventyTwoHoursAgo = new Date(now.getTime() - HOURS_ABSENCE * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - DAYS_SINCE_LAST_SENT * 24 * 60 * 60 * 1000);

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, last_dashboard_open_at, absence_confidence_sent_at, created_at, status, pause_reason, billing_status, protection_renewal_at")
    .order("id", { ascending: true })
    .limit(500);

  const eligible: Array<{ id: string; owner_id: string }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as {
      id: string;
      owner_id: string;
      last_dashboard_open_at?: string | null;
      absence_confidence_sent_at?: string | null;
      created_at?: string;
      status?: string | null;
      pause_reason?: string | null;
      billing_status?: string | null;
      protection_renewal_at?: string | null;
    };

    if (row.status !== "active" && row.status != null) continue;
    if (row.pause_reason) continue;

    const lastOpen = row.last_dashboard_open_at ? new Date(row.last_dashboard_open_at) : null;
    const openCutoff = lastOpen ?? (row.created_at ? new Date(row.created_at) : null);
    if (!openCutoff) continue;
    if (openCutoff.getTime() > seventyTwoHoursAgo.getTime()) continue;

    if (row.billing_status === "trial_ended") continue;
    if (row.billing_status === "cancelled") continue;
    if (row.billing_status === "payment_failed") continue;
    if (row.billing_status === "trial" && row.protection_renewal_at && new Date(row.protection_renewal_at) < now) continue;

    if (row.absence_confidence_sent_at && new Date(row.absence_confidence_sent_at).getTime() > sevenDaysAgo.getTime()) continue;

    const { data: escalationRow } = await db
      .from("escalation_logs")
      .select("id")
      .eq("workspace_id", row.id)
      .gte("created_at", seventyTwoHoursAgo.toISOString())
      .limit(1)
      .maybeSingle();
    if (escalationRow) continue;

    eligible.push({ id: row.id, owner_id: row.owner_id });
  }

  const results: Array<{ workspaceId: string; email: string; sent: boolean }> = [];

  for (const { id: workspaceId, owner_id } of eligible) {
    const { data: user } = await db.from("users").select("email").eq("id", owner_id).maybeSingle();
    const email = (user as { email?: string } | null)?.email;
    if (!email) continue;

    const daySeed = now.toISOString().slice(0, 10);
    const msgIndex = deterministicIndex(`${workspaceId}:${daySeed}`, ABSENCE_MESSAGES.length);
    const message = ABSENCE_MESSAGES[msgIndex]!;

    try {
      if (RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: email,
            subject: message,
            text: message,
          }),
        });
        if (res.ok) {
          await db
            .from("workspaces")
            .update({ absence_confidence_sent_at: now.toISOString() })
            .eq("id", workspaceId);
          results.push({ workspaceId, email, sent: true });
        } else {
          results.push({ workspaceId, email, sent: false });
        }
      } else {
        await db
          .from("workspaces")
          .update({ absence_confidence_sent_at: now.toISOString() })
          .eq("id", workspaceId);
        results.push({ workspaceId, email, sent: true });
      }
    } catch (err) {
      // Error; skip workspace
      results.push({ workspaceId, email, sent: false });
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.sent).length, results });
  } catch (err) {
    console.error("[absence-confidence] Cron failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Absence confidence cron failed" }, { status: 500 });
  }
}
