/**
 * POST /api/campaigns/[id]/launch — Activate campaign and enqueue outbound calls for matching leads.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { executeLeadOutboundCall } from "@/lib/outbound/execute-lead-call";
import type { CampaignType } from "@/lib/campaigns/prompt";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkDNC } from "@/lib/compliance/dnc-check";

type TargetFilter = {
  audience_statuses?: string[];
  audience_source?: string;
  audience_min_score?: number | null;
  audience_not_contacted_days?: number | null;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const { id } = await ctx.params;
  const db = getDb();

  // Try outbound_campaigns first (campaign wizard stores here), fall back to campaigns
  let { data: row, error } = await db
    .from("outbound_campaigns")
    .select("id, workspace_id, status, type, target_filter, sequence_steps")
    .eq("id", id)
    .maybeSingle();
  if (!row && !error) {
    ({ data: row, error } = await db
      .from("campaigns")
      .select("id, workspace_id, status, type, target_filter, sequence_steps")
      .eq("id", id)
      .maybeSingle());
  }

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workspaceId = (row as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const campaign = row as {
    id: string;
    workspace_id: string;
    status: string;
    type: string;
    target_filter: TargetFilter | null;
    sequence_steps?: Array<{ channel: string; message?: string; subject?: string | null }>;
  };

  // Safeguard: only allow launch when workspace has an active subscription (not paused/expired).
  const { data: ws, error: wsError } = await db
    .from("workspaces")
    .select("billing_status, stripe_subscription_id, pause_reason, communication_mode, agent_mode")
    .eq("id", workspaceId)
    .maybeSingle();
  if (wsError) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const billing = ws as {
    billing_status?: string | null;
    stripe_subscription_id?: string | null;
    pause_reason?: string | null;
    communication_mode?: string | null;
    agent_mode?: string | null;
  };
  const blockedBillingStatuses = new Set(["trial_ended", "cancelled", "payment_failed"]);
  const isActive =
    (billing.billing_status === "active" || billing.billing_status === "trial") &&
    !blockedBillingStatuses.has(billing.billing_status ?? "") &&
    !billing.pause_reason &&
    Boolean(billing.stripe_subscription_id);
  if (!isActive) {
    return NextResponse.json(
      { error: "Workspace subscription inactive. Update billing to launch campaigns." },
      { status: 402 },
    );
  }

  // Check communication_mode constraints
  const steps = campaign.sequence_steps ?? [];
  if (billing.communication_mode === "texts_only") {
    const hasCallSteps = steps.some((s) => s.channel === "call");
    if (hasCallSteps) {
      return NextResponse.json(
        { error: "Cannot launch campaign with call steps: workspace is in text-only mode. Update communication settings to allow calls." },
        { status: 400 }
      );
    }
  } else if (billing.communication_mode === "calls_only") {
    const hasSmsSteps = steps.some((s) => s.channel === "sms");
    if (hasSmsSteps) {
      return NextResponse.json(
        { error: "Cannot launch campaign with SMS steps: workspace is in calls-only mode. Update communication settings to allow texts." },
        { status: 400 }
      );
    }
  }

  // Check agent_mode constraint - inbound_only cannot do outbound campaigns
  if (billing.agent_mode === "inbound_only") {
    return NextResponse.json(
      { error: "Cannot launch outbound campaign: workspace is configured for inbound calls only. Update agent settings to allow outbound campaigns." },
      { status: 400 }
    );
  }

  // Safeguard: require at least one active phone number.
  const { count: activePhoneCount } = await db
    .from("phone_numbers")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if ((activePhoneCount ?? 0) < 1) {
    return NextResponse.json(
      { error: "Workspace has no active phone numbers. Connect a number before launching." },
      { status: 400 },
    );
  }

  // Only launch from draft/paused into active
  if (campaign.status === "completed") {
    return NextResponse.json({ error: "Campaign already completed" }, { status: 400 });
  }
  if (campaign.status === "active") {
    return NextResponse.json({ error: "Campaign is already active" }, { status: 400 });
  }

  // Validate: workspace can't have more than 3 active campaigns at once
  const { count: activeCampaignCount } = await db
    .from("outbound_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if ((activeCampaignCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Maximum of 3 active campaigns allowed. Complete or pause an existing campaign first." },
      { status: 400 },
    );
  }

  const filter = (campaign.target_filter ?? {}) as TargetFilter;

  // Safeguard: require at least one step template on the campaign sequence.
  // Also check target_filter.sequence as fallback (campaign wizard stores there too)
  let sequenceSteps = Array.isArray(campaign.sequence_steps) ? campaign.sequence_steps : [];
  if (sequenceSteps.length === 0 && campaign.target_filter) {
    const tf = campaign.target_filter as Record<string, unknown>;
    if (Array.isArray(tf.sequence)) {
      sequenceSteps = (tf.sequence as Array<Record<string, unknown>>).map((s) => ({
        channel: String(s.channel ?? "sms"),
        message: String(s.template ?? s.message ?? ""),
        subject: s.subject ? String(s.subject) : null,
      }));
    }
  }
  const hasNonEmptyTemplate = sequenceSteps.some((s) => {
    const msg = (s as Record<string, unknown>).message ?? (s as Record<string, unknown>).template ?? "";
    const messageOk = typeof msg === "string" ? msg.trim().length > 0 : false;
    const subjectOk = typeof s.subject === "string" ? s.subject.trim().length > 0 : false;
    return s.channel === "sms" ? messageOk : messageOk || subjectOk;
  });
  if (sequenceSteps.length < 1 || !hasNonEmptyTemplate) {
    return NextResponse.json(
      { error: "Campaign sequence is missing templates. Add at least one step before launching." },
      { status: 400 },
    );
  }

  // Safeguard: verify audience count > 0 and ensure opted-out contacts are excluded.
  const buildLeadCountQuery = (excludeOptedOut: boolean) => {
    let q = db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    if (Array.isArray(filter.audience_statuses) && filter.audience_statuses.length > 0) {
      q = q.in("state", filter.audience_statuses);
    }
    if (filter.audience_source) {
      q = q.eq("source", filter.audience_source);
    }
    if (typeof filter.audience_min_score === "number" && filter.audience_min_score >= 0) {
      q = q.gte("qualification_score", filter.audience_min_score);
    }
    if (typeof filter.audience_not_contacted_days === "number" && filter.audience_not_contacted_days > 0) {
      const cutoff = new Date(Date.now() - filter.audience_not_contacted_days * 24 * 60 * 60 * 1000).toISOString();
      q = q.or(`last_activity_at.is.null,last_activity_at.lt.${cutoff}`);
    }

    if (excludeOptedOut) {
      q = q.neq("opt_out", true);
    }

    return q;
  };

  const leadCountQueryBase = buildLeadCountQuery(false);
  const { count: audienceCount } = await leadCountQueryBase;

  if ((audienceCount ?? 0) < 1) {
    return NextResponse.json({ error: "Audience is empty for the selected campaign filters." }, { status: 400 });
  }

  const leadCountQueryAllowed = buildLeadCountQuery(true);
  const { count: audienceAllowedCount } = await leadCountQueryAllowed;

  if ((audienceAllowedCount ?? 0) !== (audienceCount ?? 0)) {
    return NextResponse.json(
      { error: "One or more audience contacts have opted out. Adjust your audience selection before launching." },
      { status: 400 },
    );
  }

  // Build lead query for enqueuing.
  let leadQuery = db
    .from("leads")
    .select("id, state, source, qualification_score, last_activity_at")
    .eq("workspace_id", workspaceId)
    .limit(1000);

  if (Array.isArray(filter.audience_statuses) && filter.audience_statuses.length > 0) {
    leadQuery = leadQuery.in("state", filter.audience_statuses);
  }
  if (filter.audience_source) {
    leadQuery = leadQuery.eq("source", filter.audience_source);
  }
  if (typeof filter.audience_min_score === "number" && filter.audience_min_score >= 0) {
    leadQuery = leadQuery.gte("qualification_score", filter.audience_min_score);
  }
  if (typeof filter.audience_not_contacted_days === "number" && filter.audience_not_contacted_days > 0) {
    const cutoff = new Date(Date.now() - filter.audience_not_contacted_days * 24 * 60 * 60 * 1000).toISOString();
    leadQuery = leadQuery.or(`last_activity_at.is.null,last_activity_at.lt.${cutoff}`);
  }

  leadQuery = leadQuery.neq("opt_out", true);

  // Exclude leads already in an active campaign to prevent double-enrollment
  const { data: activeLeadIds } = await db
    .from("campaign_leads")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "sent", "calling"]);
  const excludeLeadIds = new Set(
    (activeLeadIds ?? []).map((r: { lead_id: string }) => r.lead_id)
  );

  const { data: leads, error: leadsError } = await leadQuery;
  if (leadsError) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  if (!leads || leads.length < 1) {
    return NextResponse.json({ error: "Audience is empty for the selected campaign filters." }, { status: 400 });
  }

  // Filter out leads already in an active campaign
  const eligibleLeads = (leads ?? []).filter(
    (lead) => !excludeLeadIds.has((lead as { id: string }).id)
  );
  if (eligibleLeads.length < 1) {
    return NextResponse.json(
      { error: "All matching leads are already enrolled in an active campaign." },
      { status: 400 },
    );
  }

  const launchAt = new Date().toISOString();

  // Atomic lock: transition status from draft/paused → launching to prevent double-launch.
  // If another request already changed the status, this update affects 0 rows.
  const { data: lockResult, error: lockErr } = await db
    .from("outbound_campaigns")
    .update({ status: "launching", updated_at: launchAt })
    .eq("id", id)
    .in("status", ["draft", "paused"])
    .select("id")
    .maybeSingle();

  if (lockErr || !lockResult) {
    return NextResponse.json(
      { error: "Campaign is already being launched or is no longer in a launchable state." },
      { status: 409 },
    );
  }

  let enqueued = 0;
  let dncBlocked = 0;
  let campaignStatus = "active";
  let errorMessage: string | null = null;

  try {
    // Insert campaign_leads junction records for cron processor to track
    const campaignLeadRows = eligibleLeads.map((lead) => ({
      campaign_id: id,
      lead_id: (lead as { id: string }).id,
      status: "pending",
      created_at: launchAt,
    }));

    if (campaignLeadRows.length > 0) {
      const { error: junctionErr } = await db
        .from("campaign_leads")
        .upsert(campaignLeadRows, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true });
      if (junctionErr) {
        console.error("[campaign/launch] Failed to insert campaign_leads:", junctionErr.message);
        throw new Error(`Failed to create campaign_leads: ${junctionErr.message}`);
      }
    }

    // Check if campaign has sequence steps (SMS/email)
    const hasSequenceSteps = steps.some((s) => s.channel === "sms" || s.channel === "email");

    // If campaign has sequence steps, create or use a sequence for enrollment
    let sequenceId: string | null = null;
    if (hasSequenceSteps) {
      // Try to find or create a sequence for this campaign
      const { data: existingSeq } = await db
        .from("sequences")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("trigger_type", "campaign_" + id)
        .limit(1)
        .maybeSingle();

      if (existingSeq) {
        sequenceId = (existingSeq as { id: string }).id;
      } else {
        // Create a new sequence from the campaign's sequence steps
        const sequenceStepsData = steps
          .map((step, idx) => ({
            step_order: idx + 1,
            type: step.channel as "sms" | "email" | "call",
            delay_minutes: idx === 0 ? 0 : 60, // First step immediately, subsequent steps 1h apart
            config: {
              template_content: step.message || step.subject || "",
              campaign_step_index: idx,
            },
          }));

        const { data: newSeq, error: seqErr } = await db
          .from("sequences")
          .insert({
            workspace_id: workspaceId,
            name: `Campaign ${id.slice(0, 8)}`,
            trigger_type: "campaign_" + id,
            is_active: true,
          })
          .select("id")
          .maybeSingle();

        if (!seqErr && newSeq) {
          sequenceId = (newSeq as { id: string }).id;

          // Insert sequence steps
          if (sequenceStepsData.length > 0) {
            await db.from("sequence_steps").insert(
              sequenceStepsData.map((step) => ({
                ...step,
                sequence_id: sequenceId,
              }))
            );
          }
        }
      }
    }

    // Enqueue leads for outbound execution
    for (const lead of eligibleLeads) {
      const leadId = (lead as { id: string }).id;
      const leadPhone = (lead as { phone?: string | null }).phone;

      // DNC compliance check — skip leads on Do Not Call list
      if (leadPhone) {
        try {
          const dncResult = await checkDNC(workspaceId, leadPhone);
          if (dncResult.blocked) {
            dncBlocked += 1;
            await db
              .from("campaign_leads")
              .update({ status: "dnc_blocked", sent_at: new Date().toISOString() })
              .eq("campaign_id", id)
              .eq("lead_id", leadId);
            continue; // Skip this lead entirely
          }
        } catch (dncErr) {
          console.warn(`[campaign/launch] DNC check failed for lead ${leadId}: ${dncErr instanceof Error ? dncErr.message : String(dncErr)}`);
          // Non-blocking: if DNC check fails, proceed with caution (don't skip the lead)
        }
      }

      // If there are sequence steps, enroll the lead in the sequence
      if (sequenceId) {
        try {
          const { enrollContact } = await import("@/lib/sequences/follow-up-engine");
          await enrollContact(workspaceId, sequenceId, leadId);
        } catch (enrollErr) {
          console.warn(
            `[campaign/launch] Failed to enroll lead ${leadId} in sequence: ${enrollErr instanceof Error ? enrollErr.message : String(enrollErr)}`
          );
          // Non-blocking: if enrollment fails, continue with call execution
        }
      }

      // Only execute call step if the first step is a call (or if no sequence)
      const firstStep = steps[0];
      const shouldExecuteCall = !hasSequenceSteps || (firstStep && firstStep.channel === "call");

      if (shouldExecuteCall) {
        const result = await executeLeadOutboundCall(
          workspaceId,
          leadId,
          {
            campaignType: (campaign.type as CampaignType) ?? "lead_followup",
            campaignPromptOptions: {
              followUpContext: "their recent inquiry",
            },
          },
        );
        if (result.ok) {
          enqueued += 1;
          // Mark as sent in campaign_leads
          await db
            .from("campaign_leads")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("campaign_id", id)
            .eq("lead_id", leadId);
        }
      } else {
        // Sequence-first campaign: mark as sent when sequence is enrolled
        enqueued += 1;
        await db
          .from("campaign_leads")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("campaign_id", id)
          .eq("lead_id", leadId);
      }
    }

    // Only update to active if enqueuing succeeded
    if (enqueued === 0) {
      campaignStatus = "draft";
      errorMessage = "No leads were successfully enqueued";
    }
  } catch (err) {
    campaignStatus = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error during campaign launch";
    console.error("[campaign/launch] Campaign launch failed:", errorMessage);
  }

  // Update campaign status based on enqueuing outcome
  await db
    .from("outbound_campaigns")
    .update({
      status: campaignStatus,
      last_launched_at: launchAt,
      total_contacts: eligibleLeads.length,
      metadata: errorMessage ? { launch_error: errorMessage } : undefined,
    })
    .eq("id", id);

  if (campaignStatus === "failed") {
    return NextResponse.json({ ok: false, error: errorMessage, enqueued }, { status: 500 });
  }

  if (enqueued === 0) {
    return NextResponse.json({ ok: false, error: "No leads were successfully enqueued. Check campaign audience filters.", enqueued: 0 }, { status: 422 });
  }

  return NextResponse.json({ ok: true, enqueued, dnc_blocked: dncBlocked, launched_at: launchAt });
}

