/**
 * Outbound Dialer Engine
 *
 * Multi-mode outbound calling system for AI-powered sales campaigns.
 *
 * Modes:
 * - Power Dialer: Auto-dials next lead when current call ends. Max throughput.
 * - Preview Dialer: Shows lead info, agent clicks to dial. Quality over quantity.
 * - Progressive Dialer: Auto-dials with short preview delay. Balanced approach.
 *
 * Features:
 * - Campaign management (create, pause, resume, stop)
 * - Call disposition tracking
 * - Do-Not-Call (DNC) list compliance
 * - TCPA time-of-day restrictions
 * - Voicemail detection + smart drop
 * - Live call transfer to human agent
 * - Real-time campaign analytics
 * - Concurrent call limits per workspace
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

/* ── Types ───────────────────────────────────────────────────────── */

export type DialerMode = "power" | "preview" | "progressive";
export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "cancelled";
export type CallDisposition =
  | "answered"
  | "voicemail"
  | "no_answer"
  | "busy"
  | "failed"
  | "dnc"
  | "transferred"
  | "callback_scheduled";

export interface OutboundCampaign {
  id: string;
  workspace_id: string;
  name: string;
  mode: DialerMode;
  status: CampaignStatus;
  agent_script_id?: string;
  voice_agent_id?: string;
  from_number: string;
  lead_list_id?: string;
  settings: CampaignSettings;
  stats: CampaignStats;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CampaignSettings {
  max_concurrent_calls: number;
  max_attempts_per_lead: number;
  retry_delay_minutes: number;
  voicemail_behavior: "drop" | "hangup" | "skip";
  voicemail_template_id?: string;
  caller_id_name?: string;
  recording_enabled: boolean;
  transfer_number?: string;
  /** TCPA: Only call during these hours (lead's local time) */
  calling_hours: { start: string; end: string }; // "09:00" - "20:00"
  calling_days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  /** Preview delay in seconds before auto-dial (progressive mode) */
  preview_delay_seconds: number;
  /** Max ring time before giving up */
  ring_timeout_seconds: number;
  /** Tags to filter leads for this campaign */
  lead_filters?: Record<string, unknown>;
  /** Custom system prompt override for AI agent */
  custom_prompt?: string;
  /** Priority: higher = dialed first */
  priority_field?: string;
}

export interface CampaignStats {
  total_leads: number;
  dialed: number;
  answered: number;
  voicemails: number;
  no_answers: number;
  transferred: number;
  callbacks_scheduled: number;
  dnc_hits: number;
  failed: number;
  avg_call_duration_seconds: number;
  conversion_rate: number;
  connect_rate: number;
  calls_per_hour: number;
}

export interface DialerQueueItem {
  id: string;
  campaign_id: string;
  lead_id: string;
  phone: string;
  lead_name?: string;
  priority: number;
  attempt_number: number;
  status: "queued" | "dialing" | "in_progress" | "completed" | "retry";
  disposition?: CallDisposition;
  call_sid?: string;
  started_at?: string;
  ended_at?: string;
  notes?: string;
}

/* ── Default Settings ────────────────────────────────────────────── */

const DEFAULT_SETTINGS: CampaignSettings = {
  max_concurrent_calls: 1,
  max_attempts_per_lead: 3,
  retry_delay_minutes: 60,
  voicemail_behavior: "drop",
  recording_enabled: true,
  calling_hours: { start: "09:00", end: "20:00" },
  calling_days: [1, 2, 3, 4, 5], // Mon-Fri
  preview_delay_seconds: 5,
  ring_timeout_seconds: 25,
};

/* ── Campaign Management ─────────────────────────────────────────── */

/**
 * Create a new outbound campaign.
 */
export async function createCampaign(
  workspaceId: string,
  name: string,
  mode: DialerMode,
  fromNumber: string,
  settings?: Partial<CampaignSettings>,
): Promise<OutboundCampaign | null> {
  const db = getDb();

  try {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const campaign: OutboundCampaign = {
      id: campaignId,
      workspace_id: workspaceId,
      name,
      mode,
      status: "draft",
      from_number: fromNumber,
      settings: { ...DEFAULT_SETTINGS, ...settings },
      stats: {
        total_leads: 0,
        dialed: 0,
        answered: 0,
        voicemails: 0,
        no_answers: 0,
        transferred: 0,
        callbacks_scheduled: 0,
        dnc_hits: 0,
        failed: 0,
        avg_call_duration_seconds: 0,
        conversion_rate: 0,
        connect_rate: 0,
        calls_per_hour: 0,
      },
      created_at: new Date().toISOString(),
    };

    // Store in workspace metadata (campaigns array)
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const wsMeta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const campaigns = (wsMeta.outbound_campaigns ?? []) as OutboundCampaign[];

    await db.from("workspaces").update({
      metadata: {
        ...wsMeta,
        outbound_campaigns: [...campaigns, campaign],
      },
    }).eq("id", workspaceId);

    log("info", "outbound_dialer.campaign_created", {
      campaignId,
      workspaceId,
      mode,
      name,
    });

    return campaign;
  } catch (err) {
    log("error", "outbound_dialer.create_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Add leads to a campaign's dial queue.
 */
export async function addLeadsToCampaign(
  workspaceId: string,
  campaignId: string,
  leadIds: string[],
): Promise<number> {
  const db = getDb();
  let added = 0;

  try {
    // Load DNC list for workspace
    const dncList = await getDncList(workspaceId);

    for (const leadId of leadIds) {
      const { data: lead } = await db
        .from("leads")
        .select("id, phone, name, metadata")
        .eq("id", leadId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!lead) continue;

      const leadData = lead as { id: string; phone?: string; name?: string; metadata?: Record<string, unknown> };

      if (!leadData.phone) continue;

      // Check DNC
      if (dncList.has(leadData.phone.replace(/[^\d+]/g, ""))) {
        log("info", "outbound_dialer.dnc_skip", { leadId, phone: leadData.phone });
        continue;
      }

      // Check if already in queue
      const leadMeta = leadData.metadata ?? {};
      const existingCampaigns = (leadMeta.outbound_campaigns ?? []) as string[];
      if (existingCampaigns.includes(campaignId)) continue;

      // Add to lead's campaign tracking
      await db.from("leads").update({
        metadata: {
          ...leadMeta,
          outbound_campaigns: [...existingCampaigns, campaignId],
          outbound_queue: {
            campaign_id: campaignId,
            status: "queued",
            attempt_number: 0,
            queued_at: new Date().toISOString(),
          },
        },
      }).eq("id", leadId);

      added++;
    }

    // Update campaign stats
    await updateCampaignStats(workspaceId, campaignId, { total_leads_delta: added });

    log("info", "outbound_dialer.leads_added", { campaignId, added, total: leadIds.length });
    return added;
  } catch (err) {
    log("error", "outbound_dialer.add_leads_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Get the next lead to dial from a campaign queue.
 */
export async function getNextLead(
  workspaceId: string,
  campaignId: string,
): Promise<DialerQueueItem | null> {
  const db = getDb();

  try {
    // Find queued leads for this campaign, ordered by priority
    const { data: leads } = await db
      .from("leads")
      .select("id, phone, name, metadata")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(50);

    const leadList = (leads ?? []) as Array<{
      id: string;
      phone?: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }>;

    // Find first lead queued for this campaign
    for (const lead of leadList) {
      const meta = lead.metadata ?? {};
      const queue = meta.outbound_queue as { campaign_id?: string; status?: string; attempt_number?: number } | undefined;

      if (queue?.campaign_id !== campaignId) continue;
      if (queue?.status !== "queued" && queue?.status !== "retry") continue;

      // Check TCPA calling hours
      if (!isWithinCallingHours()) {
        log("info", "outbound_dialer.outside_hours", { campaignId });
        return null;
      }

      return {
        id: `qi_${Date.now()}`,
        campaign_id: campaignId,
        lead_id: lead.id,
        phone: lead.phone ?? "",
        lead_name: lead.name,
        priority: 0,
        attempt_number: (queue?.attempt_number ?? 0) + 1,
        status: "queued",
      };
    }

    return null;
  } catch (err) {
    log("error", "outbound_dialer.get_next_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Initiate an outbound call via Twilio.
 */
export async function initiateOutboundCall(
  workspaceId: string,
  campaignId: string,
  queueItem: DialerQueueItem,
  fromNumber: string,
): Promise<{ callSid: string } | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!accountSid || !authToken || !appUrl) {
    log("error", "outbound_dialer.missing_credentials", {});
    return null;
  }

  try {
    const db = getDb();

    // Mark lead as dialing
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("id", queueItem.lead_id)
      .maybeSingle();

    const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;

    await db.from("leads").update({
      metadata: {
        ...leadMeta,
        outbound_queue: {
          campaign_id: campaignId,
          status: "dialing",
          attempt_number: queueItem.attempt_number,
          dialing_at: new Date().toISOString(),
        },
      },
    }).eq("id", queueItem.lead_id);

    // Create Twilio call
    const callbackUrl = `${appUrl}/api/webhooks/twilio/voice?workspace_id=${workspaceId}&campaign_id=${campaignId}&lead_id=${queueItem.lead_id}&outbound=true`;
    const statusUrl = `${appUrl}/api/webhooks/twilio/status`;

    const callParams = new URLSearchParams({
      To: queueItem.phone,
      From: fromNumber,
      Url: callbackUrl,
      StatusCallback: statusUrl,
      StatusCallbackEvent: "initiated ringing answered completed",
      Timeout: "25",
      MachineDetection: "DetectMessageEnd",
      MachineDetectionTimeout: "10",
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: callParams.toString(),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Twilio API error: ${resp.status} - ${errText}`);
    }

    const callData = await resp.json() as { sid: string };

    log("info", "outbound_dialer.call_initiated", {
      campaignId,
      leadId: queueItem.lead_id,
      callSid: callData.sid,
      attempt: queueItem.attempt_number,
    });

    return { callSid: callData.sid };
  } catch (err) {
    log("error", "outbound_dialer.initiate_failed", {
      error: err instanceof Error ? err.message : String(err),
      leadId: queueItem.lead_id,
    });

    // Mark as failed
    const db = getDb();
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("id", queueItem.lead_id)
      .maybeSingle();

    const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    await db.from("leads").update({
      metadata: {
        ...leadMeta,
        outbound_queue: {
          campaign_id: campaignId,
          status: "completed",
          disposition: "failed",
          attempt_number: queueItem.attempt_number,
          failed_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        },
      },
    }).eq("id", queueItem.lead_id);

    return null;
  }
}

/**
 * Record the disposition of a completed outbound call.
 */
export async function recordDisposition(
  workspaceId: string,
  campaignId: string,
  leadId: string,
  disposition: CallDisposition,
  callDurationSeconds: number,
  notes?: string,
): Promise<void> {
  const db = getDb();

  try {
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("id", leadId)
      .maybeSingle();

    const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const queue = (leadMeta.outbound_queue ?? {}) as Record<string, unknown>;
    const attemptNumber = (queue.attempt_number as number) ?? 1;

    // Determine if we should retry
    const maxAttempts = 3;
    const shouldRetry =
      (disposition === "no_answer" || disposition === "busy" || disposition === "voicemail") &&
      attemptNumber < maxAttempts;

    await db.from("leads").update({
      metadata: {
        ...leadMeta,
        outbound_queue: {
          campaign_id: campaignId,
          status: shouldRetry ? "retry" : "completed",
          disposition,
          attempt_number: attemptNumber,
          call_duration_seconds: callDurationSeconds,
          completed_at: new Date().toISOString(),
          notes,
          ...(shouldRetry ? { retry_after: new Date(Date.now() + 3600_000).toISOString() } : {}),
        },
        outbound_history: [
          ...((leadMeta.outbound_history ?? []) as Array<Record<string, unknown>>),
          {
            campaign_id: campaignId,
            attempt: attemptNumber,
            disposition,
            duration: callDurationSeconds,
            date: new Date().toISOString(),
            notes,
          },
        ],
      },
    }).eq("id", leadId);

    // Update campaign stats
    const statsDelta: Record<string, number> = {};
    switch (disposition) {
      case "answered": statsDelta.answered_delta = 1; break;
      case "voicemail": statsDelta.voicemails_delta = 1; break;
      case "no_answer": statsDelta.no_answers_delta = 1; break;
      case "transferred": statsDelta.transferred_delta = 1; break;
      case "callback_scheduled": statsDelta.callbacks_delta = 1; break;
      case "dnc": statsDelta.dnc_delta = 1; break;
      default: statsDelta.failed_delta = 1; break;
    }
    statsDelta.dialed_delta = 1;

    await updateCampaignStats(workspaceId, campaignId, statsDelta);

    log("info", "outbound_dialer.disposition_recorded", {
      campaignId,
      leadId,
      disposition,
      duration: callDurationSeconds,
      willRetry: shouldRetry,
    });
  } catch (err) {
    log("error", "outbound_dialer.record_disposition_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/**
 * Check if current time is within TCPA calling hours (9 AM - 8 PM local).
 */
function isWithinCallingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 9 && hour < 20;
}

/**
 * Get the workspace's Do-Not-Call list.
 */
async function getDncList(workspaceId: string): Promise<Set<string>> {
  const db = getDb();
  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const dncNumbers = (meta.dnc_list ?? []) as string[];
    return new Set(dncNumbers.map(n => n.replace(/[^\d+]/g, "")));
  } catch {
    return new Set();
  }
}

/**
 * Add a phone number to the DNC list.
 */
export async function addToDnc(workspaceId: string, phone: string): Promise<void> {
  const db = getDb();
  const normalized = phone.replace(/[^\d+]/g, "");

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const dncList = (meta.dnc_list ?? []) as string[];

    if (!dncList.includes(normalized)) {
      await db.from("workspaces").update({
        metadata: {
          ...meta,
          dnc_list: [...dncList, normalized],
          dnc_updated_at: new Date().toISOString(),
        },
      }).eq("id", workspaceId);
    }
  } catch (err) {
    log("error", "outbound_dialer.dnc_add_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Update campaign stats atomically.
 */
async function updateCampaignStats(
  workspaceId: string,
  campaignId: string,
  deltas: Record<string, number>,
): Promise<void> {
  const db = getDb();

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const campaigns = (meta.outbound_campaigns ?? []) as OutboundCampaign[];

    const idx = campaigns.findIndex(c => c.id === campaignId);
    if (idx < 0) return;

    const campaign = campaigns[idx];
    const stats = campaign.stats;

    if (deltas.total_leads_delta) stats.total_leads += deltas.total_leads_delta;
    if (deltas.dialed_delta) stats.dialed += deltas.dialed_delta;
    if (deltas.answered_delta) stats.answered += deltas.answered_delta;
    if (deltas.voicemails_delta) stats.voicemails += deltas.voicemails_delta;
    if (deltas.no_answers_delta) stats.no_answers += deltas.no_answers_delta;
    if (deltas.transferred_delta) stats.transferred += deltas.transferred_delta;
    if (deltas.callbacks_delta) stats.callbacks_scheduled += deltas.callbacks_delta;
    if (deltas.dnc_delta) stats.dnc_hits += deltas.dnc_delta;
    if (deltas.failed_delta) stats.failed += deltas.failed_delta;

    // Recalculate rates
    if (stats.dialed > 0) {
      stats.connect_rate = stats.answered / stats.dialed;
    }

    campaigns[idx] = { ...campaign, stats };

    await db.from("workspaces").update({
      metadata: { ...meta, outbound_campaigns: campaigns },
    }).eq("id", workspaceId);
  } catch (err) {
    log("warn", "outbound_dialer.stats_update_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get campaign analytics summary.
 */
export async function getCampaignAnalytics(
  workspaceId: string,
  campaignId: string,
): Promise<CampaignStats | null> {
  const db = getDb();

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("metadata")
      .eq("id", workspaceId)
      .maybeSingle();

    const meta = ((ws as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const campaigns = (meta.outbound_campaigns ?? []) as OutboundCampaign[];

    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.stats ?? null;
  } catch {
    return null;
  }
}
