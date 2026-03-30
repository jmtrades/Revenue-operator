/**
 * Once per workspace lifetime: when 14 consecutive healthy days occur,
 * send a single email. Subject: "Operating normally." Body: "Handling continues without interruption."
 * Never send again.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const CONSECUTIVE_DAYS_REQUIRED = 14;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  try {
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, owner_id, status, pause_reason, consecutive_healthy_days, last_health_check_date, operational_assumption_sent_at");

  const results: Array<{ workspaceId: string; sent: boolean }> = [];

  for (const ws of workspaces ?? []) {
    const row = ws as {
      id: string;
      owner_id: string;
      status?: string | null;
      pause_reason?: string | null;
      consecutive_healthy_days?: number | null;
      last_health_check_date?: string | null;
      operational_assumption_sent_at?: string | null;
    };

    if (row.operational_assumption_sent_at) continue;

    const isHealthy = row.status === "active" && !row.pause_reason;
    const lastDate = row.last_health_check_date ?? null;
    let consecutive = typeof row.consecutive_healthy_days === "number" ? row.consecutive_healthy_days : 0;

    if (!isHealthy) {
      await db
        .from("workspaces")
        .update({ consecutive_healthy_days: 0, last_health_check_date: todayStr })
        .eq("id", row.id);
      continue;
    }

    if (lastDate === yesterdayStr) {
      consecutive += 1;
    } else if (lastDate !== todayStr) {
      consecutive = 1;
    }

    await db
      .from("workspaces")
      .update({ consecutive_healthy_days: consecutive, last_health_check_date: todayStr })
      .eq("id", row.id);

    if (consecutive < CONSECUTIVE_DAYS_REQUIRED) continue;

    const { data: user } = await db.from("users").select("email").eq("id", row.owner_id).maybeSingle();
    const email = (user as { email?: string } | null)?.email;
    if (!email) {
      results.push({ workspaceId: row.id, sent: false });
      continue;
    }

    const subject = "Operating normally.";
    const body = "Handling continues without interruption.";

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
            subject,
            text: body,
          }),
        });
        if (res.ok) {
          await db
            .from("workspaces")
            .update({ operational_assumption_sent_at: now.toISOString() })
            .eq("id", row.id);
          results.push({ workspaceId: row.id, sent: true });
        } else {
          results.push({ workspaceId: row.id, sent: false });
        }
      } else {
        await db
          .from("workspaces")
          .update({ operational_assumption_sent_at: now.toISOString() })
          .eq("id", row.id);
        results.push({ workspaceId: row.id, sent: true });
      }
    } catch (err) {
      // Error; skip
      results.push({ workspaceId: row.id, sent: false });
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.sent).length, results });
  } catch (err) {
    console.error("[operational-assumption] Cron failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
