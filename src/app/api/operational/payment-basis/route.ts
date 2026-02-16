/**
 * GET /api/operational/payment-basis?workspace_id=...
 * Returns { basis: string[] } from last 7 days proof capsule lines only. Max 8 lines. No numbers.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LINES = 8;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const db = getDb();
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString().slice(0, 10);
  const { data: rows } = await db
    .from("proof_capsules")
    .select("lines")
    .eq("workspace_id", workspaceId)
    .gte("period_end", since)
    .order("period_end", { ascending: false });

  const allLines: string[] = [];
  for (const row of rows ?? []) {
    const lines = (row as { lines?: string[] }).lines;
    if (Array.isArray(lines)) allLines.push(...lines);
  }
  const basis = [...new Set(allLines)].slice(0, MAX_LINES);
  return NextResponse.json({ basis });
}
