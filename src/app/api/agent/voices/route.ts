/**
 * GET /api/agent/voices — Return a curated, production-safe voice list.
 * When ElevenLabs is configured, we verify the curated voices still exist upstream.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { CURATED_VOICES } from "@/lib/constants/curated-voices";

const PLAN_LIMITS: Record<string, number> = {
  starter: 8,
  growth: 12,
  scale: 12,
  enterprise: 12,
};

export async function GET(req: NextRequest) {
  let plan = "starter";

  try {
    const session = await getSession(req);
    if (session?.workspaceId) {
      const db = getDb();
      const { data } = await db
        .from("workspaces")
        .select("billing_tier")
        .eq("id", session.workspaceId)
        .maybeSingle();
      const tier = (data as { billing_tier?: string | null } | null)?.billing_tier?.trim().toLowerCase();
      if (tier && PLAN_LIMITS[tier]) {
        plan = tier;
      }
    }
  } catch {
    plan = "starter";
  }

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
  const curated = CURATED_VOICES.slice(0, limit);
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ voices: curated, plan });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ voices: curated, plan });
    }

    const data = (await res.json()) as {
      voices?: Array<{ voice_id?: string }>;
    };
    const upstreamIds = new Set(
      (data.voices ?? [])
        .map((voice) => voice.voice_id?.trim())
        .filter((value): value is string => Boolean(value)),
    );

    const verified = curated.filter((voice) => upstreamIds.has(voice.id));
    return NextResponse.json({
      voices: verified.length > 0 ? verified : curated,
      plan,
    });
  } catch {
    return NextResponse.json({ voices: curated, plan });
  }
}
