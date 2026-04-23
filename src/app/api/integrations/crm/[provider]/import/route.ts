/**
 * POST /api/integrations/crm/[provider]/import
 *
 * Pull contacts FROM the connected CRM INTO Recall-Touch. This is the
 * "one-click backfill" that makes a freshly-connected integration useful:
 * the operator's existing pipeline shows up here immediately.
 *
 * Request body (optional):
 *   { mode?: "backfill" | "incremental", pageLimit?: number, maxPages?: number }
 *
 * - backfill: start from the beginning (ignore any stored cursor)
 * - incremental: resume from the stored cursor in connection metadata
 *
 * Supports all 17 CRM targets via src/lib/integrations/crm-pull.ts.
 * Cursor-resumable: persists `pull_cursor` per connection so a crash mid-import
 * can restart without re-ingesting every record.
 *
 * Rate-limited. CSRF-guarded. Workspace-scoped.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getValidTokens } from "@/lib/integrations/token-refresh";
import { pullContactsFromCrm } from "@/lib/integrations/crm-pull";
import { ingestPulledBatch } from "@/lib/integrations/crm-ingest";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/http/csrf";
// Phase 78 Task 9.3: import is supported for every CRM we ship. Source of
// truth: `SUPPORTED_CRM_PROVIDERS` from `@/lib/crm/providers`.
import { isSupportedCrmProvider } from "@/lib/crm/providers";

const isAllowed = isSupportedCrmProvider;

type Mode = "backfill" | "incremental";

interface ImportBody {
  mode?: Mode;
  pageLimit?: number;
  maxPages?: number;
}

const DEFAULT_PAGE_LIMIT = 100;
// Hard ceiling so a single request can't monopolize the serverless runtime.
// A backfill of millions of contacts spans many POSTs, each capped here.
const DEFAULT_MAX_PAGES = 10;
const MAX_PAGES_CEILING = 50;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const { provider } = await ctx.params;
  if (!isAllowed(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Rate limit: 6 imports per hour per workspace. Higher than the old 3/hour
  // because pagination makes each call smaller; users expect to keep tapping
  // "Pull more" until done.
  const rl = await checkRateLimit(`crm-import:${workspaceId}:${provider}`, 6, 3_600_000);
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Import rate limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Parse optional body — be tolerant of empty POSTs for "just pull more".
  let body: ImportBody = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw) as ImportBody;
  } catch {
    body = {};
  }
  const mode: Mode = body.mode === "backfill" ? "backfill" : "incremental";
  const pageLimit = Math.min(Math.max(body.pageLimit ?? DEFAULT_PAGE_LIMIT, 1), 500);
  const maxPages = Math.min(Math.max(body.maxPages ?? DEFAULT_MAX_PAGES, 1), MAX_PAGES_CEILING);

  // Get valid (possibly refreshed) OAuth tokens.
  let tokens;
  try {
    tokens = await getValidTokens(workspaceId, provider);
  } catch {
    return NextResponse.json(
      { error: `Not connected to ${provider}. Please connect first.` },
      { status: 400 },
    );
  }
  if (!tokens?.access_token) {
    return NextResponse.json(
      { error: `Not connected to ${provider}. Please connect first.` },
      { status: 400 },
    );
  }

  // Determine starting cursor. On "backfill" we start fresh; on "incremental"
  // we resume from the last stored cursor.
  const db = getDb();
  let cursor: string | null = null;
  if (mode === "incremental") {
    const { data } = await db
      .from("workspace_crm_connections")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .maybeSingle();
    const meta = (data as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {};
    const stored = typeof meta.pull_cursor === "string" ? meta.pull_cursor : null;
    cursor = stored;
  }

  const startedAt = Date.now();
  const agg = { imported: 0, updated: 0, skipped: 0, errors: 0, pages: 0 };
  let done = false;

  try {
    for (let page = 0; page < maxPages; page++) {
      const pull = await pullContactsFromCrm(provider, tokens, { cursor, limit: pageLimit });
      agg.pages++;

      if (pull.records.length > 0) {
        const result = await ingestPulledBatch(workspaceId, provider, pull.records);
        agg.imported += result.imported;
        agg.updated += result.updated;
        agg.skipped += result.skipped;
        agg.errors += result.errors;
      }

      cursor = pull.nextCursor;
      if (!cursor) {
        done = true;
        break;
      }

      // Soft wall-clock guard — Vercel serverless functions default to 10s
      // max duration on Hobby, 60s on Pro. Stop early so we always respond.
      if (Date.now() - startedAt > 25_000) break;
    }

    // Persist updated cursor (and clear when done so incremental restarts fresh).
    const { data: existing } = await db
      .from("workspace_crm_connections")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .maybeSingle();
    const prevMeta = (existing as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {};
    const nextMeta = {
      ...prevMeta,
      pull_cursor: done ? null : cursor,
      last_pull_at: new Date().toISOString(),
      last_pull_summary: { ...agg, done },
    };
    await db
      .from("workspace_crm_connections")
      .update({
        metadata: nextMeta,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);

    log("info", "crm_import.completed", {
      provider,
      workspaceId,
      mode,
      done,
      ...agg,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      done,
      mode,
      ...agg,
      nextCursor: done ? null : cursor,
      message: done
        ? `Import complete — ${agg.imported} new, ${agg.updated} updated from ${provider}.`
        : `Imported ${agg.imported + agg.updated} so far; more to pull. Tap import again to continue.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "crm_import.failed", { provider, workspaceId, error: msg });
    return NextResponse.json(
      { error: `Failed to import from ${provider}: ${msg.slice(0, 140)}` },
      { status: 502 },
    );
  }
}
