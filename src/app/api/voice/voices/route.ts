/**
 * Voice Management API
 * GET: List voices for workspace (system + workspace custom voices)
 * POST: Create a cloned voice
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Get query param filters
    const gender = req.nextUrl.searchParams.get("gender");
    const accent = req.nextUrl.searchParams.get("accent");
    const tone = req.nextUrl.searchParams.get("tone");
    const industry = req.nextUrl.searchParams.get("industry");

    // Query system voices and workspace custom voices
    let query = db.from("voice_models").select("*");

    // Filter by workspace_id OR system voices (workspace_id IS NULL)
    query = query.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);

    // Apply optional filters
    if (gender) {
      query = query.eq("gender", gender);
    }
    if (accent) {
      query = query.eq("accent", accent);
    }
    if (tone) {
      query = query.eq("tone", tone);
    }
    if (industry) {
      // Industry is stored as an array, so we need to use contains
      query = query.contains("recommended_industries", [industry]);
    }

    const { data: voices, error } = await query.order("is_system", { ascending: false }).order("created_at", { ascending: false });

    if (error) {
      console.error("[API] voice voices GET error:", error);
      return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 });
    }

    return NextResponse.json({ voices: voices ?? [] });
  } catch (error) {
    console.error("[API] voice voices GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const { voice_name, voice_description, voice_id, gender, accent, tone, sample_prompt } = body;

    if (!voice_name || !voice_id || !gender || !accent || !tone) {
      return NextResponse.json(
        {
          error: "voice_name, voice_id, gender, accent, and tone are required",
        },
        { status: 400 }
      );
    }

    const db = getDb();

    // Create cloned voice record
    const { data: voice, error } = await db
      .from("voice_models")
      .insert([
        {
          workspace_id: workspaceId,
          voice_id,
          name: voice_name,
          gender,
          accent,
          tone,
          description: voice_description || null,
          sample_prompt: sample_prompt || null,
          is_cloned: true,
          is_system: false,
          status: "processing",
          model_config: {},
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.error("[API] voice voices POST error:", error);
      return NextResponse.json({ error: "Failed to create voice" }, { status: 500 });
    }
    if (!voice) {
      return NextResponse.json({ error: "Failed to create voice" }, { status: 500 });
    }

    return NextResponse.json({ voice }, { status: 201 });
  } catch (error) {
    console.error("[API] voice voices POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
