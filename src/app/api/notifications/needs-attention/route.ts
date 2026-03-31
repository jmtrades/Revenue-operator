/**
 * POST /api/notifications/needs-attention
 * Turns `needs_attention` items into in-app notification center entries.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { createUserNotification } from "@/lib/notifications";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

const BODY = z.object({
  needs_attention_id: z.string().min(1),
  title: z.string().min(1).optional(),
  reason: z.string().min(1),
  phone: z.string().min(6).optional(),
});

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { needs_attention_id, reason, title, phone } = parsed.data;

  // Avoid noisy notification storms during rapid dashboard refreshes.
  const rl = await checkRateLimit(`needs-attn:${workspaceId}:${needs_attention_id}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Rate limited" }, { status: 200 });
  }

  const db = getDb();
  try {
    // Best-effort dedup: look for an unread notification matching this needs-attention id.
    const { data: recent } = await db
      .from("notifications")
      .select("id, read, type, metadata")
      .eq("workspace_id", workspaceId)
      .eq("user_id", session.userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(30);

    const alreadyExists = (recent ?? []).some((n: { type?: string; metadata?: Record<string, unknown> | null }) => {
      if (n.type !== "quality_alert") return false;
      const mid = (n.metadata ?? {})?.["needs_attention_id"];
      return typeof mid === "string" && mid === needs_attention_id;
    });

    if (alreadyExists) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await createUserNotification(workspaceId, session.userId, {
      type: "quality_alert",
      title: title ?? "Needs attention",
      body: reason,
      metadata: {
        needs_attention_id,
        phone: phone ?? null,
        created_from: "needs-attention-queue",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "[notifications/needs-attention]", { error: msg });
    return NextResponse.json({ error: "Failed to create notification", details: msg }, { status: 500 });
  }
}

