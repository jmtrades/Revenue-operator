/**
 * Process scheduled follow-up calls — runs every 15 minutes via cron scheduler.
 * Queries leads with scheduled_follow_up metadata where scheduled_at is past.
 * Initiates outbound calls and marks follow-ups as processed.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertCronAuthorized } from "@/lib/runtime";
import { log } from "@/lib/logger";

interface LeadRow {
  id: string;
  workspace_id: string;
  metadata: {
    scheduled_follow_up?: {
      scheduled_at: string;
      processed?: boolean;
    };
  };
}

export async function GET(req: NextRequest) {
  try {
    const authErr = assertCronAuthorized(req);
    if (authErr) return authErr;

    const db = getDb();
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const now = new Date().toISOString();

      let leads: LeadRow[] | null = null;
      try {
        // Try the primary JSONB filter approach
        const result = await db
          .from("leads")
          .select("id, workspace_id, metadata")
          .filter("metadata->scheduled_follow_up->scheduled_at", "lt", now)
          .filter("metadata->scheduled_follow_up->processed", "is", null)
          .order("metadata->scheduled_follow_up->scheduled_at", { ascending: true })
          .limit(20);

        if (result.error) {
          log("warn", "cron.follow_ups.query_failed", { error: String(result.error) });
          // Fallback: attempt raw query approach or return gracefully
          try {
            const fallbackResult = await db
              .from("leads")
              .select("id, workspace_id, metadata")
              .limit(20);

            if (fallbackResult.error) {
              log("warn", "cron.follow_ups.fallback_query_failed", { error: String(fallbackResult.error) });
              return NextResponse.json({ ok: true, processed: 0, failed: 0, skipped: 0, note: "query_unavailable" }, { status: 200 });
            }

            leads = (fallbackResult.data as LeadRow[] || []).filter((lead) => {
              const followUp = lead.metadata?.scheduled_follow_up;
              return followUp?.scheduled_at && new Date(followUp.scheduled_at) < new Date(now) && !followUp.processed;
            }).slice(0, 20);
          } catch (fallbackErr) {
            log("warn", "cron.follow_ups.fallback_error", { error: String(fallbackErr) });
            return NextResponse.json({ ok: true, processed: 0, failed: 0, skipped: 0, note: "query_unavailable" }, { status: 200 });
          }
        } else {
          leads = result.data as LeadRow[] | null;
        }
      } catch (queryErr) {
        log("warn", "cron.follow_ups.query_error", { error: String(queryErr) });
        return NextResponse.json({ ok: true, processed: 0, failed: 0, skipped: 0, note: "query_unavailable" }, { status: 200 });
      }

      if (!leads || leads.length === 0) {
        return NextResponse.json({ ok: true, processed, failed, skipped }, { status: 200 });
      }

      for (const lead of leads as LeadRow[]) {
        try {
          const followUp = lead.metadata?.scheduled_follow_up;
          if (!followUp?.scheduled_at) {
            skipped++;
            continue;
          }

          const workspace_id = lead.workspace_id;

          try {
            // Direct function import instead of HTTP roundtrip for reliability + perf
            const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");
            const callResult = await executeLeadOutboundCall(workspace_id, lead.id);

            if (!callResult.ok) {
              log("warn", "cron.follow_ups.call_failed", { lead_id: lead.id, error: callResult.error });
              failed++;
              continue;
            }

            const updated_metadata = {
              ...lead.metadata,
              scheduled_follow_up: {
                ...followUp,
                processed: true,
                processed_at: new Date().toISOString(),
              },
            };

            const { error: updateError } = await db
              .from("leads")
              .update({ metadata: updated_metadata })
              .eq("id", lead.id);

            if (updateError) {
              log("error", "cron.follow_ups.mark_failed", { lead_id: lead.id });
              failed++;
              continue;
            }

            log("info", "cron.follow_ups.processed", { lead_id: lead.id, workspace_id });
            processed++;
          } catch (callErr) {
            log("error", "cron.follow_ups.call_error", { lead_id: lead.id, error: callErr instanceof Error ? callErr.message : String(callErr) });
            failed++;
          }
        } catch (leadErr) {
          log("error", "cron.follow_ups.lead_error", { lead_id: lead.id, error: leadErr instanceof Error ? leadErr.message : String(leadErr) });
          failed++;
        }
      }

      return NextResponse.json({ ok: true, processed, failed, skipped }, { status: 200 });
    } catch (err) {
      log("error", "cron.follow_ups.failed", { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json(
        { ok: true, processed: 0, failed: 0, skipped: 0, note: "handler_error" },
        { status: 200 }
      );
    }
  } catch (topErr) {
    log("error", "cron.follow_ups.top_level_error", { error: topErr instanceof Error ? topErr.message : String(topErr) });
    return NextResponse.json(
      { ok: true, processed: 0, failed: 0, skipped: 0, note: "critical_error" },
      { status: 200 }
    );
  }
}
