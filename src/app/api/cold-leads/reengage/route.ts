/**
 * POST /api/cold-leads/reengage — Trigger re-engagement for pending cold leads.
 * Accepts { lead_ids?: string[], reengagement_strategy?: string }.
 * For each lead, checks if workspace communication_mode and lead channel_preferences allow engagement,
 * then marks as in_progress, sends initial SMS if available, and enrolls in reactivation sequence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { sendSms } from "@/lib/telephony/telnyx-sms";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { lead_ids?: string[]; reengagement_strategy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lead_ids, reengagement_strategy } = body;
  const db = getDb();

  // Get workspace communication mode and from phone number
  const { data: workspace } = await db
    .from("workspaces")
    .select("communication_mode")
    .eq("id", session.workspaceId)
    .maybeSingle();

  const workspaceCommunicationMode = (workspace as { communication_mode?: string | null })?.communication_mode ?? "all";
  const fromPhoneNumber = process.env.TELNYX_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  // Get cold lead queue items to process
  let query = db
    .from("cold_lead_queue")
    .select(
      `
      id,
      lead_id,
      workspace_id,
      status,
      reason,
      priority,
      reengagement_strategy
      `
    )
    .eq("workspace_id", session.workspaceId)
    .eq("status", "pending");

  if (Array.isArray(lead_ids) && lead_ids.length > 0) {
    query = query.in("lead_id", lead_ids);
  }

  const { data: queueItems, error: queueErr } = await query;

  if (queueErr) {
    log("error", "[cold-leads/reengage] query failed:", { error: queueErr.message });
    return NextResponse.json({ error: "Failed to fetch cold leads" }, { status: 500 });
  }

  const itemsToProcess = (queueItems ?? []) as Array<{
    id: string;
    lead_id: string;
    workspace_id: string;
    status: string;
    reason?: string;
    priority?: string;
    reengagement_strategy?: string;
  }>;

  if (itemsToProcess.length === 0) {
    return NextResponse.json({ updated: [], skipped: [] });
  }

  // Fetch all associated leads with their channel preferences, phone numbers, and names
  const leadIds = itemsToProcess.map((item) => item.lead_id);
  const { data: leads, error: leadsErr } = await db
    .from("leads")
    .select("id, channel_preferences, phone, first_name")
    .in("id", leadIds);

  if (leadsErr) {
    log("error", "[cold-leads/reengage] leads query failed:", { error: leadsErr.message });
    return NextResponse.json({ error: "Failed to fetch lead preferences" }, { status: 500 });
  }

  const leadData = ((leads ?? []) as Array<{
    id: string;
    channel_preferences?: Record<string, unknown> | null;
    phone?: string | null;
    first_name?: string | null;
  }>).reduce(
    (acc, lead) => {
      acc[lead.id] = {
        channel_preferences: lead.channel_preferences ?? { call: true, sms: true, email: true },
        phone: lead.phone,
        first_name: lead.first_name,
      };
      return acc;
    },
    {} as Record<
      string,
      { channel_preferences: Record<string, unknown>; phone?: string | null; first_name?: string | null }
    >
  );

  // Find default reactivation sequence for the workspace (or use first available)
  const { data: sequences } = await db
    .from("sequences")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .eq("type", "reactivation")
    .limit(1);

  const defaultSequenceId = (sequences?.[0] as { id?: string } | undefined)?.id;

  const updated: Array<{ id: string; lead_id: string; status: string }> = [];
  const skipped: Array<{ id: string; lead_id: string; reason: string }> = [];

  // Process each queue item
  for (const item of itemsToProcess) {
    const lead = leadData[item.lead_id];
    const preferences = lead.channel_preferences as { call?: boolean; sms?: boolean; email?: boolean };

    // Check if workspace communication mode allows engagement
    const canEngage = canWorkspaceEngage(workspaceCommunicationMode, preferences);

    if (!canEngage) {
      skipped.push({
        id: item.id,
        lead_id: item.lead_id,
        reason: `Workspace communication mode '${workspaceCommunicationMode}' or lead preferences do not allow engagement`,
      });
      continue;
    }

    // SAFETY: Check opt-out before re-engaging cold lead
    try {
      const { isOptedOut } = await import("@/lib/lead-opt-out");
      if (await isOptedOut(session.workspaceId, `lead:${item.lead_id}`)) {
        skipped.push({ id: item.id, lead_id: item.lead_id, reason: "Lead has opted out" });
        continue;
      }
    } catch {
      // opt-out table may not exist
    }

    const now = new Date().toISOString();

    // Update status to in_progress
    const { error: updateErr } = await db
      .from("cold_lead_queue")
      .update({
        status: "in_progress",
        reengagement_strategy: reengagement_strategy ?? item.reengagement_strategy ?? null,
        updated_at: now,
      })
      .eq("id", item.id);

    if (updateErr) {
      skipped.push({
        id: item.id,
        lead_id: item.lead_id,
        reason: "Failed to update status",
      });
      continue;
    }

    // Log autonomous action for reengagement
    try {
      await db.from("autonomous_actions").insert({
        workspace_id: session.workspaceId,
        lead_id: item.lead_id,
        action_type: "reengagement",
        action_metadata: {
          trigger: "cold_lead_reengage",
          strategy: reengagement_strategy ?? item.reengagement_strategy,
        },
        status: "executed",
        executed_at: now,
      });
    } catch (err) {
      console.warn(
        `[cold-leads/reengage] Failed to log autonomous action for lead ${item.lead_id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }

    // Try to send initial SMS if lead has phone and accepts SMS
    if (lead.phone && preferences.sms && fromPhoneNumber) {
      try {
        const phoneNum = lead.phone.replace(/\D/g, "");
        const toAddr = `+${phoneNum.length === 10 ? "1" : ""}${phoneNum}`;
        const fromAddr = fromPhoneNumber.startsWith("+") ? fromPhoneNumber : `+${fromPhoneNumber.replace(/\D/g, "")}`;

        const messageText = generateReengagementMessage(
          lead.first_name ?? "there",
          reengagement_strategy ?? item.reengagement_strategy ?? "standard"
        );

        const smsResult = await sendSms({
          from: fromAddr,
          to: toAddr,
          text: messageText,
          messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
        });

        if (!("error" in smsResult)) {
          // SMS sent successfully - log message
          try {
            await db.from("messages").insert({
              workspace_id: session.workspaceId,
              lead_id: item.lead_id,
              direction: "outbound",
              channel: "sms",
              content: messageText,
              status: "sent",
              trigger: "cold_lead_reengage",
            });
          } catch {
            // ignore message store failure
          }
        } else {
          console.warn(
            `[cold-leads/reengage] SMS send failed for lead ${item.lead_id}:`,
            smsResult.error
          );
        }
      } catch (err) {
        console.warn(
          `[cold-leads/reengage] Exception sending SMS for lead ${item.lead_id}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // Try to enroll in reactivation sequence if one exists
    if (defaultSequenceId) {
      try {
        await db.from("sequence_enrollments").insert({
          workspace_id: session.workspaceId,
          sequence_id: defaultSequenceId,
          lead_id: item.lead_id,
          status: "active",
          enrolled_at: now,
          started_at: now,
        });
      } catch (err) {
        // Sequence enrollment may fail if already enrolled - log but don't block
        console.warn(
          `[cold-leads/reengage] Sequence enrollment failed for lead ${item.lead_id}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    updated.push({
      id: item.id,
      lead_id: item.lead_id,
      status: "in_progress",
    });
  }

  return NextResponse.json({
    updated,
    skipped,
    total_processed: itemsToProcess.length,
  });
}

/**
 * Generate a reengagement SMS message based on strategy.
 */
function generateReengagementMessage(name: string, strategy: string): string {
  const messages: Record<string, string> = {
    urgent: `Hi ${name}, we'd like to reconnect. We have something that might interest you. Reply STOP to opt out.`,
    value: `Hi ${name}, we're helping teams like yours achieve more. Would love to reconnect. Reply STOP to opt out.`,
    closure: `Hi ${name}, we wanted to check in one more time. Reach out if timing has changed. Reply STOP to opt out.`,
    standard: `Hi ${name}, we wanted to reconnect. Let us know if you'd like to chat. Reply STOP to opt out.`,
  };

  return messages[strategy] ?? messages.standard;
}

function canWorkspaceEngage(
  communicationMode: string,
  preferences: { call?: boolean; sms?: boolean; email?: boolean }
): boolean {
  // If workspace allows all communication, check lead preferences
  if (communicationMode === "all") {
    return preferences.call === true || preferences.sms === true || preferences.email === true;
  }

  // If workspace only allows calls, check if lead accepts calls
  if (communicationMode === "calls_only") {
    return preferences.call === true;
  }

  // If workspace only allows texts, check if lead accepts SMS
  if (communicationMode === "texts_only") {
    return preferences.sms === true;
  }

  // If workspace allows calls and texts
  if (communicationMode === "calls_and_texts") {
    return preferences.call === true || preferences.sms === true;
  }

  // Default: require at least one channel preference to be true
  return preferences.call === true || preferences.sms === true || preferences.email === true;
}
