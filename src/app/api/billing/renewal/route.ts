/**
 * Renewal date for 24-hour reminder. Uses protection_renewal_at when set (from Stripe), else trial end.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("protection_renewal_at, created_at")
    .eq("id", workspaceId)
    .single();

  const row = ws as { protection_renewal_at?: string | null; created_at?: string } | undefined;
  let renewal_at: string | null = null;

  if (row?.protection_renewal_at) {
    renewal_at = row.protection_renewal_at;
  } else if (row?.created_at) {
    const trialEnd = new Date(row.created_at);
    trialEnd.setDate(trialEnd.getDate() + 14);
    renewal_at = trialEnd.toISOString();
  }

  return NextResponse.json({ renewal_at });
}
