/**
 * Voice Cloning CRUD API.
 * GET: List cloned voices for workspace.
 * POST: Create a new voice clone from audio sample.
 * DELETE: Remove a voice clone.
 *
 * Plan-gated: solo=0, business=3, scale=10, enterprise=unlimited
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { resolveBillingTier } from "@/lib/feature-gate/resolver";
import { VOICE_TIER_LIMITS } from "@/lib/voice/billing";
import { voiceRateLimiter } from "@/lib/voice/rate-limiter";
import { assertSameOrigin } from "@/lib/http/csrf";

/**
 * GET /api/voice/clones?workspace_id=...
 * Returns all voice clones for the workspace.
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("voice_models")
    .select("id, name, voice_id, is_cloned, status, created_at, metadata")
    .eq("workspace_id", workspaceId)
    .eq("is_cloned", true)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", "voice.clones.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Get plan limits
  const tier = await resolveBillingTier(workspaceId);
  const limits = VOICE_TIER_LIMITS[tier];

  return NextResponse.json({
    clones: data ?? [],
    limits: {
      used: (data ?? []).length,
      max: limits.voice_clones === -1 ? "unlimited" : limits.voice_clones,
      can_create: limits.voice_clones === -1 || (data ?? []).length < limits.voice_clones,
    },
  });
}

/**
 * POST /api/voice/clones
 * Create a voice clone from an audio sample.
 * Body: { workspace_id, name, description?, audio_url }
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = String(body.workspace_id ?? "").trim();
  const name = String(body.name ?? "").trim().slice(0, 255);
  const audioUrl = String(body.audio_url ?? "").trim().slice(0, 2048);
  const description = String(body.description ?? "").trim().slice(0, 1000);

  if (!workspaceId || !name || !audioUrl) {
    return NextResponse.json(
      { error: "workspace_id, name, and audio_url are required" },
      { status: 400 }
    );
  }

  // Validate audio_url is a proper URL
  try {
    const parsed = new URL(audioUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "audio_url must be an HTTP(S) URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid audio_url format" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  // Rate limit
  const rateCheck = voiceRateLimiter.checkCloneRequests(workspaceId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Voice clone rate limit exceeded. Max 5 per day." },
      { status: 429 }
    );
  }

  // Plan limit
  const tier = await resolveBillingTier(workspaceId);
  const limits = VOICE_TIER_LIMITS[tier];

  const db = getDb();
  const { count } = await db
    .from("voice_models")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_cloned", true);

  const currentCount = count ?? 0;
  if (limits.voice_clones !== -1 && currentCount >= limits.voice_clones) {
    return NextResponse.json(
      {
        error: `Voice clone limit reached (${currentCount}/${limits.voice_clones}). Upgrade your plan for more.`,
        upgrade_url: "/pricing",
      },
      { status: 403 }
    );
  }

  // Generate a unique voice_id for the clone
  const voiceId = `clone-${workspaceId.slice(0, 8)}-${Date.now()}`;

  // Insert into voice_models
  const { data: inserted, error: insertErr } = await db
    .from("voice_models")
    .insert({
      workspace_id: workspaceId,
      name,
      voice_id: voiceId,
      is_cloned: true,
      status: "processing",
      metadata: {
        description,
        audio_url: audioUrl,
        requested_at: new Date().toISOString(),
      },
    })
    .select("id, voice_id, name, status, created_at")
    .single();

  if (insertErr) {
    log("error", "voice.clones.POST", { error: String(insertErr) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // In production: queue voice cloning job to voice server
  // For now, mark as processing (actual cloning handled async by voice pipeline)
  log("info", "voice.clone-requested", { voice_id: voiceId, workspace_id: workspaceId });

  return NextResponse.json({
    clone: inserted,
    message: "Voice clone is processing. It will be available in a few minutes.",
  }, { status: 201 });
}

/**
 * DELETE /api/voice/clones?workspace_id=...&clone_id=...
 * Remove a voice clone.
 */
export async function DELETE(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  const cloneId = req.nextUrl.searchParams.get("clone_id")?.trim();

  if (!workspaceId || !cloneId) {
    return NextResponse.json({ error: "workspace_id and clone_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { error } = await db
    .from("voice_models")
    .delete()
    .eq("id", cloneId)
    .eq("workspace_id", workspaceId)
    .eq("is_cloned", true);

  if (error) {
    log("error", "voice.clones.DELETE", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Voice clone deleted." });
}
