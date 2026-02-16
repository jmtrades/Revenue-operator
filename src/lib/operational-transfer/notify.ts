/**
 * Operational transfer notifications: handoff and booking ownership.
 * Responsibility-transfer framing: "This now requires your judgment" / "Time reserved. Decision owner: you."
 * Sends to workspace owner + optional team_handoff_emails (handoffs and booking only — no activity logs).
 */

import { getDb } from "@/lib/db/queries";
import { emitOutboundEvent } from "@/lib/outbound-events";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenue-operator.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.revenue-operator.com";

async function getOwnerAndTeamEmails(workspaceId: string): Promise<{ owner: string | null; team: string[] }> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  let owner: string | null = null;
  if (ownerId) {
    const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
    owner = (user as { email?: string } | null)?.email ?? null;
  }
  const { data: settings } = await db.from("settings").select("team_handoff_emails").eq("workspace_id", workspaceId).single();
  const raw = (settings as { team_handoff_emails?: unknown } | null)?.team_handoff_emails;
  const team = Array.isArray(raw) ? raw.filter((e): e is string => typeof e === "string" && e.includes("@")) : [];
  return { owner, team };
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

function decisionNeededLabel(reason: string): string {
  const labels: Record<string, string> = {
    high_deal_value: "High-value decision",
    vip_lead: "VIP lead",
    anger_detected: "Sensitive response needed",
    negotiation_attempt: "Negotiation",
    policy_sensitive: "Policy-sensitive",
    autonomy_assist_approval_required: "Approval needed",
    emotional_complexity: "Judgment needed",
    guarantee_stagnation: "Progress stalled — needs human follow-through",
    delivery_failed: "Delivery failed — needs human follow-up",
  };
  return labels[reason] ?? reason.replace(/_/g, " ");
}

/** Human handoff: responsibility transfer. Who, when, decision needed. No chat preview. */
export async function notifyHandoff(
  workspaceId: string,
  leadId: string,
  escalationId: string,
  params: { who?: string; when?: string; decisionNeeded: string }
): Promise<void> {
  const { isHandoffAcknowledged } = await import("@/lib/delivery-assurance/handoff-ack");
  if (await isHandoffAcknowledged(escalationId)) return;

  const { maybeSendEscalationContrast, maybeSendRemovalSensitivity } = await import("@/lib/awareness-timing/relief-events");
  if (await maybeSendEscalationContrast(workspaceId)) return;
  await maybeSendRemovalSensitivity(workspaceId).catch(() => {});

  const { maybeSendOrientationPending } = await import("@/lib/orientation/removal-shock");
  await maybeSendOrientationPending(workspaceId).catch(() => {});

  const db = getDb();
  let itemName = params.who;
  if (itemName == null) {
    const { data: lead } = await db.from("leads").select("name, email").eq("id", leadId).single();
    itemName = (lead as { name?: string; email?: string } | null)?.name ?? (lead as { email?: string } | null)?.email ?? "Unnamed";
  }
  const fieldLabel = decisionNeededLabel(params.decisionNeeded) || "Outside authority.";
  const { owner, team } = await getOwnerAndTeamEmails(workspaceId);

  const { count: resolvedHandoffCount } = await db
    .from("escalation_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const hasResponsibilityMemory = (resolvedHandoffCount ?? 0) >= 25;

  const payload = {
    message: "Outside authority.",
    who: itemName,
    when: params.when ?? new Date().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }),
    decision_needed: fieldLabel,
    lead_id: leadId,
    escalation_id: escalationId,
    ...(hasResponsibilityMemory && { as_usual: "As usual, flow continues." }),
  };

  // Outbound webhook (handoff event type — we need to support it in outbound-events)
  try {
    await emitHandoffEvent(workspaceId, payload, leadId);
  } catch {
    // non-blocking
  }

  let beyondScopeLine = "";
  try {
    const { isEngineAllowedForWorkspace } = await import("@/lib/operational-engines");
    const allowed = await isEngineAllowedForWorkspace(workspaceId, "commitment_reliability");
    if (!allowed) beyondScopeLine = "\nBeyond scope.\nAn entry exists for record.\nUnrecorded outcomes create exposure.\n";
  } catch {
    // default: within scope
  }

  const subject = "Outside authority.";
  const text = `Outside authority.

Item: ${itemName}
Field: ${fieldLabel}
${beyondScopeLine}
Open: ${APP_URL}/dashboard/leads/${leadId}

Entry restores reliance.

Entry is the operational boundary.`;
  const recipients = [...(owner ? [owner] : []), ...team].filter((e, i, a) => a.indexOf(e) === i);
  for (const to of recipients) {
    await sendEmail(to, subject, text).catch(() => {});
  }

  await db.from("escalation_logs").update({ notified_at: new Date().toISOString() }).eq("id", escalationId);

  const { recordOrientationStatement } = await import("@/lib/orientation/records");
  recordOrientationStatement(workspaceId, "Responsibility transferred to the provider.").catch(() => {});

  const { logPresenceSent } = await import("@/lib/operational-presence");
  await logPresenceSent(workspaceId, "decision_required");
}

/** Emit handoff event to webhook (same pipeline as other outbound events). */
async function emitHandoffEvent(
  workspaceId: string,
  payload: Record<string, unknown>,
  entityId: string
): Promise<void> {
  const db = getDb();
  const { data: config } = await db
    .from("webhook_configs")
    .select("endpoint_url, enabled, max_attempts")
    .eq("workspace_id", workspaceId)
    .single();
  if (!config || (config as { enabled?: boolean }).enabled === false) return;
  const cfg = config as { max_attempts?: number };
  const maxAttempts = cfg.max_attempts ?? 3;
  const { data: row } = await db.from("webhook_configs").select("event_handoff_occurred").eq("workspace_id", workspaceId).single();
  const enabled = (row as { event_handoff_occurred?: boolean } | null)?.event_handoff_occurred !== false;
  if (!enabled) return;
  await db.from("outbound_events_log").insert({
    workspace_id: workspaceId,
    event_type: "handoff",
    entity_id: entityId,
    payload,
    status: "pending",
    attempt_count: 0,
    max_attempts: maxAttempts,
  });
  const { processWebhookDeliveries } = await import("@/lib/outbound-events");
  processWebhookDeliveries().catch(() => {});
}

/** Booking confirmed: time reserved, decision owner is you. */
export async function notifyBookingOwnership(
  workspaceId: string,
  leadId: string,
  params: { leadName?: string; slotAt?: string }
): Promise<void> {
  const { owner, team } = await getOwnerAndTeamEmails(workspaceId);
  const message = "Time reserved. Decision owner: you.";
  const payload: Record<string, unknown> = {
    message,
    lead_id: leadId,
    lead_name: params.leadName ?? null,
    slot_at: params.slotAt ?? null,
  };
  try {
    await emitOutboundEvent(workspaceId, "call_booked", payload, leadId);
  } catch {
    // non-blocking
  }
  const subject = "Time reserved — decision owner: you";
  const detail = [params.leadName && `Lead: ${params.leadName}`, params.slotAt && `Slot: ${params.slotAt}`].filter(Boolean).join("\n");
  const text = `${message}\n\n${detail || "Open Work for details."}`;
  const recipients = [...(owner ? [owner] : []), ...team].filter((e, i, a) => a.indexOf(e) === i);
  for (const to of recipients) {
    await sendEmail(to, subject, text).catch(() => {});
  }
}

/** Operational scheduling: booking within next 2 hours — owner only, one line. No time, link, or lead name. */
export async function notifyBookingShortly(workspaceId: string): Promise<void> {
  const { owner } = await getOwnerAndTeamEmails(workspaceId);
  if (!owner) return;
  const text = "You'll need this shortly.";
  const sent = await sendEmail(owner, text, text).catch(() => false);
  if (sent) {
    const db = getDb();
    const { data: settings } = await db.from("settings").select("business_hours").eq("workspace_id", workspaceId).single();
    const tz = (settings as { business_hours?: { timezone?: string } } | null)?.business_hours?.timezone ?? "UTC";
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const parts = formatter.formatToParts(new Date());
    const localDate = `${parts.find((p) => p.type === "year")?.value ?? ""}-${parts.find((p) => p.type === "month")?.value ?? ""}-${parts.find((p) => p.type === "day")?.value ?? ""}`;
    try {
      await db.from("booking_shortly_sent").insert({
        workspace_id: workspaceId,
        sent_local_date: localDate,
        sent_at: new Date().toISOString(),
      });
    } catch {
      // non-blocking
    }
  }
}
