/**
 * Admin dashboard stats. Allowed only when session user email === ADMIN_EMAIL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function isAdmin(req: NextRequest): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const session = await getSession(req);
  if (!session?.userId) return false;
  try {
    const db = getDb();
    const { data } = await db.from("users").select("email").eq("id", session.userId).maybeSingle();
    const email = (data as { email?: string } | null)?.email ?? null;
    return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let signupsToday = 0;
  let signupsTotal = 0;
  let recentSignups: { name: string; business_name: string; email: string; plan?: string; created_at?: string }[] = [];
  try {
    const db = getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const { count: todayCount } = await db.from("signups").select("id", { count: "exact", head: true }).gte("created_at", todayIso);
    const { count: totalCount } = await db.from("signups").select("id", { count: "exact", head: true });
    signupsToday = todayCount ?? 0;
    signupsTotal = totalCount ?? 0;
    const { data: recent } = await db.from("signups").select("name, business_name, email, status, created_at").order("created_at", { ascending: false }).limit(10);
    recentSignups = (recent ?? []).map((r: { name?: string; business_name?: string; email?: string; status?: string; created_at?: string }) => ({
      name: r.name ?? "",
      business_name: r.business_name ?? "",
      email: r.email ?? "",
      plan: r.status ?? undefined,
      created_at: r.created_at,
    }));
  } catch {
    // signups table or getDb may not exist / be configured
  }

  // Voice server (best-effort)
  let voiceServerOk = false;
  let voiceServerLatencyMs: number | null = null;
  let voiceServerHealth: Record<string, unknown> | null = null;
  let voiceServerStatus: Record<string, unknown> | null = null;
  try {
    const voiceUrl = process.env.VOICE_SERVER_URL;
    if (voiceUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const start = Date.now();
      const resp = await fetch(`${voiceUrl}/health`, { method: "GET", signal: controller.signal, cache: "no-store" }).catch(() => null);
      clearTimeout(timeout);

      if (resp?.ok) {
        voiceServerOk = true;
        voiceServerLatencyMs = Date.now() - start;
        voiceServerHealth = (await resp.json().catch(() => null)) as Record<string, unknown> | null;

        const statusResp = await fetch(`${voiceUrl}/status`, { method: "GET", cache: "no-store" }).catch(() => null);
        if (statusResp?.ok) voiceServerStatus = (await statusResp.json().catch(() => null)) as Record<string, unknown> | null;
      }
    }
  } catch {
    voiceServerOk = false;
  }

  return NextResponse.json({
    signupsToday,
    signupsTotal,
    mrr: "$0",
    recentSignups,
    health: {
      voiceServer: voiceServerOk ? "Online" : "Offline",
      twilio: "—",
      supabase: "—",
      voiceServerDetails: {
        ok: voiceServerOk,
        latency_ms: voiceServerLatencyMs,
        // Voice server returns active sessions + voices via /status
        active_sessions: (voiceServerStatus?.active_conversations as number | undefined) ?? null,
        voices_available: (voiceServerStatus?.voices_available as number | undefined) ?? null,
        max_concurrent: (voiceServerStatus?.max_concurrent as number | undefined) ?? null,
        tts_engine: (voiceServerHealth?.tts_engine as string | undefined) ?? null,
        stt_engine: (voiceServerHealth?.stt_engine as string | undefined) ?? null,
      },
    },
    activeCalls: 0,
    callsToday: 0,
    textsToday: 0,
  });
}
