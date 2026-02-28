/**
 * GET /api/enterprise/message-templates?workspace_id=... — list message_templates.
 * POST — create (body: workspace_id, template_id, channel, intent_type, body, max_chars). Enforce caps and doctrine.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { containsForbiddenLanguage } from "@/lib/speech-governance/doctrine";

const CHANNEL_MAX: Record<string, number> = { sms: 320, email: 2000, whatsapp: 1000, voice: 120 };

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator", "auditor", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: rows } = await db
    .from("message_templates")
    .select("id, workspace_id, template_id, channel, intent_type, body, max_chars, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ ok: true, templates: rows ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });

  const workspaceId = body.workspace_id?.trim();
  const template_id = body.template_id?.trim();
  const channel = (body.channel?.trim() || "sms") as string;
  const intent_type = body.intent_type?.trim() || "follow_up";
  let bodyText = body.body ?? "";

  if (!workspaceId || !template_id) return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 200 });
  if (!["sms", "email", "whatsapp", "voice"].includes(channel)) return NextResponse.json({ ok: false, reason: "invalid_channel" }, { status: 200 });

  const maxChars = CHANNEL_MAX[channel] ?? 320;
  if (bodyText.length > maxChars) bodyText = bodyText.slice(0, maxChars).trim();
  if (containsForbiddenLanguage(bodyText)) return NextResponse.json({ ok: false, reason: "forbidden_language" }, { status: 200 });

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "compliance"]);
  if (authErr) return authErr;

  const db = getDb();
  const { data: inserted, error } = await db
    .from("message_templates")
    .insert({
      workspace_id: workspaceId,
      template_id,
      channel,
      intent_type,
      body: bodyText,
      max_chars: body.max_chars ?? maxChars,
    })
    .select("id, template_id, channel, intent_type, created_at")
    .single();

  if (error && (error as { code?: string }).code === "23505") return NextResponse.json({ ok: false, reason: "duplicate_template_id" }, { status: 200 });
  if (error || !inserted) return NextResponse.json({ ok: false, reason: "insert_failed" }, { status: 200 });
  return NextResponse.json({ ok: true, id: (inserted as { id: string }).id, template_id, channel, intent_type });
}
