/**
 * POST /api/agents/test-call/me — Trigger a test call using the workspace's default agent.
 * Resolves the caller's workspace, finds their primary agent, and delegates
 * to /api/agents/[id]/test-call with the user's verified phone number.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { isSessionEnabled } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const db = getDb();

  /* ── Auth ─────────────────────────────────────────────── */
  let userId: string | null = null;
  if (isSessionEnabled()) {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.userId;
  }

  /* ── Rate-limit (3 test calls per minute per user) ───── */
  const rlKey = userId ? `test-call-me:${userId}` : "test-call-me:anon";
  const rl = await checkRateLimit(rlKey, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000))) } },
    );
  }

  /* ── Resolve workspace ───────────────────────────────── */
  let workspaceId: string | null = null;
  if (userId) {
    const { data: ws } = await db
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    workspaceId = ws?.id ?? null;
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  /* ── Find primary agent ──────────────────────────────── */
  const { data: agent } = await db
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!agent) {
    return NextResponse.json(
      { ok: false, error: "Create an agent first, then try the test call." },
      { status: 400 },
    );
  }

  /* ── Resolve user's phone number ─────────────────────── */
  const { data: profile } = await db
    .from("profiles")
    .select("phone")
    .eq("id", userId!)
    .maybeSingle();

  const phone = (profile as { phone?: string } | null)?.phone?.trim();
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { ok: false, error: "Add a phone number in Settings before making a test call." },
      { status: 400 },
    );
  }

  /* ── Delegate to the agent-specific test-call endpoint ── */
  const agentId = (agent as { id: string }).id;
  const origin = req.nextUrl.origin;
  try {
    const delegated = await fetch(`${origin}/api/agents/${agentId}/test-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ phone_number: phone }),
    });
    const data = await delegated.json().catch(() => ({}));
    return NextResponse.json(data, { status: delegated.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not initiate test call. Please try again." },
      { status: 500 },
    );
  }
}
