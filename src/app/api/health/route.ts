/**
 * Health check for deployment.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  try {
    const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    checks.supabase = hasSupabase ? "configured" : "missing";
  } catch {
    checks.supabase = "error";
  }

  const healthy = checks.supabase !== "error";
  return NextResponse.json(checks, { status: healthy ? 200 : 503 });
}
