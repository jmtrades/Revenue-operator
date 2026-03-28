/**
 * GET  /api/workspace/compliance-settings — Load compliance policies for the workspace.
 * PATCH /api/workspace/compliance-settings — Save compliance policies.
 *
 * Stores consent mode, retention, PII redaction, auto-transcription, and consent announcement
 * in the workspace's metadata.compliance_policies JSON field.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/http/csrf";

const POLICIES_SCHEMA = z.object({
  consentMode: z.enum(["one-party", "two-party"]).default("two-party"),
  retentionDays: z.number().int().min(7).max(730).default(90),
  piiRedaction: z.boolean().default(true),
  autoTranscribe: z.boolean().default(true),
  consentAnnouncement: z
    .string()
    .max(500)
    .default("This call may be recorded for quality assurance and training purposes."),
});

type Policies = z.infer<typeof POLICIES_SCHEMA>;

const DEFAULT_POLICIES: Policies = {
  consentMode: "two-party",
  retentionDays: 90,
  piiRedaction: true,
  autoTranscribe: true,
  consentAnnouncement:
    "This call may be recorded for quality assurance and training purposes.",
};

export const dynamic = "force-dynamic";

/* ── GET ── */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = session.workspaceId;
  if (!workspaceId)
    return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("metadata")
    .eq("id", workspaceId)
    .maybeSingle();

  const meta = (ws as { metadata?: Record<string, unknown> } | null)?.metadata;
  const stored = (meta?.compliance_policies ?? {}) as Record<string, unknown>;

  // Merge stored values with defaults so response always has all fields
  const policies: Policies = { ...DEFAULT_POLICIES };
  try {
    const parsed = POLICIES_SCHEMA.parse(stored);
    Object.assign(policies, parsed);
  } catch {
    /* keep defaults */
  }

  return NextResponse.json(policies);
}

/* ── PATCH ── */
export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = session.workspaceId;
  if (!workspaceId)
    return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let policies: Policies;
  try {
    policies = POLICIES_SCHEMA.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const db = getDb();

  // Read existing metadata so we don't overwrite other fields
  const { data: ws } = await db
    .from("workspaces")
    .select("metadata")
    .eq("id", workspaceId)
    .maybeSingle();

  const existingMeta =
    ((ws as { metadata?: Record<string, unknown> } | null)?.metadata as Record<
      string,
      unknown
    >) ?? {};

  const { error } = await db
    .from("workspaces")
    .update({
      metadata: { ...existingMeta, compliance_policies: policies },
      // Also keep the legacy columns in sync for any code that reads them directly
      call_recording_enabled: policies.autoTranscribe,
      data_retention_days: policies.retentionDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    console.error("compliance-settings update error:", error.message);
    // Fallback: try without legacy columns in case they don't exist
    await db
      .from("workspaces")
      .update({
        metadata: { ...existingMeta, compliance_policies: policies },
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);
  }

  return NextResponse.json({ ok: true, policies });
}
