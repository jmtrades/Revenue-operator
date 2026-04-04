/**
 * Cron: settlement authorization. Every 6 hours.
 * For workspaces economically active with settlement inactive/pending and no unexpired intent in 7 days:
 * issue intent, send one message via conversation or email. No sales copy.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { ensureSettlementAccount, issueSettlementIntent, buildPublicSettlementLink } from "@/lib/settlement";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";
import { isSettlementReady } from "@/lib/operational-perception/settlement-readiness";
import { getSettlementState } from "@/lib/settlement";
import { getSettlementContext } from "@/lib/operational-perception/settlement-context";

const APP_URL = process.env.APP_URL ?? "";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function sendSettlementEmail(workspaceId: string): Promise<boolean> {
  return sendSettlementOwnerMessage(workspaceId, "Administrative activation available.");
}

async function sendSettlementOwnerMessage(workspaceId: string, bodyText: string): Promise<boolean> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return false;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.recall-touch.com";
  const unsubscribeUrl = `${appUrl}/app/settings/notifications`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>",
      to: email,
      subject: "Settlement",
      text: bodyText,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  try {
  const db = getDb();
  const now = new Date();
  const since = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString();

  const { data: activeRows } = await db.from("economic_activation").select("workspace_id");
  const economicallyActiveIds = [...new Set((activeRows ?? []).map((r: { workspace_id: string }) => r.workspace_id))];
  for (const workspaceId of economicallyActiveIds) {
    await ensureSettlementAccount(workspaceId);
  }
  const { data: accounts } = await db
    .from("settlement_accounts")
    .select("workspace_id")
    .in("workspace_id", economicallyActiveIds)
    .in("settlement_state", ["inactive", "pending_authorization"]);
  const workspaceIds = (accounts ?? []).map((a: { workspace_id: string }) => a.workspace_id);

  const { data: recentIntents } = await db
    .from("settlement_intents")
    .select("workspace_id")
    .gte("created_at", since)
    .gt("expires_at", now.toISOString())
    .in("state", ["issued", "opened"]);
  const hasUnexpiredIntent = new Set(
    (recentIntents ?? []).map((r: { workspace_id: string }) => r.workspace_id)
  );

  const toProcess = workspaceIds.filter((wid) => !hasUnexpiredIntent.has(wid));
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const { data: sendsRows } = await db
    .from("settlement_authorization_sends")
    .select("workspace_id, last_sent_at")
    .in("workspace_id", toProcess);
  const lastSentByWorkspace = new Map(
    (sendsRows ?? []).map((r: { workspace_id: string; last_sent_at: string }) => [r.workspace_id, r.last_sent_at])
  );
  let issued = 0;
  let sent = 0;
  for (const workspaceId of toProcess) {
    const ctx = await getSettlementContext(workspaceId);
    if (!ctx.administrative_activation_available) continue;
    const lastSent = lastSentByWorkspace.get(workspaceId);
    if (lastSent && new Date(lastSent) > sevenDaysAgo) continue;
    const result = await issueSettlementIntent(workspaceId, 24 * 7);
    if ("skipped" in result && result.skipped) continue;
    const rawToken = "rawToken" in result ? result.rawToken : "";
    if (!rawToken) continue;
    issued++;
    const link = buildPublicSettlementLink(rawToken);
    const _fullLink = link.startsWith("http") ? link : `${APP_URL.replace(/\/$/, "")}/public/settlement?token=${encodeURIComponent(rawToken)}`;
    const messageText = "Administrative activation available.";

    const { data: leads } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(5);
    let didSend = false;
    for (const lead of leads ?? []) {
      const leadId = (lead as { id: string }).id;
      const { data: conv } = await db
        .from("conversations")
        .select("id, channel")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conv) {
        const c = conv as { id: string; channel: string };
        const dedupKey = `settlement-auth:${workspaceId}:${since.slice(0, 10)}`;
        const ch = c.channel || "sms";
        await enqueueSendMessage(workspaceId, leadId, c.id, ch, messageText, dedupKey, ch === "email" ? { email_subject: "Settlement" } : undefined);
        didSend = true;
        sent++;
        break;
      }
    }
    if (!didSend) {
      const ok = await sendSettlementEmail(workspaceId);
      if (ok) {
        didSend = true;
        sent++;
      }
    }
    if (didSend) {
      await db
        .from("settlement_authorization_sends")
        .upsert(
          { workspace_id: workspaceId, last_sent_at: now.toISOString() },
          { onConflict: "workspace_id" }
        );
    }
  }

  const { data: nudgesRows } = await db.from("settlement_nudges").select("workspace_id, last_unconfigured_sent_at").in("workspace_id", workspaceIds);
  const lastUnconfiguredByWorkspace = new Map(
    (nudgesRows ?? []).map((r: { workspace_id: string; last_unconfigured_sent_at: string | null }) => [r.workspace_id, r.last_unconfigured_sent_at])
  );
  const reliefSince = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS).toISOString();
  const threeDaysAgo = new Date(now.getTime() - THREE_DAYS_MS);
  let unconfiguredSent = 0;
  for (const workspaceId of workspaceIds) {
    const ready = await isSettlementReady(workspaceId);
    const state = await getSettlementState(workspaceId);
    if (!ready || state.active) continue;
    const { count } = await db
      .from("recent_relief_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", reliefSince);
    if ((count ?? 0) < 2) continue;
    const lastUnconfigured = lastUnconfiguredByWorkspace.get(workspaceId);
    if (lastUnconfigured && new Date(lastUnconfigured) > threeDaysAgo) continue;
    const messageText = "Settlement remains unconfigured.";
    let didSendUnconfigured = false;
    const { data: leads } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(5);
    for (const lead of leads ?? []) {
      const leadId = (lead as { id: string }).id;
      const { data: conv } = await db
        .from("conversations")
        .select("id, channel")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conv) {
        const c = conv as { id: string; channel: string };
        const ch = c.channel || "sms";
        await enqueueSendMessage(
          workspaceId,
          leadId,
          c.id,
          ch,
          messageText,
          `settlement-unconfigured:${workspaceId}:${now.toISOString().slice(0, 10)}`,
          ch === "email" ? { email_subject: "Settlement" } : undefined
        );
        didSendUnconfigured = true;
        break;
      }
    }
    if (!didSendUnconfigured) {
      const ok = await sendSettlementOwnerMessage(workspaceId, messageText);
      if (ok) didSendUnconfigured = true;
    }
    if (didSendUnconfigured) {
      await db
        .from("settlement_nudges")
        .upsert(
          { workspace_id: workspaceId, last_unconfigured_sent_at: now.toISOString().slice(0, 10) },
          { onConflict: "workspace_id" }
        );
      unconfiguredSent++;
    }
  }

  return NextResponse.json({ ok: true, intents_issued: issued, delivery_sent: sent, unconfigured_reminder_sent: unconfiguredSent });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Error (details omitted to protect PII): settlement-authorization] Cron failed:", errMsg);
    return NextResponse.json({ error: "Settlement authorization failed" }, { status: 500 });
  }
}
