/**
 * Cron: Process follow-up sequences for all workspaces.
 * Finds due enrollments and advances them to the next step.
 * Executes actions (SMS/email/call) as needed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { processWorkspaceDueEnrollments } from "@/lib/sequences/follow-up-engine";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();

  try {
    // Get all active workspaces
    const { data: workspaces, error: wsError } = await db
      .from("workspaces")
      .select("id")
      .eq("is_active", true);

    if (wsError) {
      console.error("[Cron] Error fetching workspaces:", wsError);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      );
    }

    const results: Record<string, number> = {};
    let totalProcessed = 0;

    // Process each workspace
    for (const ws of workspaces ?? []) {
      const workspaceId = ws.id;

      try {
        const processed = await processWorkspaceDueEnrollments(
          workspaceId,
          50 // Process up to 50 enrollments per workspace
        );

        results[workspaceId] = processed;
        totalProcessed += processed;

        if (processed > 0) {
          console.log(
            `[Cron] Workspace ${workspaceId}: processed ${processed} enrollments`
          );
        }
      } catch (error) {
        console.error(
          `[Cron] Error processing workspace ${workspaceId}:`,
          error
        );
        results[workspaceId] = -1; // Indicate error
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Sequence processing completed. Total enrollments processed: ${totalProcessed}`,
      results,
      totalProcessed,
    });
  } catch (error) {
    console.error("[Cron] Unexpected error in sequence processor:", error);
    return NextResponse.json(
      { error: "Unexpected error processing sequences" },
      { status: 500 }
    );
  }
}
