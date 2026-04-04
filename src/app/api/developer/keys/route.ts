/**
 * GET /api/developer/keys — List API keys for the current workspace.
 * POST /api/developer/keys — Create a new API key (returns full key once, stores hash only).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const ALLOWED_PERMISSIONS = ["read", "read_write", "admin"] as const;

function hashKey(key: string): string {
  // SHA-256 hash for storage — never store the raw key
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  return createHash("sha256").update(data).digest("hex");
}

function generateApiKey(): string {
  const buf = randomBytes(24);
  return `sk_live_${buf.toString("hex")}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows, error } = await db
    .from("developer_api_keys")
    .select("id, workspace_id, label, key_prefix, key_suffix, permission, status, created_at, last_used_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    log("error", "developer.keys.list_error", { error: error.message });
    return NextResponse.json({ error: "Failed to load API keys" }, { status: 500 });
  }

  return NextResponse.json(rows ?? []);
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 5 key creates per minute per workspace
  const rl = await checkRateLimit(`dev_keys_create:${session.workspaceId}`, 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body: { label?: string; permission?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > 100) {
    return NextResponse.json({ error: "Label is required (max 100 chars)" }, { status: 400 });
  }

  const permission = body.permission as string;
  if (!ALLOWED_PERMISSIONS.includes(permission as typeof ALLOWED_PERMISSIONS[number])) {
    return NextResponse.json({ error: "Invalid permission level" }, { status: 400 });
  }

  // Limit total keys per workspace
  const db = getDb();
  const { count } = await db
    .from("developer_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", session.workspaceId)
    .eq("status", "active");

  if ((count ?? 0) >= 25) {
    return NextResponse.json({ error: "Maximum 25 active API keys per workspace" }, { status: 400 });
  }

  const fullKey = generateApiKey();
  const keyHash = hashKey(fullKey);
  const keyPrefix = fullKey.slice(0, 8); // "sk_live_"
  const keySuffix = fullKey.slice(-4);

  const { data: row, error } = await db
    .from("developer_api_keys")
    .insert({
      workspace_id: session.workspaceId,
      created_by: session.userId,
      label,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      key_suffix: keySuffix,
      permission,
      status: "active",
    })
    .select("id, label, key_prefix, key_suffix, permission, status, created_at, last_used_at")
    .single();

  if (error) {
    log("error", "developer.keys.create_error", { error: error.message });
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Return the full key exactly once — it will never be retrievable again
  return NextResponse.json({
    ...row,
    full_key: fullKey,
  }, { status: 201 });
}
