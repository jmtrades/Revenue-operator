/**
 * GET /api/recovery/missed-calls — Returns missed calls with recovery status.
 * Queries call_sessions where outcome indicates a missed call (no_answer, busy, voicemail)
 * and joins with leads for caller details.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

type RecoveryStatus = "recovered" | "pending" | "in_progress" | "lost";
type RecoveryMethod = "ai_callback" | "sms_followup" | "manual";

interface MissedCallRow {
  id: string;
  lead_id: string | null;
  outcome: string;
  call_started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
  leads?: {
    name: string;
    phone: string;
  } | null;
}

function deriveStatus(row: MissedCallRow): RecoveryStatus {
  const meta = row.metadata as Record<string, unknown> | null;
  if (meta?.recovery_status) return meta.recovery_status as RecoveryStatus;
  // If the call was missed but a later call_session exists for the same lead → recovered
  // For now, use metadata or fallback heuristic
  if (meta?.recovered === true) return "recovered";
  if (meta?.recovery_started === true) return "in_progress";
  const callTime = new Date(row.call_started_at).getTime();
  const hoursSince = (Date.now() - callTime) / (1000 * 60 * 60);
  if (hoursSince > 48) return "lost";
  return "pending";
}

function deriveRecoveryMethod(row: MissedCallRow): RecoveryMethod | undefined {
  const meta = row.metadata as Record<string, unknown> | null;
  if (meta?.recovery_method) return meta.recovery_method as RecoveryMethod;
  return undefined;
}

function deriveEstimatedValue(row: MissedCallRow): number {
  const meta = row.metadata as Record<string, unknown> | null;
  if (meta?.estimated_value && typeof meta.estimated_value === "number") return meta.estimated_value;
  return 450; // Industry average job value fallback
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: rows, error } = await db
      .from("call_sessions")
      .select("id, lead_id, outcome, call_started_at, ended_at, metadata, leads(name, phone)")
      .eq("workspace_id", workspaceId)
      .in("outcome", ["no_answer", "busy", "voicemail"])
      .gte("call_started_at", thirtyDaysAgo.toISOString())
      .order("call_started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[recovery/missed-calls] query error:", error.message);
      return NextResponse.json({ calls: [] });
    }

    const calls = (rows ?? []).map((row: unknown) => {
      const r = row as MissedCallRow;
      const lead = r.leads as { name: string; phone: string } | null;
      const status = deriveStatus(r);
      const meta = r.metadata as Record<string, unknown> | null;
      return {
        id: r.id,
        caller_name: lead?.name ?? "Unknown Caller",
        caller_phone: lead?.phone ?? "",
        called_at: r.call_started_at,
        status,
        estimated_value: deriveEstimatedValue(r),
        recovery_method: deriveRecoveryMethod(r),
        recovery_time_minutes: meta?.recovery_time_minutes as number | undefined,
      };
    });

    return NextResponse.json({ calls });
  } catch (e) {
    console.error("[recovery/missed-calls] unexpected error:", e);
    return NextResponse.json({ calls: [] });
  }
}
