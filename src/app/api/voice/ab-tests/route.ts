/**
 * GET /api/voice/ab-tests — List A/B tests for a workspace.
 * POST /api/voice/ab-tests — Create a new A/B test.
 * PATCH /api/voice/ab-tests — Update an A/B test (pause, resume, complete).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ tests: [] });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("voice_ab_tests")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    // Table might not exist yet — return empty gracefully
    return NextResponse.json({ tests: [] });
  }

  return NextResponse.json({ tests: data ?? [] });
}

const createTestSchema = z.object({
  name: z.string().min(1).max(255),
  voice_a: z.string().min(1).max(100),
  voice_b: z.string().min(1).max(100),
  traffic_split: z.number().min(0).max(1).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().nullable().optional(),
}).strict();

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }

  const authErrPost = await requireWorkspaceAccess(req, workspaceId);
  if (authErrPost) return authErrPost;

  // Rate limit: 10 A/B test creations per hour per workspace
  const rl = await checkRateLimit(`voice_ab_tests:create:${workspaceId}`, 10, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, voice_a, voice_b, traffic_split, start_date, end_date } = parsed.data;
  const db = getDb();

  const { data, error } = await db
    .from("voice_ab_tests")
    .insert({
      workspace_id: workspaceId,
      name,
      voice_a,
      voice_b,
      traffic_split: traffic_split ?? 0.5,
      status: "running",
      start_date: start_date ?? new Date().toISOString(),
      end_date: end_date ?? null,
    })
    .select()
    .single();

  if (error) {
    log("error", "Failed to create A/B test:", { error: error.message });
    return NextResponse.json({ error: "Failed to create test. The feature table may need to be initialized." }, { status: 500 });
  }

  return NextResponse.json({ test: data }, { status: 201 });
}

const updateTestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["running", "paused", "completed"]).optional(),
  winner: z.enum(["voice_a", "voice_b"]).nullable().optional(),
}).strict();

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, status, winner } = parsed.data;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (winner !== undefined) updates.winner = winner;

  const db = getDb();
  const { error } = await db
    .from("voice_ab_tests")
    .update(updates)
    .eq("id", id);

  if (error) {
    log("error", "Failed to update A/B test:", { error: error.message });
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
