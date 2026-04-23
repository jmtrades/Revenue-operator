/**
 * Phase 12e — Unified call-ingestion API.
 *
 * POST /api/calls/ingest
 *
 * Accepts a ManualUploadInput payload (the shape our generic adapter
 * normalises) and runs the full Phase 12c intelligence stack, persisting
 * both the raw normalized transcript and the intelligence result under
 * the caller's workspace.
 *
 * This is the endpoint CRMs, webhooks, and the operator-dashboard "upload
 * a call" action all hit. Source-specific adapters (HubSpot, Zoom, Gong…)
 * are pure-function transforms that happen upstream of this route.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  normalizeManualUpload,
  type ManualUploadInput,
} from "@/lib/calls/ingest/adapters/manual-upload";
import { runIngestion } from "@/lib/calls/ingest/persist";
import { createSupabaseIngestionWriter } from "@/lib/calls/ingest/persist-supabase";

export const dynamic = "force-dynamic";

interface IngestRequestBody extends Omit<ManualUploadInput, "workspaceId"> {
  /** Ignored if a session is present; we always trust the session workspace. */
  workspaceId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: IngestRequestBody;
  try {
    body = (await req.json()) as IngestRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }
  if (typeof body.externalId !== "string" || !body.externalId.trim()) {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }
  if (typeof body.startedAtIso !== "string" || Number.isNaN(Date.parse(body.startedAtIso))) {
    return NextResponse.json({ error: "startedAtIso must be a valid ISO timestamp" }, { status: 400 });
  }
  if (!Array.isArray(body.turns) && typeof body.rawText !== "string") {
    return NextResponse.json(
      { error: "either 'turns' (array) or 'rawText' (string) is required" },
      { status: 400 },
    );
  }

  const transcript = normalizeManualUpload({
    ...body,
    workspaceId: session.workspaceId,
  });

  try {
    const result = await runIngestion(transcript, {
      writer: createSupabaseIngestionWriter(),
    });
    return NextResponse.json(
      {
        ingestionId: result.ingestionId,
        intelligenceId: result.intelligenceId,
        summary: result.analysis.oneLineSummary,
        nextActions: result.analysis.nextActions,
        risks: result.analysis.risks,
        commitments: result.analysis.commitments,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: "Ingestion failed", detail: message }, { status: 500 });
  }
}
