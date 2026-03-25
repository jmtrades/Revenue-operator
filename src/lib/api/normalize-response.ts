/**
 * Normalize API response: always { ok: boolean, reason?: string }, status 200.
 * Never includes stack, internal ids, or sensitive data.
 */

import { NextResponse } from "next/server";

export interface NormalizedPayload {
  ok: boolean;
  reason?: string;
  [key: string]: unknown;
}

const ALLOWED_KEYS = new Set([
  "ok",
  "reason",
  "link",
  "token",
  "workspace_id",
  "path",
  "external_ref",
  "record_path",
  "next_action",
  "label",
  "href",
  "intent",
  "exported_at",
  "last_cron_cycle_at",
  "workspaces",
  "governance_record",
  "job_name",
  "last_ran_at",
]);

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!ALLOWED_KEYS.has(k) && !k.startsWith("intent.")) continue;
    if (k === "reason" && typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v !== "object" || v === null || Array.isArray(v)) out[k] = v;
    else if (typeof v === "object" && !(v instanceof Error)) out[k] = sanitize(v as Record<string, unknown>);
  }
  return out;
}

/**
 * Returns NextResponse with status 200 and body { ok, reason? } (and other allowlisted keys).
 * Never includes stack, internal IDs, or error.stack.
 */
export function normalizeApiResponse(result: NormalizedPayload | Error): NextResponse {
  const payload: NormalizedPayload = { ok: false };
  if (result instanceof Error) {
    payload.reason = result.message?.slice(0, 200) ?? "error";
    return NextResponse.json(payload, { status: 200 });
  }
  payload.ok = Boolean(result.ok);
  if (typeof result.reason === "string") payload.reason = result.reason.slice(0, 200);
  const safe = sanitize(result as Record<string, unknown>);
  return NextResponse.json({ ...payload, ...safe }, { status: 200 });
}
