/**
 * GET /api/agent/voices — Return curated voices from the Recall voice library.
 * Voices are limited by billing tier.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { RECALL_VOICES } from "@/lib/constants/recall-voices";
import { normalizeTier, type PlanSlug } from "@/lib/billing-plans";

const PLAN_LIMITS: Record<PlanSlug, number> = {
  solo: 8,
  business: 12,
  scale: 16,
  enterprise: 41,
};

export async function GET(req: NextRequest) {
  let plan: PlanSlug = "solo";

  const session = await getSession(req);
  if (session?.workspaceId) {
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;
    try {
      const db = getDb();
      const { data } = await db
        .from("workspaces")
        .select("billing_tier")
        .eq("id", session.workspaceId)
        .maybeSingle();
      const rawTier = (data as { billing_tier?: string | null } | null)?.billing_tier;
      plan = normalizeTier(rawTier);
    } catch {
      plan = "solo";
    }
  }

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.solo;
  const voices = RECALL_VOICES.slice(0, limit).map((voice) => ({
    id: voice.id,
    name: voice.name,
    desc: voice.desc,
    description: voice.description,
    accent: voice.accent,
    gender: voice.gender,
    age: voice.age,
    tone: voice.tone,
    bestFor: voice.bestFor,
  }));

  return NextResponse.json({
    voices,
    plan,
  });
}
