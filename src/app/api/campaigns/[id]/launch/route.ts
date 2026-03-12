/**
 * POST /api/campaigns/[id]/launch — Activate campaign and enqueue outbound calls for matching leads.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { executeLeadOutboundCall } from "@/lib/outbound/execute-lead-call";
import type { CampaignType } from "@/lib/campaigns/prompt";

type TargetFilter = {
  audience_statuses?: string[];
  audience_source?: string;
  audience_min_score?: number | null;
  audience_not_contacted_days?: number | null;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();

  const { data: row, error } = await db
    .from("campaigns")
    .select("id, workspace_id, status, type, target_filter")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  };

  // Only launch from draft/paused into active
  if (campaign.status === "completed") {
    return NextResponse.json({ error: "Campaign already completed" }, { status: 400 });
  }

  const filter = (campaign.target_filter ?? {}) as TargetFilter;

  // Build lead query based on simple, deterministic filters
  let leadQuery = db
    .from("leads")
    .select("id, state, source, score, last_contact_at")
    .eq("workspace_id", workspaceId)
    .limit(200);

  if (Array.isArray(filter.audience_statuses) && filter.audience_statuses.length > 0) {
    leadQuery = leadQuery.in("state", filter.audience_statuses);
  }
  if (filter.audience_source) {
    leadQuery = leadQuery.eq("source", filter.audience_source);
  }
  if (typeof filter.audience_min_score === "number" && filter.audience_min_score >= 0) {
    leadQuery = leadQuery.gte("score", filter.audience_min_score);
  }
  if (typeof filter.audience_not_contacted_days === "number" && filter.audience_not_contacted_days > 0) {
    const cutoff = new Date(Date.now() - filter.audience_not_contacted_days * 24 * 60 * 60 * 1000)
      .toISOString();
    leadQuery = leadQuery.or(`last_contact_at.is.null,last_contact_at.lt.${cutoff}`);
  }

  const { data: leads, error: leadsError } = await leadQuery;
  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const launchAt = new Date().toISOString();
  let enqueued = 0;

  for (const lead of leads ?? []) {
    const leadId = (lead as { id: string }).id;
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
    }
  }

  await db
    .from("campaigns")
    .update({ status: "active", last_launched_at: launchAt })
    .eq("id", id);

  return NextResponse.json({ ok: true, enqueued, launched_at: launchAt });
}

