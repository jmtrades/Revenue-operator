import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { getNextLead, initiateOutboundCall } from "@/lib/voice/outbound-dialer";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron: Process outbound dialer queues.
 * Runs every 2 minutes. Picks up active campaigns and dials next leads.
 */
export async function GET() {
  const db = getDb();
  let callsInitiated = 0;

  try {
    // Find all workspaces with active campaigns
    const { data: workspaces } = await db
      .from("workspaces")
      .select("id, metadata")
      .limit(50);

    const wsList = (workspaces ?? []) as Array<{
      id: string;
      metadata?: Record<string, unknown>;
    }>;

    for (const ws of wsList) {
      const meta = ws.metadata ?? {};
      const campaigns = (meta.outbound_campaigns ?? []) as Array<{
        id: string;
        status: string;
        from_number: string;
        settings: { max_concurrent_calls: number };
      }>;

      const activeCampaigns = campaigns.filter(c => c.status === "active");

      for (const campaign of activeCampaigns) {
        // Check concurrent call limit
        const maxConcurrent = campaign.settings?.max_concurrent_calls ?? 1;

        // Get next lead
        const nextLead = await getNextLead(ws.id, campaign.id);
        if (!nextLead) continue;

        // Initiate the call
        const result = await initiateOutboundCall(
          ws.id,
          campaign.id,
          nextLead,
          campaign.from_number,
        );

        if (result) {
          callsInitiated++;
        }

        // Respect concurrent limit
        if (callsInitiated >= maxConcurrent) break;
      }
    }

    log("info", "cron.outbound_dialer", { callsInitiated });
    return NextResponse.json({ ok: true, callsInitiated });
  } catch (err) {
    log("error", "cron.outbound_dialer.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
