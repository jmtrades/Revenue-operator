/**
 * System health: dry-run pipeline (signal → decision → action). No real messages sent.
 * GET /api/system/health — returns full trace. Use for deployment readiness.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runPipelineHealthCheck } from "@/lib/system/health-check";

export async function GET() {
  const result = await runPipelineHealthCheck();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
