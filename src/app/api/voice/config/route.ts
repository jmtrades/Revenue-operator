/**
 * Voice Configuration API
 * GET: Get workspace voice configuration
 * PUT: Update workspace voice config
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface VoiceConfig {
  active_voice_id?: string | null;
  speed?: number;
  stability?: number;
  warmth?: number;
  industry_preset?: string | null;
  [key: string]: unknown;
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
      console.error("[API] voice config GET error:", error);
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
    console.error("[API] voice config GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const { active_voice_id, speed, stability, warmth, industry_preset, ...customFields } = body;

    const db = getDb();

    // First, get existing settings
    const { data: settings, error: fetchError } = await db
      .from("settings")
      .select("channel_rules")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (fetchError) {
      console.error("[API] voice config PUT error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch current config" }, { status: 500 });
    }

    // Build new voice config
    const newVoiceConfig: VoiceConfig = {
      active_voice_id: active_voice_id !== undefined ? active_voice_id : null,
      speed: speed !== undefined ? speed : 1.0,
      stability: stability !== undefined ? stability : 0.5,
      warmth: warmth !== undefined ? warmth : 0.5,
      industry_preset: industry_preset !== undefined ? industry_preset : null,
      ...customFields,
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
      .single();

    if (updateError) {
      console.error("[API] voice config PUT error:", updateError);
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
    console.error("[API] voice config PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
