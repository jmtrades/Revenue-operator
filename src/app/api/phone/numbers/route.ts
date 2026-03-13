/**
 * GET /api/phone/numbers — List workspace phone numbers (revenue_operator.phone_numbers).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("phone_numbers")
    .select("id, phone_number, friendly_name, number_type, status, monthly_cost_cents, capabilities, assigned_agent_id")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load numbers" }, { status: 500 });
  }

  const list = (data ?? []) as Array<{
    id: string;
    phone_number: string;
    friendly_name: string | null;
    number_type: string;
    status: string;
    monthly_cost_cents: number;
    capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
    assigned_agent_id: string | null;
  }>;

  const totalMonthlyCents = list.reduce((s, n) => s + (n.monthly_cost_cents ?? 0), 0);
  return NextResponse.json({
    numbers: list,
    total: list.length,
    total_monthly_cents: totalMonthlyCents,
  });
}
