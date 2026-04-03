/**
 * Voice Configuration API
 * GET: Get workspace voice configuration
 * PUT: Update workspace voice config
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

const voiceConfigSchema = z.object({
  active_voice_id: z.string().max(100).nullable().optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
  stability: z.number().min(0).max(1).optional(),
  warmth: z.number().min(0).max(1).optional(),
  industry_preset: z.string().max(50).nullable().optional(),
}).strict();

interface VoiceConfig {
  active_voice_id?: string | null;
  speed?: number;
  stability?: number;
  warmth?: number;
  industry_preset?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    const { data: settings, error } = await db
      .from("settings")
      .select("id, channel_rules")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      log("error", "voice.config.GET", { error: String(error) });
      return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
    }

    // Extract voice config from channel_rules or return defaults
    let voiceConfig: VoiceConfig = {
      active_voice_id: null,
      speed: 1.0,
      stability: 0.5,
      warmth: 0.5,
      industry_preset: null,
    };

    if (settings?.channel_rules && typeof settings.channel_rules === "object") {
      const channelRules = settings.channel_rules as Record<string, unknown>;
      if (channelRules.voice_config && typeof channelRules.voice_config === "object") {
        voiceConfig = { ...voiceConfig, ...(channelRules.voice_config as VoiceConfig) };
      }
    }

    return NextResponse.json({ config: voiceConfig });
  } catch (error) {
    log("error", "voice.config.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = voiceConfigSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
    }
    const { active_voice_id, speed, stability, warmth, industry_preset } = parsed.data;

    const db = getDb();

    // First, get existing settings
    const { data: settings, error: fetchError } = await db
      .from("settings")
      .select("channel_rules")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (fetchError) {
      log("error", "voice.config.PUT", { error: String(fetchError) });
      return NextResponse.json({ error: "Failed to fetch current config" }, { status: 500 });
    }

    // Build new voice config
    const newVoiceConfig: VoiceConfig = {
      active_voice_id: active_voice_id !== undefined ? active_voice_id : null,
      speed: speed !== undefined ? speed : 1.0,
      stability: stability !== undefined ? stability : 0.5,
      warmth: warmth !== undefined ? warmth : 0.5,
      industry_preset: industry_preset !== undefined ? industry_preset : null,
    };

    // Merge with existing channel_rules
    const existingRules = (settings?.channel_rules as Record<string, unknown>) || {};
    const updatedRules = {
      ...existingRules,
      voice_config: newVoiceConfig,
    };

    // Update settings
    const { data: updatedSettings, error: updateError } = await db
      .from("settings")
      .update({ channel_rules: updatedRules, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .select("channel_rules")
      .maybeSingle();

    if (updateError) {
      log("error", "voice.config.PUT", { error: String(updateError) });
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
    if (!updatedSettings) {
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }

    // Extract voice config from response
    let responseConfig = newVoiceConfig;
    if (updatedSettings?.channel_rules && typeof updatedSettings.channel_rules === "object") {
      const channelRules = updatedSettings.channel_rules as Record<string, unknown>;
      if (channelRules.voice_config && typeof channelRules.voice_config === "object") {
        responseConfig = channelRules.voice_config as VoiceConfig;
      }
    }

    return NextResponse.json({ config: responseConfig });
  } catch (error) {
    log("error", "voice.config.PUT", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
